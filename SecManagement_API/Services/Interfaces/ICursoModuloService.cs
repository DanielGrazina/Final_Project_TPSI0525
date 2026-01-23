using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface ICursoModuloService
    {
        Task<IEnumerable<CursoModuloDto>> GetAllAsync();
        Task<IEnumerable<CursoModuloDto>> GetByCursoIdAsync(int cursoId); // Important Filter
        Task<CursoModuloDto?> GetByIdAsync(int id);
        Task<CursoModuloDto> CreateAsync(CreateCursoModuloDto dto);
        Task<bool> DeleteAsync(int id);
    }
}