using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Helpers;
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
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Formador}")]
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
            start = DateTime.SpecifyKind(start, DateTimeKind.Utc);
            end = DateTime.SpecifyKind(end, DateTimeKind.Utc);

            return Ok(await _service.GetHorarioTurmaAsync(turmaId, start, end));
        }

        [HttpGet("formador/{formadorId}")]
        public async Task<ActionResult<IEnumerable<SessaoDto>>> GetHorarioFormador(int formadorId, DateTime start, DateTime end)
        {
            start = DateTime.SpecifyKind(start, DateTimeKind.Utc);
            end = DateTime.SpecifyKind(end, DateTimeKind.Utc);

            return Ok(await _service.GetHorarioFormadorAsync(formadorId, start, end));
        }

        [HttpGet("sala/{salaId}")]
        public async Task<ActionResult<IEnumerable<SessaoDto>>> GetHorarioSala(int salaId, DateTime start, DateTime end)
        {
            try
            {
                    start = DateTime.SpecifyKind(start, DateTimeKind.Utc);
                end = DateTime.SpecifyKind(end, DateTimeKind.Utc);

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
            double horasRestantes = await _service.DeleteSessaoAsync(id);
            if (horasRestantes == -1) return NotFound();

            return Ok(new { message = "Sessão apagada", horasRestantes = horasRestantes });
        }

        [HttpGet("check-availability/turma/{turmaId}")]
        public async Task<ActionResult<List<FormadorDisponibilidadeDto>>> CheckAvailability(int turmaId, DateTime start, DateTime end)
        {
            start = DateTime.SpecifyKind(start, DateTimeKind.Utc);
            end = DateTime.SpecifyKind(end, DateTimeKind.Utc);

            var result = await _service.CheckDisponibilidadeFormadoresAsync(turmaId, start, end);
            return Ok(result);
        }

        // GET: api/Sessoes/date/2026-02-15 (Ver ocupação salas)
        [HttpGet("date/{date}")]
        public async Task<ActionResult<IEnumerable<SessaoDto>>> GetSessoesByDate(DateTime date)
        {
            date = DateTime.SpecifyKind(date, DateTimeKind.Utc);
            return Ok(await _service.GetSessoesByDateAsync(date));
        }
    }
}