using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IDisponibilidadeService
    {
        Task<DisponibilidadeDto> CreateAsync(CreateDisponibilidadeDto dto);
        Task<IEnumerable<DisponibilidadeDto>> GetByFormadorAsync(int formadorId);
        Task<IEnumerable<DisponibilidadeDto>> GetBySalaAsync(int salaId);
        Task<bool> DeleteAsync(int id);
    }
}