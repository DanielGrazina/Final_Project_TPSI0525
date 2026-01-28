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
            var users = await _context.Users
            .Include(u => u.FormadorProfile)
            .Include(u => u.FormandoProfile)
            .AsNoTracking()
            .ToListAsync();

            return users.Select(u => MapToDto(u));
        }

        public async Task<UserDto?> GetByIdAsync(int id)
        {
            var u = await _context.Users
            .Include(user => user.FormadorProfile)
            .Include(user => user.FormandoProfile)
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.Id == id);

            if (u == null) return null;

            return MapToDto(u);
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

        private static UserDto MapToDto(SecManagement_API.Models.User u)
        {
            bool isFormador = u.Role == "Formador" || u.FormadorProfile != null;
            bool isFormando = u.Role == "Formando" || u.FormandoProfile != null;

            return new UserDto
            {
                Id = u.Id,
                Email = u.Email,
                Role = u.Role, // "Formador", "Formando", "Secretaria"
                IsActive = u.IsActive,
                IsFormador = isFormador,
                IsFormando = isFormando
            };
        }
    }
}