using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Helpers;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class InscricoesController : ControllerBase
    {
        private readonly IInscricaoService _service;

        public InscricoesController(IInscricaoService service)
        {
            _service = service;
        }

        // POST: api/Inscricoes/candidatar
        [HttpPost("candidatar")]
        [Authorize(Roles = $"{Roles.User},{Roles.Formando}")]
        public async Task<ActionResult<InscricaoDto>> Candidatar(CreateCandidaturaDto dto)
        {
            try
            {
                var result = await _service.InscreverAlunoAsync(dto);
                return Ok(result);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // PUT: api/Inscricoes/5/colocar-turma
        // Body: { "turmaId": 10 }
        [HttpPut("{id}/colocar-turma")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<InscricaoDto>> ColocarEmTurma(int id, [FromBody] ColocarEmTurmaDto dto)
        {
            try
            {
                var result = await _service.AssociarTurmaAsync(id, dto.TurmaId);
                return Ok(result);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // NOVO: GET: api/Inscricoes/pendentes
        // Lista todas as candidaturas sem turma (estado "Candidatura")
        [HttpGet("pendentes")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<IEnumerable<InscricaoDto>>> GetPendentes()
        {
            return Ok(await _service.GetCandidaturasPendentesAsync());
        }

        // NOVO: GET: api/Inscricoes/pendentes/curso/5
        // Lista candidaturas pendentes de um curso específico
        [HttpGet("pendentes/curso/{cursoId}")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<IEnumerable<InscricaoDto>>> GetPendentesPorCurso(int cursoId)
        {
            return Ok(await _service.GetCandidaturasPendentesPorCursoAsync(cursoId));
        }

        // NOVO: POST: api/Inscricoes/aprovar-lote
        // Aprova múltiplas candidaturas de uma vez, colocando-as na mesma turma
        // Body: { "turmaId": 10, "inscricaoIds": [1, 2, 3] }
        [HttpPost("aprovar-lote")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<IEnumerable<InscricaoDto>>> AprovarLote(AprovarLoteDto dto)
        {
            try
            {
                var result = await _service.AprovarCandidaturasEmLoteAsync(dto);
                return Ok(result);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // NOVO: PUT: api/Inscricoes/5/rejeitar
        // Rejeita uma candidatura
        [HttpPut("{id}/rejeitar")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<InscricaoDto>> Rejeitar(int id)
        {
            try
            {
                var result = await _service.RejeitarCandidaturaAsync(id);
                return Ok(result);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // GET: api/Inscricoes/turma/5
        // Usado pela Secretaria/Formador para ver quem está na turma
        [HttpGet("turma/{turmaId}")]
        public async Task<ActionResult<IEnumerable<InscricaoDto>>> GetPorTurma(int turmaId)
        {
            return Ok(await _service.GetAlunosByTurmaAsync(turmaId));
        }

        // GET: api/Inscricoes/aluno/10
        // Usado pelo Aluno para ver as suas candidaturas/inscrições
        [HttpGet("aluno/{formandoId}")]
        public async Task<ActionResult<IEnumerable<InscricaoDto>>> GetPorAluno(int formandoId)
        {
            return Ok(await _service.GetInscricoesByAlunoAsync(formandoId));
        }

        // DELETE: api/Inscricoes/5
        // Cancelar inscrição
        [HttpDelete("{id}")]
        public async Task<IActionResult> Remover(int id)
        {
            if (await _service.RemoverInscricaoAsync(id)) return NoContent();
            return NotFound();
        }
    }
}