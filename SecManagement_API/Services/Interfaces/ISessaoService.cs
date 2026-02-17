using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface ISessaoService
    {
        Task<SessaoDto> AgendarSessaoAsync(CreateSessaoDto dto);
        Task<IEnumerable<SessaoDto>> GetHorarioTurmaAsync(int turmaId, DateTime start, DateTime end);
        Task<IEnumerable<SessaoDto>> GetHorarioFormadorAsync(int formadorId, DateTime start, DateTime end);
        Task<IEnumerable<SessaoDto>> GetHorarioFormandoAsync(int formandoId, DateTime start, DateTime end);
        Task<IEnumerable<SessaoDto>> GetHorarioSalaAsync(int salaId, DateTime start, DateTime end);
        Task<List<FormadorDisponibilidadeDto>> CheckDisponibilidadeFormadoresAsync(int turmaId, DateTime start, DateTime end);
        Task<double> DeleteSessaoAsync(int id);
        Task<IEnumerable<SessaoDto>> GetSessoesByDateAsync(DateTime date); // Para ver ocupação de salas
    }
}