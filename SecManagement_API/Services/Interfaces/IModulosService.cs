using SecManagement_API.DTOs;
using SecManagement_API.Models;

namespace SecManagement_API.Services.Interfaces
{
    public interface IModuloService
    {
        Task<IEnumerable<ModuloDto>> GetAllAsync();
        Task<ModuloDto?> GetByIdAsync(int id);
        Task<Modulo> CreateAsync(CreateModuloDto dto);
        Task<bool> DeleteAsync(int id);
    }
}