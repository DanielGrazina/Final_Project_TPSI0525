using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IPedagogicoService
    {
        // --- AREAS ---
        Task<IEnumerable<AreaDto>> GetAreasAsync();
        Task<AreaDto> CreateAreaAsync(CreateAreaDto dto);

        // --- CURSOS ---
        Task<IEnumerable<CursoDto>> GetCursosAsync();
        Task<CursoDto?> GetCursoByIdAsync(int id);
        Task<CursoDto> CreateCursoAsync(CreateCursoDto dto);
        Task<bool> DeleteCursoAsync(int id);

        // --- MÓDULOS ---
        Task<IEnumerable<ModuloDto>> GetModulosAsync();
        Task<ModuloDto> CreateModuloAsync(CreateModuloDto dto);
    }
}