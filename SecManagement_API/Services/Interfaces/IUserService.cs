using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IUserService
    {
        Task<IEnumerable<UserDto>> GetAllAsync();
        Task<UserDto?> GetByIdAsync(int id);
        Task<bool> UpdateAsync(int id, UpdateUserDto dto);
        Task<bool> DeleteAsync(int id);
    }
}