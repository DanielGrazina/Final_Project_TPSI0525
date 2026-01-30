using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IInscricaoService
    {
        Task<InscricaoDto> InscreverAlunoAsync(CreateCandidaturaDto dto);
        Task<InscricaoDto> AssociarTurmaAsync(int inscricaoId, int turmaId);

        Task<bool> RemoverInscricaoAsync(int inscricaoId);
        Task<IEnumerable<InscricaoDto>> GetAlunosByTurmaAsync(int turmaId);
        Task<IEnumerable<InscricaoDto>> GetInscricoesByAlunoAsync(int formandoId);
    }
}