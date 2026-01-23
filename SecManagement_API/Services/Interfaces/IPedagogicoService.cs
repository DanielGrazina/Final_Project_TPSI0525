using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IPedagogicoService
    {
        // --- AREAS ---
        Task<IEnumerable<AreaDto>> GetAreasAsync();
        Task<AreaDto> CreateAreaAsync(CreateAreaDto dto);
        Task<AreaDto?> GetAreaByIdAsync(int id); // Útil para o Update
        Task<AreaDto> UpdateAreaAsync(int id, CreateAreaDto dto);
        Task<bool> DeleteAreaAsync(int id);

        // --- CURSOS ---
        Task<IEnumerable<CursoDto>> GetCursosAsync();
        Task<CursoDto?> GetCursoByIdAsync(int id);
        Task<CursoDto> CreateCursoAsync(CreateCursoDto dto);
        Task<CursoDto> UpdateCursoAsync(int id, CreateCursoDto dto);
        Task<bool> DeleteCursoAsync(int id);


        // --- MÓDULOS ---
        Task<IEnumerable<ModuloDto>> GetModulosAsync();
        Task<ModuloDto?> GetModuloByIdAsync(int id);
        Task<ModuloDto> CreateModuloAsync(CreateModuloDto dto);

        Task<ModuloDto> UpdateModuloAsync(int id, CreateModuloDto dto);
        Task<bool> DeleteModuloAsync(int id);
    }
}