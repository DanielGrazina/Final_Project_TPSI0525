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
            // 1. Verificar se o email já existe
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                throw new Exception("Este email já está registado.");
            }

            // 2. Criar o Hash da Password
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            string activationToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(64));

            // 3. Criar o Utilizador
            var user = new User
            {
                Nome = dto.Nome,
                Email = dto.Email,
                PasswordHash = passwordHash,
                Role = "Formando",
                IsActive = false, // Começa inativo
                ResetToken = activationToken, // Guardamos o token aqui
                ResetTokenExpiry = DateTime.UtcNow.AddHours(24),
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // 4. Enviar Email de Ativação
            string link = $"http://localhost:5173/activate?email={dto.Email}&token={activationToken}";

            try
            {
                string body = $@"
            <h1>Bem-vindo à ATEC!</h1>
            <p>Por favor confirma a tua conta clicando aqui:</p>
            <a href='{link}' style='padding:10px; background-color:blue; color:white;'>ATIVAR CONTA</a>";

                await _emailService.SendEmailAsync(dto.Email, "Ativar Conta", body);
            }
            catch { /* Log erro */ }

            return "Utilizador registado com sucesso! Verifique o email.";
        }

        public async Task<string> ActivateAccountAsync(string email, string token)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            // Verifica se o token bate certo
            if (user == null || user.ResetToken != token)
                throw new Exception("Token de ativação inválido.");

            user.IsActive = true;
            user.ResetToken = null; // Limpa o token
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

                // A janela de tempo permite ligeiros desvios de relógio
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

            user.ResetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(64));
            user.ResetTokenExpiry = DateTime.UtcNow.AddMinutes(30);
            await _context.SaveChangesAsync();

            // --- ENVIO REAL ---
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

        // --- LÓGICA ATIVAR 2FA (Requisito 1.e) ---
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

        private string CreateToken(User user)
        {
            // Definir as "Claims" (informações que vão dentro do token)
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Nome),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

            // Ler a chave do appsettings
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
            // Tenta encontrar o user pelo email
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                // SE NÃO EXISTE: Cria automaticamente (Sem password)
                user = new User
                {
                    Nome = nome,
                    Email = email,
                    IsActive = true, // Redes sociais já validam o email
                    Role = "Formando",
                    CreatedAt = DateTime.UtcNow
                };

                if (provider == "Google") user.GoogleId = providerKey;
                if (provider == "Facebook") user.FacebookId = providerKey;

                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }
            else
            {
                // SE JÁ EXISTE: Atualiza o ID da rede social
                if (provider == "Google") user.GoogleId = providerKey;
                if (provider == "Facebook") user.FacebookId = providerKey;
                await _context.SaveChangesAsync();
            }

            // Gera o Token JWT para ele entrar
            string token = CreateToken(user);
            return new AuthResponseDto { Token = token, Message = "Login Social Efetuado" };
        }
    }
}