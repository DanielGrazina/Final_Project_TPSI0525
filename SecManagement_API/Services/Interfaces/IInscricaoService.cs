using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IInscricaoService
    {
        Task<InscricaoDto> InscreverAlunoAsync(CreateInscricaoDto dto);
        Task<IEnumerable<InscricaoDto>> GetAlunosByTurmaAsync(int turmaId);
        Task<IEnumerable<InscricaoDto>> GetInscricoesByAlunoAsync(int formandoId);
        Task<bool> RemoverInscricaoAsync(int inscricaoId);
    }
}