using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IInscricaoService
    {
        // Métodos originais
        Task<InscricaoDto> InscreverAlunoAsync(CreateCandidaturaDto dto);
        Task<InscricaoDto> AssociarTurmaAsync(int inscricaoId, int turmaId);
        Task<IEnumerable<InscricaoDto>> GetAlunosByTurmaAsync(int turmaId);
        Task<IEnumerable<InscricaoDto>> GetInscricoesByAlunoAsync(int formandoId);
        Task<bool> RemoverInscricaoAsync(int inscricaoId);

        // Novos métodos
        Task<IEnumerable<InscricaoDto>> GetCandidaturasPendentesAsync();
        Task<IEnumerable<InscricaoDto>> GetCandidaturasPendentesPorCursoAsync(int cursoId);
        Task<IEnumerable<InscricaoDto>> AprovarCandidaturasEmLoteAsync(AprovarLoteDto dto);
        Task<InscricaoDto> RejeitarCandidaturaAsync(int inscricaoId, string? motivo = null);
    }
}