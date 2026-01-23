using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IFormadorService
    {
        Task<IEnumerable<FormadorDto>> GetAllAsync();
        Task<FormadorDto?> GetByIdAsync(int id);

        Task<FormadorDto> CreateAsync(CreateFormadorDto dto);
        Task<bool> DeleteAsync(int id);

        Task<FileDownloadDto?> GetFotoAsync(int id);
        Task<FileDownloadDto?> GetCVAsync(int id);
    }
}