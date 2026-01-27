using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SessoesController : ControllerBase
    {
        private readonly ISessaoService _service;

        public SessoesController(ISessaoService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<ActionResult<SessaoDto>> Agendar(CreateSessaoDto dto)
        {
            try
            {
                var result = await _service.AgendarSessaoAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Sessoes/turma/5?start=2024-01-01&end=2024-01-07
        [HttpGet("turma/{turmaId}")]
        public async Task<ActionResult<IEnumerable<SessaoDto>>> GetHorarioTurma(int turmaId, DateTime start, DateTime end)
        {
            return Ok(await _service.GetHorarioTurmaAsync(turmaId, start, end));
        }

        // GET: api/Sessoes/formador/10?start=2024-01-01&end=2024-01-07
        [HttpGet("formador/{formadorId}")]
        public async Task<ActionResult<IEnumerable<SessaoDto>>> GetHorarioFormador(int formadorId, DateTime start, DateTime end)
        {
            return Ok(await _service.GetHorarioFormadorAsync(formadorId, start, end));
        }

        [HttpGet("sala/{salaId}")]
        public async Task<ActionResult<IEnumerable<SessaoDto>>> GetHorarioSala(int salaId, DateTime start, DateTime end)
        {
            try
            {
                return Ok(await _service.GetHorarioSalaAsync(salaId, start, end));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (await _service.DeleteSessaoAsync(id)) return NoContent();
            return NotFound();
        }
    }
}