using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface ISalaService
    {
        Task<IEnumerable<SalaDto>> GetAllAsync();
        Task<SalaDto?> GetByIdAsync(int id);
        Task<SalaDto> CreateAsync(CreateSalaDto dto);
        Task<bool> UpdateAsync(int id, CreateSalaDto dto);
        Task<bool> DeleteAsync(int id);
    }
}