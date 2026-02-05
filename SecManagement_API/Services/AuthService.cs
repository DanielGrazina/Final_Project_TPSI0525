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
                throw new Exception("Este email já está registado.");

            string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            string activationToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(64));

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var user = new User
                {
                    Nome = dto.Nome,
                    Email = dto.Email,
                    PasswordHash = passwordHash,
                    Role = "User",
                    IsActive = false,
                    ActivationToken = activationToken,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Perfil "Candidato" (Formando provisório)
                var formando = new Formando
                {
                    UserId = user.Id,
                    NumeroAluno = $"CAND-{user.Id}",
                    DataNascimento = DateTime.UtcNow
                };

                _context.Formandos.Add(formando);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                // Se quiseres email real, mete aqui (tu já tinhas isso noutra versão)
                // string link = $"http://localhost:5173/activate?email={dto.Email}&token={activationToken}";
                // await _emailService.SendEmailAsync(dto.Email, "Ativar Conta", $"Clica: {link}");

                return "Registo efetuado! Verifica o email para ativar (ou ativa via link).";
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await _context.Users
                .Include(u => u.FormandoProfile)
                .Include(u => u.FormadorProfile)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw new Exception("Credenciais inválidas.");

            if (!user.IsActive)
                throw new Exception("Conta inativa. Verifique o seu email.");

            // ✅ 2FA
            if (user.IsTwoFactorEnabled)
            {
                if (string.IsNullOrWhiteSpace(dto.TwoFactorCode))
                {
                    return new AuthResponseDto
                    {
                        RequiresTwoFactor = true,
                        Message = "Insira o código 2FA"
                    };
                }

                if (string.IsNullOrWhiteSpace(user.TwoFactorSecret))
                    throw new Exception("2FA ativo mas secret não configurado.");

                var totp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));
                if (!totp.VerifyTotp(dto.TwoFactorCode.Trim(), out long _))
                    throw new Exception("Código 2FA incorreto.");
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

            // Se usares email real:
            // string link = $"http://localhost:5173/reset-password?token={user.ResetToken}";
            // await _emailService.SendEmailAsync(email, "Recuperação de Password", $"Clica: {link}");

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

            // QR content
            return $"otpauth://totp/ATEC:{user.Email}?secret={secret}&issuer=ATEC_FinalProject";
        }

        // ✅ ALTERADO: suporta 2FA também no login social
        public async Task<AuthResponseDto> SocialLoginAsync(
            string email,
            string provider,
            string providerKey,
            string nome,
            string? twoFactorCode = null
        )
        {
            var user = await _context.Users
                .Include(u => u.FormandoProfile)
                .Include(u => u.FormadorProfile)
                .FirstOrDefaultAsync(u => u.Email == email);

            // ✅ Se existe e tem 2FA ligado: validar
            if (user != null && user.IsTwoFactorEnabled)
            {
                if (string.IsNullOrWhiteSpace(twoFactorCode))
                {
                    return new AuthResponseDto
                    {
                        RequiresTwoFactor = true,
                        Message = "Insira o código 2FA"
                    };
                }

                if (string.IsNullOrWhiteSpace(user.TwoFactorSecret))
                    throw new Exception("2FA ativo mas secret não configurado.");

                var totp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));
                if (!totp.VerifyTotp(twoFactorCode.Trim(), out long _))
                    throw new Exception("Código 2FA incorreto.");
            }

            if (user == null)
            {
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

                // Criar CAND- (Formando provisório)
                var formando = new Formando
                {
                    UserId = user.Id,
                    NumeroAluno = $"CAND-{user.Id}",
                    DataNascimento = DateTime.UtcNow
                };

                _context.Formandos.Add(formando);
                await _context.SaveChangesAsync();

                // ✅ Recarregar para ter os perfis e gerar token com claims certas
                user = await _context.Users
                    .Include(u => u.FormandoProfile)
                    .Include(u => u.FormadorProfile)
                    .FirstAsync(u => u.Id == user.Id);
            }
            else
            {
                // Associar provider key ao user existente
                if (provider == "Google") user.GoogleId = providerKey;
                else if (provider == "Facebook") user.FacebookId = providerKey;

                await _context.SaveChangesAsync();
            }

            string token = CreateToken(user);
            return new AuthResponseDto { Token = token, Message = "Login Social Efetuado" };
        }

        private string CreateToken(User user)
        {
            // garantir que trazemos perfis quando precisamos de claims (FormandoId / FormadorId)
            var userWithProfiles = _context.Users
                .Include(u => u.FormadorProfile)
                .Include(u => u.FormandoProfile)
                .FirstOrDefault(u => u.Id == user.Id);

            user = userWithProfiles ?? user;

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Nome ?? ""),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Role, user.Role ?? "User")
            };

            if (user.FormandoProfile != null)
            {
                claims.Add(new Claim("FormandoId", user.FormandoProfile.Id.ToString()));
                claims.Add(new Claim("IsFormando", "true"));
            }
            else
            {
                claims.Add(new Claim("IsFormando", "false"));
            }

            if (user.FormadorProfile != null)
            {
                claims.Add(new Claim("FormadorId", user.FormadorProfile.Id.ToString()));
                claims.Add(new Claim("IsFormador", "true"));
            }
            else
            {
                claims.Add(new Claim("IsFormador", "false"));
            }

            var tokenKey = _configuration.GetSection("AppSettings:Token").Value
                           ?? _configuration.GetSection("JwtSettings:Key").Value
                           ?? throw new Exception("JWT key não configurada em AppSettings:Token ou JwtSettings:Key.");

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
