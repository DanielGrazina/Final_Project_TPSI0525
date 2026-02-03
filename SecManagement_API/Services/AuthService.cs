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
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                throw new Exception("Este email já está registado.");
            }

            string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            string activationToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(64));

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Criar User
                var user = new User
                {
                    Nome = dto.Nome,
                    Email = dto.Email,
                    PasswordHash = passwordHash,
                    Role = "User", // Assume formando no registo
                    IsActive = false,
                    ActivationToken = activationToken,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // 2. Criar Perfil de Formando Provisório (CAND-ID)
                var formando = new Formando
                {
                    UserId = user.Id,
                    NumeroAluno = $"CAND-{user.Id}",
                    DataNascimento = DateTime.UtcNow
                };

                _context.Formandos.Add(formando);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                // 3. Enviar Email (Simulado ou Real)
                // ... logica de email ...

                return "Registo efetuado! Pode agora candidatar-se aos cursos.";
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            // Incluir os perfis na consulta do Login
            var user = await _context.Users
                .Include(u => u.FormandoProfile) // Necessário para obter o ID
                .Include(u => u.FormadorProfile)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw new Exception("Credenciais inválidas.");

            if (!user.IsActive)
                throw new Exception("Conta inativa. Verifique o seu email.");

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
            var user = await _context.Users
                .Include(u => u.FormandoProfile)
                .Include(u => u.FormadorProfile)
                .FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                // No social login, criamos o User, mas o Formando é criado depois?
                // Idealmente devias repetir a lógica do Register aqui para criar o CAND-ID,
                // mas para simplificar vamos criar só o user e deixar o frontend tratar.
                user = new User
                {
                    Nome = nome,
                    Email = email,
                    IsActive = true,
                    Role = "User",
                    CreatedAt = DateTime.UtcNow
                };

                if (provider == "Google") user.GoogleId = providerKey;
                else if (provider == "Facebook") user.FacebookId = providerKey;

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                var formando = new Formando
                {
                    UserId = user.Id,
                    NumeroAluno = $"CAND-{user.Id}",
                    DataNascimento = DateTime.UtcNow
                };

                _context.Formandos.Add(formando);
                await _context.SaveChangesAsync();
            }
            else
            {
                if (provider == "Google") user.GoogleId = providerKey;
                else if (provider == "Facebook") user.FacebookId = providerKey;
                await _context.SaveChangesAsync();
            }

            string token = CreateToken(user);
            return new AuthResponseDto { Token = token, Message = "Login Social Efetuado" };
        }

        private string CreateToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Nome),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

            // Injetar os IDs específicos nas Claims
            // O frontend procura por "FormandoId"
            if (user.FormandoProfile != null)
            {
                claims.Add(new Claim("FormandoId", user.FormandoProfile.Id.ToString()));
                claims.Add(new Claim("IsFormando", "true"));
            }

            if (user.FormadorProfile != null)
            {
                claims.Add(new Claim("FormadorId", user.FormadorProfile.Id.ToString()));
                claims.Add(new Claim("IsFormador", "true"));
            }

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