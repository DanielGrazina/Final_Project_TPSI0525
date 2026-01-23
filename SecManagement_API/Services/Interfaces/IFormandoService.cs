using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IFormandoService
    {
        Task<IEnumerable<FormandoDto>> GetAllAsync();
        Task<FormandoDto?> GetByIdAsync(int id);

        Task<FormandoDto> CreateAsync(CreateFormandoDto dto);

        Task<bool> DeleteAsync(int id);

        Task<FileDownloadDto?> GetFotoAsync(int id);
        Task<FileDownloadDto?> GetDocumentoAsync(int id);
    }
}