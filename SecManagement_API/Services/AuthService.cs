using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
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

            // Create Users
            var user = new User
            {
                Nome = dto.Nome,
                Email = dto.Email,
                PasswordHash = passwordHash,
                Role = "Formando",
                IsActive = false, // Start inative
                ResetToken = activationToken,
                ResetTokenExpiry = DateTime.UtcNow.AddHours(24),
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Send Activation Email
            string link = $"http://localhost:5173/activate?email={dto.Email}&token={activationToken}";

            try
            {
                string body = $@"
            <h1>Bem-vindo à ATEC!</h1>
            <p>Por favor confirma a tua conta clicando aqui:</p>
            <a href='{link}' style='padding:10px; background-color:blue; color:white;'>ATIVAR CONTA</a>";

                await _emailService.SendEmailAsync(dto.Email, "Ativar Conta", body);
            }
            catch { /* error log */ }

            return "Utilizador registado com sucesso! Verifique o email.";
        }

        public async Task<string> ActivateAccountAsync(string email, string token)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user == null || user.ResetToken != token)
                throw new Exception("Token de ativação inválido.");

            user.IsActive = true;
            user.ResetToken = null; // Clean token
            user.ResetTokenExpiry = null;

            await _context.SaveChangesAsync();
            return "Conta ativada com sucesso!";
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null) throw new Exception("Credenciais inválidas.");

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw new Exception("Credenciais inválidas.");

            if (!user.IsActive) throw new Exception("Conta inativa. Verifique o seu email.");

            // --- 2FA Logic ---
            if (user.TwoFactorEnabled)
            {
                // If the user has not yet submitted the code
                if (string.IsNullOrEmpty(dto.TwoFactorCode))
                {
                    return new AuthResponseDto { RequiresTwoFactor = true, Message = "Insira o código 2FA" };
                }

                // Validate the submitted code
                var totp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));

                if (!totp.VerifyTotp(dto.TwoFactorCode, out long timeStepMatched))
                {
                    throw new Exception("Código 2FA incorreto.");
                }
            }

            string token = CreateToken(user);
            return new AuthResponseDto { Token = token, Message = "Login com sucesso" };
        }

        // --- LOGIC PASSWORD RECOVERY ---
        public async Task<string> ForgotPasswordAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) throw new Exception("Email não encontrado.");

            user.ResetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(64));
            user.ResetTokenExpiry = DateTime.UtcNow.AddMinutes(30);
            await _context.SaveChangesAsync();

            string link = $"http://localhost:5173/reset-password?token={user.ResetToken}";

            string body = $@"
                <h1>Recuperação de Password</h1>
                <p>Olá {user.Nome},</p>
                <p>Pediste para recuperar a tua password. Clica no link abaixo:</p>
                <a href='{link}'>Recuperar Password</a>
                <p>Se não foste tu, ignora este email.</p>";

            await _emailService.SendEmailAsync(email, "Recuperação de Password - ATEC", body);

            return "Email de recuperação enviado com sucesso!";
        }

        public async Task<string> ResetPasswordAsync(ResetPasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.ResetToken == dto.Token);

            if (user == null || user.ResetTokenExpiry < DateTime.UtcNow)
                throw new Exception("Token inválido ou expirado.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.ResetToken = null;
            user.ResetTokenExpiry = null;

            await _context.SaveChangesAsync();
            return "Password alterada com sucesso.";
        }

        // --- LOGIC ACTIVATE 2FA ---
        public async Task<string> EnableTwoFactorAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("User não encontrado.");

            // Generate Key
            var key = KeyGeneration.GenerateRandomKey(20);
            var secret = Base32Encoding.ToString(key);

            user.TwoFactorSecret = secret;
            user.TwoFactorEnabled = true;
            await _context.SaveChangesAsync();

            // Returns URL to QR Code (Compatible with Google Auth)
            return $"otpauth://totp/ATEC:{user.Email}?secret={secret}&issuer=ATEC_FinalProject";
        }

        private string CreateToken(User user)
        {
            // Define the "Claims" (information that goes inside the token)
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Nome),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

            // Read the appsettings key
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _configuration.GetSection("JwtSettings:Key").Value!));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.Now.AddHours(4),
                signingCredentials: creds
            );

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);
            return jwt;
        }

        public async Task<AuthResponseDto> SocialLoginAsync(string email, string provider, string providerKey, string nome)
        {
            // Try to find the user by email
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                // IF IT DOES NOT EXIST: Create it automatically (No password required)
                user = new User
                {
                    Nome = nome,
                    Email = email,
                    IsActive = true, // Social media platforms validate email addresses
                    Role = "Formando",
                    CreatedAt = DateTime.UtcNow
                };

                if (provider == "Google") user.GoogleId = providerKey;

                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }
            else
            {
                // IF IT ALREADY EXISTS: Update the social network ID.
                if (provider == "Google") user.GoogleId = providerKey;
                await _context.SaveChangesAsync();
            }

            // Generate the JWT Token for him to log in.
            string token = CreateToken(user);
            return new AuthResponseDto { Token = token, Message = "Login Social Efetuado" };
        }
    }
}