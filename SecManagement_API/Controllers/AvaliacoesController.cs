using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;
using System.Security.Claims;

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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AvaliacaoDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpPost]
        public async Task<ActionResult<AvaliacaoDto>> LancarNota(CreateAvaliacaoDto dto)
        {
            try
            {
                // Obter dados do token
                int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                string role = User.FindFirst(ClaimTypes.Role)?.Value ?? "";

                var nota = await _service.LancarNotaAsync(dto, userId, role);
                return Ok(nota);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<AvaliacaoDto>> UpdateNota(int id, CreateAvaliacaoDto dto)
        {
            try
            {
                int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                string role = User.FindFirst(ClaimTypes.Role)?.Value ?? "";

                var nota = await _service.UpdateNotaAsync(id, dto, userId, role);
                return Ok(nota);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("turma/{turmaId}")]
        public async Task<ActionResult<IEnumerable<AvaliacaoDto>>> GetNotasTurma(int turmaId)
        {
            if (User.IsInRole("Formando"))
                return Forbid("Alunos não podem consultar pautas completas.");

            return Ok(await _service.GetNotasByTurmaAsync(turmaId));
        }

        [HttpGet("aluno/{formandoId}")]
        public async Task<ActionResult<IEnumerable<AvaliacaoDto>>> GetNotasAluno(int formandoId)
        {
            int meuFormandoId = int.Parse(User.FindFirst("FormandoId")?.Value ?? "0");
            if (User.IsInRole("Formando") && meuFormandoId != formandoId) return Forbid();

            return Ok(await _service.GetNotasByAlunoAsync(formandoId));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                string role = User.FindFirst(ClaimTypes.Role)?.Value ?? "";

                if (await _service.DeleteNotaAsync(id, userId, role)) return NoContent();
                return NotFound();
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}