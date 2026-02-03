using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IAvaliacaoService
    {
        Task<IEnumerable<AvaliacaoDto>> GetAllAsync();
        Task<AvaliacaoDto> LancarNotaAsync(CreateAvaliacaoDto dto, int userId, string role);
        Task<AvaliacaoDto> UpdateNotaAsync(int id, CreateAvaliacaoDto dto, int userId, string role);
        Task<IEnumerable<AvaliacaoDto>> GetNotasByTurmaAsync(int turmaId);
        Task<IEnumerable<AvaliacaoDto>> GetNotasByAlunoAsync(int formandoId);
        Task<bool> DeleteNotaAsync(int id, int userId, string role);
    }
}