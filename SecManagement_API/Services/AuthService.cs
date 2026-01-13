using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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

        public async Task<string> RegisterAsync(RegisterDto dto)
        {
            // Verificar se o email já existe
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                throw new Exception("Este email já está registado.");
            }

            // Criar o Hash da Password
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            // Criar o Utilizador
            var user = new User
            {
                Nome = dto.Nome,
                Email = dto.Email,
                PasswordHash = passwordHash,
                Role = "Formando", // Default role
                IsActive = true,  // Começa inativo até confirmar email
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return "Utilizador registado com sucesso! Verifique o email para ativar.";
        }

        public async Task<string> LoginAsync(LoginDto dto)
        {
            // Procurar Utilizador
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null)
            {
                throw new Exception("Email ou Password incorretos.");
            }

            //  Verificar Password (Hash)
            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                throw new Exception("Email ou Password incorretos.");
            }

            // Verificar se está Ativo 
            if (!user.IsActive)
            {
                throw new Exception("A conta ainda não foi ativada. Verifique o seu email.");
            }

            // Gerar o Token JWT
            return CreateToken(user);
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
                expires: DateTime.Now.AddHours(4), // O token dura 4 horas
                signingCredentials: creds
            );

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);
            return jwt;
        }
    }
}