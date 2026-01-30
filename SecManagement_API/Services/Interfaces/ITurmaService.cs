using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface ITurmaService
    {
        // --- GESTÃO DE TURMAS ---
        Task<IEnumerable<TurmaDto>> GetAllAsync();
        Task<TurmaDto?> GetByIdAsync(int id);
        Task<TurmaDto> CreateAsync(CreateTurmaDto dto);
        Task<bool> DeleteAsync(int id);

        // --- DISTRIBUIÇÃO (Módulos/Formadores) ---
        Task<TurmaModuloDto> AddModuloAsync(CreateTurmaModuloDto dto);
        Task<bool> RemoveModuloAsync(int turmaModuloId);
        Task<IEnumerable<TurmaModuloDto>> GetModulosByTurmaAsync(int turmaId);
    }
}