using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface ISessaoService
    {
        Task<SessaoDto> AgendarSessaoAsync(CreateSessaoDto dto);
        Task<IEnumerable<SessaoDto>> GetHorarioTurmaAsync(int turmaId, DateTime start, DateTime end);
        Task<IEnumerable<SessaoDto>> GetHorarioFormadorAsync(int formadorId, DateTime start, DateTime end);
        Task<bool> DeleteSessaoAsync(int id);
    }
}