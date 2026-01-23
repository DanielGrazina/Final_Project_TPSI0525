using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class UserService : IUserService
    {
        private readonly AppDbContext _context;

        public UserService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<UserDto>> GetAllAsync()
        {
            return await _context.Users
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Email = u.Email,
                    // Nome = u.Nome, // Só descomentar se User tiver Nome
                    Role = u.Role,
                    IsActive = u.IsActive,
                    // Verifica se o ID existe nas outras tabelas
                    IsFormador = _context.Formadores.Any(f => f.UserId == u.Id),
                    IsFormando = _context.Formandos.Any(f => f.UserId == u.Id)
                })
                .ToListAsync();
        }

        public async Task<UserDto?> GetByIdAsync(int id)
        {
            var u = await _context.Users.FindAsync(id);
            if (u == null) return null;

            return new UserDto
            {
                Id = u.Id,
                Email = u.Email,
                // Nome = u.Nome, 
                Role = u.Role,
                IsActive = u.IsActive,
                IsFormador = await _context.Formadores.AnyAsync(f => f.UserId == u.Id),
                IsFormando = await _context.Formandos.AnyAsync(f => f.UserId == u.Id)
            };
        }

        public async Task<bool> UpdateAsync(int id, UpdateUserDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;

            // Atualizamos apenas campos seguros e existentes
            // user.Nome = dto.Nome; 
            user.Role = dto.Role;
            user.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}