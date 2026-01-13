using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OtpNet; // Importante para o 2FA
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography; // Para o Token de Reset
using System.Text;

namespace SecManagement_API.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // ... (O teu método RegisterAsync mantém-se igual) ...
        public async Task<string> RegisterAsync(RegisterDto dto)
        {
            // (Cola aqui o teu código de registo que já tinhas)
            // ...
            // return "Registado...";
            throw new NotImplementedException("Usa o código que já tinhas aqui");
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null) throw new Exception("Credenciais inválidas.");

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw new Exception("Credenciais inválidas.");

            if (!user.IsActive) throw new Exception("Conta inativa.");

            // --- LÓGICA 2FA (Requisito 1.e) ---
            if (user.TwoFactorEnabled)
            {
                // Se o utilizador ainda não enviou o código
                if (string.IsNullOrEmpty(dto.TwoFactorCode))
                {
                    return new AuthResponseDto { RequiresTwoFactor = true, Message = "Insira o código 2FA" };
                }

                // Validar o código enviado
                var totp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));
                if (!totp.VerifyTotp(dto.TwoFactorCode, out long timeStepMatched))
                {
                    throw new Exception("Código 2FA incorreto.");
                }
            }

            // Se passou tudo, gera o token
            string token = CreateToken(user);
            return new AuthResponseDto { Token = token, Message = "Login com sucesso" };
        }

        // --- LÓGICA RECUPERAÇÃO PASSWORD (Requisito 1.d) ---
        public async Task<string> ForgotPasswordAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) throw new Exception("Email não encontrado.");

            // Gerar Token Aleatório Seguro
            user.ResetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(64));
            user.ResetTokenExpiry = DateTime.UtcNow.AddMinutes(30);

            await _context.SaveChangesAsync();

            // SIMULAÇÃO DE ENVIO DE EMAIL (Para Avaliação)
            string link = $"http://localhost:5173/reset-password?token={user.ResetToken}";
            Console.WriteLine($"\n==============================================");
            Console.WriteLine($"📧 EMAIL SIMULADO: Recuperação de Password");
            Console.WriteLine($"🔗 Link: {link}");
            Console.WriteLine($"==============================================\n");

            return "Link de recuperação enviado (ver consola).";
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

        // --- LÓGICA ATIVAR 2FA ---
        public async Task<string> EnableTwoFactorAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("User não encontrado.");

            // Gerar Segredo
            var key = KeyGeneration.GenerateRandomKey(20);
            var secret = Base32Encoding.ToString(key);

            user.TwoFactorSecret = secret;
            user.TwoFactorEnabled = true;
            await _context.SaveChangesAsync();

            // Retorna URL para QR Code (Compatível com Google Auth)
            return $"otpauth://totp/ATEC:{user.Email}?secret={secret}&issuer=ATEC_FinalProject";
        }

        // ... (O teu método CreateToken privado mantém-se aqui) ...
        private string CreateToken(User user)
        {
            // ... (Cola o teu código de gerar JWT aqui) ...
            throw new NotImplementedException("Usa o código que já tinhas aqui");
        }
    }
}