using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AvaliacoesController : ControllerBase
    {
        private readonly IAvaliacaoService _service;

        public AvaliacoesController(IAvaliacaoService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<ActionResult<AvaliacaoDto>> LancarNota(CreateAvaliacaoDto dto)
        {
            try
            {
                var nota = await _service.LancarNotaAsync(dto);
                return Ok(nota);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("turma/{turmaId}")]
        public async Task<ActionResult<IEnumerable<AvaliacaoDto>>> GetNotasTurma(int turmaId)
        {
            return Ok(await _service.GetNotasByTurmaAsync(turmaId));
        }

        [HttpGet("aluno/{formandoId}")]
        public async Task<ActionResult<IEnumerable<AvaliacaoDto>>> GetNotasAluno(int formandoId)
        {
            return Ok(await _service.GetNotasByAlunoAsync(formandoId));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (await _service.DeleteNotaAsync(id)) return NoContent();
            return NotFound();
        }
    }
}