using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // [Authorize] // Podes descomentar quando quiseres proteger tudo
    public class TurmasController : ControllerBase
    {
        private readonly ITurmaService _turmaService;

        public TurmasController(ITurmaService turmaService)
        {
            _turmaService = turmaService;
        }

        // --- GESTÃO DE TURMAS ---

        // GET: api/Turmas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TurmaDto>>> GetTurmas()
        {
            return Ok(await _turmaService.GetAllAsync());
        }

        // GET: api/Turmas/5
        [HttpGet("{id}")]
        public async Task<ActionResult<TurmaDto>> GetTurma(int id)
        {
            var turma = await _turmaService.GetByIdAsync(id);
            if (turma == null) return NotFound("Turma não encontrada.");
            return Ok(turma);
        }

        // POST: api/Turmas
        [HttpPost]
        // [Authorize(Roles = "Secretaria, Admin")]
        public async Task<ActionResult<TurmaDto>> CreateTurma(CreateTurmaDto dto)
        {
            try
            {
                var novaTurma = await _turmaService.CreateAsync(dto);
                return CreatedAtAction(nameof(GetTurma), new { id = novaTurma.Id }, novaTurma);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE: api/Turmas/5
        [HttpDelete("{id}")]
        // [Authorize(Roles = "Secretaria, Admin")]
        public async Task<IActionResult> DeleteTurma(int id)
        {
            try
            {
                if (await _turmaService.DeleteAsync(id)) return NoContent();
                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // --- GESTÃO DE MÓDULOS NA TURMA ---

        // POST: api/Turmas/modulo
        [HttpPost("modulo")]
        public async Task<ActionResult<TurmaModuloDto>> AddModulo(CreateTurmaModuloDto dto)
        {
            try
            {
                var result = await _turmaService.AddModuloAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE: api/Turmas/modulo/5
        [HttpDelete("modulo/{turmaModuloId}")]
        public async Task<IActionResult> RemoveModulo(int turmaModuloId)
        {
            if (await _turmaService.RemoveModuloAsync(turmaModuloId)) return NoContent();
            return NotFound();
        }

        // GET: api/Turmas/5/modulos
        [HttpGet("{turmaId}/modulos")]
        public async Task<ActionResult<IEnumerable<TurmaModuloDto>>> GetModulos(int turmaId)
        {
            return Ok(await _turmaService.GetModulosByTurmaAsync(turmaId));
        }
    }
}