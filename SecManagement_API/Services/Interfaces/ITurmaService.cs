using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface ITurmaService
    {
        // --- GESTÃO DE TURMAS ---
        Task<IEnumerable<TurmaDto>> GetAllAsync();
        Task<TurmaDto?> GetByIdAsync(int id);
        Task<TurmaDto> CreateAsync(CreateTurmaDto dto);
        Task<bool> DeleteAsync(int id); // Apenas se não tiver inscrições/módulos

        // --- DISTRIBUIÇÃO ---
        Task<TurmaModuloDto> AddModuloAsync(CreateTurmaModuloDto dto);
        Task<bool> RemoveModuloAsync(int turmaModuloId);
        Task<IEnumerable<TurmaModuloDto>> GetModulosByTurmaAsync(int turmaId);

        // --- INSCRIÇÕES (Alunos) ---
        Task<InscricaoDto> InscreverAlunoAsync(CreateInscricaoDto dto);
        Task<bool> RemoverInscricaoAsync(int inscricaoId);
        Task<IEnumerable<InscricaoDto>> GetAlunosByTurmaAsync(int turmaId);
    }
}