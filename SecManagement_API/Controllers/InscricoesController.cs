using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Obrigatório estar logado
    public class InscricoesController : ControllerBase
    {
        private readonly IInscricaoService _service;

        public InscricoesController(IInscricaoService service)
        {
            _service = service;
        }

        // POST: api/Inscricoes
        // Usado pelo Aluno para se candidatar (fica Pendente se for CAND-...)
        [HttpPost]
        public async Task<ActionResult<InscricaoDto>> Inscrever(CreateInscricaoDto dto)
        {
            try
            {
                var result = await _service.InscreverAlunoAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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