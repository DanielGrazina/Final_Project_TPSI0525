using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IAvaliacaoService
    {
        Task<IEnumerable<AvaliacaoDto>> GetAllAsync();
        Task<AvaliacaoDto> LancarNotaAsync(CreateAvaliacaoDto dto);
        Task<IEnumerable<AvaliacaoDto>> GetNotasByTurmaAsync(int turmaId);
        Task<IEnumerable<AvaliacaoDto>> GetNotasByAlunoAsync(int formandoId); // Usar ID do Formando, não UserID
        Task<bool> DeleteNotaAsync(int id);
    }
}