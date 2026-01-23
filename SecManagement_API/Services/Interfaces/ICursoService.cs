using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface ICursoService
    {
        Task<IEnumerable<CursoDto>> GetAllAsync();
        Task<CursoDto?> GetByIdAsync(int id);
        Task<CursoDto> CreateAsync(CreateCursoDto dto);
        Task<bool> UpdateAsync(int id, CreateCursoDto dto);
        Task<bool> DeleteAsync(int id);
    }
}