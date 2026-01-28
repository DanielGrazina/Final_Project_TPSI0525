using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using OtpNet;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace SecManagement_API.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        public AuthService(AppDbContext context, IConfiguration configuration, IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
        }

        public async Task<string> RegisterAsync(RegisterDto dto)
        {
            // 1. Validar duplicados
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                throw new Exception("Este email já está registado.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 2. Criar o User (Login)
                string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                string activationToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(64));

                var user = new User
                {
                    Nome = dto.Nome,
                    Email = dto.Email,
                    PasswordHash = passwordHash,
                    Role = "Formando", // Já entra com perfil de aluno/candidato
                    IsActive = false,
                    ActivationToken = activationToken,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync(); // Gera o User.Id

                //  Criar o Perfil de "Candidato" (Formando Provisório)
                var formando = new Formando
                {
                    UserId = user.Id,
                    NumeroAluno = $"CAND-{user.Id}",
                    DataNascimento = DateTime.UtcNow // Placeholder até ele preencher no perfil
                };

                _context.Formandos.Add(formando);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                // 5. Enviar Email (Fora da transação para não bloquear se falhar)
                string link = $"http://localhost:5173/activate?email={dto.Email}&token={activationToken}";
                try
                {
                    string body = $@"
                        <h1>Bem-vindo à ATEC!</h1>
                        <p>Por favor confirma a tua conta clicando aqui:</p>
                        <a href='{link}' style='padding:10px; background-color:blue; color:white; text-decoration:none;'>ATIVAR CONTA</a>";

                    await _emailService.SendEmailAsync(dto.Email, "Ativar Conta", body);
                }
                catch
                {
                    // Logar erro, mas não falhar o registo
                    Console.WriteLine($"[EMAIL ERROR] Falha ao enviar email para {dto.Email}. Link: {link}");
                }

                return "Utilizador registado com sucesso! Verifique o email para ativar.";
            }
            catch (Exception)
            {
                // Se algo falhar (ex: erro ao criar formando), desfaz a criação do User
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw new Exception("Credenciais inválidas.");

            if (!user.IsActive)
                throw new Exception("Conta inativa. Verifique o seu email.");

            // --- Lógica 2FA ---
            if (user.IsTwoFactorEnabled)
            {
                if (string.IsNullOrEmpty(dto.TwoFactorCode))
                {
                    return new AuthResponseDto { RequiresTwoFactor = true, Message = "Insira o código 2FA" };
                }

                var totp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));
                if (!totp.VerifyTotp(dto.TwoFactorCode, out long timeStepMatched))
                {
                    throw new Exception("Código 2FA incorreto.");
                }
            }

            string token = CreateToken(user);
            return new AuthResponseDto { Token = token, Message = "Login com sucesso" };
        }

        public async Task<string> ActivateAccountAsync(string email, string token)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user == null || user.ActivationToken != token)
                throw new Exception("Token de ativação inválido.");

            user.IsActive = true;
            user.ActivationToken = null;

            await _context.SaveChangesAsync();
            return "Conta ativada com sucesso!";
        }

        public async Task<string> ForgotPasswordAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) throw new Exception("Email não encontrado.");

            user.ResetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(64));
            user.ResetTokenExpires = DateTime.UtcNow.AddMinutes(30);

            await _context.SaveChangesAsync();

            string link = $"http://localhost:5173/reset-password?token={user.ResetToken}";
            try
            {
                string body = $@"<h1>Recuperação de Password</h1><p>Clica no link: <a href='{link}'>Recuperar</a></p>";
                await _emailService.SendEmailAsync(email, "Recuperação de Password - ATEC", body);
            }
            catch
            {
                Console.WriteLine($"[EMAIL ERROR] Link reset: {link}");
            }

            return "Email de recuperação enviado com sucesso!";
        }

        public async Task<string> ResetPasswordAsync(ResetPasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.ResetToken == dto.Token);

            if (user == null || user.ResetTokenExpires < DateTime.UtcNow)
                throw new Exception("Token inválido ou expirado.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.ResetToken = null;
            user.ResetTokenExpires = null;

            await _context.SaveChangesAsync();
            return "Password alterada com sucesso.";
        }

        public async Task<string> EnableTwoFactorAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("User não encontrado.");

            var key = KeyGeneration.GenerateRandomKey(20);
            var secret = Base32Encoding.ToString(key);

            user.TwoFactorSecret = secret;
            user.IsTwoFactorEnabled = true;

            await _context.SaveChangesAsync();
            return $"otpauth://totp/ATEC:{user.Email}?secret={secret}&issuer=ATEC_FinalProject";
        }

        public async Task<AuthResponseDto> SocialLoginAsync(string email, string provider, string providerKey, string nome)
        {

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                user = new User
                {
                    Nome = nome,
                    Email = email,
                    IsActive = true,
                    Role = "User",   // Cria como User genérico, pois não sabemos se é aluno ainda
                    CreatedAt = DateTime.UtcNow
                };

                if (provider == "Google") user.GoogleId = providerKey;
                else if (provider == "Facebook") user.FacebookId = providerKey;

                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }
            else
            {
                // Associar conta existente
                if (provider == "Google") user.GoogleId = providerKey;
                else if (provider == "Facebook") user.FacebookId = providerKey;
                await _context.SaveChangesAsync();
            }

            string token = CreateToken(user);
            return new AuthResponseDto { Token = token, Message = "Login Social Efetuado" };
        }

        private string CreateToken(User user)
        {
            // Precisamos recarregar para ter certeza que trazemos os perfis para as claims
            var userWithProfiles = _context.Users
               .Include(u => u.FormadorProfile)
               .Include(u => u.FormandoProfile)
               .FirstOrDefault(u => u.Id == user.Id);

            user = userWithProfiles ?? user;

            // Determinar flags booleanas baseadas na existência das tabelas, não apenas na string Role
            bool isFormador = user.FormadorProfile != null;
            bool isFormando = user.FormandoProfile != null;

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Nome),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("IsFormador", isFormador.ToString()),
                new Claim("IsFormando", isFormando.ToString())
            };

            var tokenKey = _configuration.GetSection("AppSettings:Token").Value
                           ?? _configuration.GetSection("JwtSettings:Key").Value!;

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(tokenKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.Now.AddHours(4),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}