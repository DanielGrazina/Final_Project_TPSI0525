using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Helpers;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DisponibilidadesController : ControllerBase
    {
        private readonly IDisponibilidadeService _service;

        public DisponibilidadesController(IDisponibilidadeService service)
        {
            _service = service;
        }

        [HttpPost]
        [Authorize(Roles = $"{Roles.Formador}")]
        public async Task<ActionResult<DisponibilidadeDto>> Create(CreateDisponibilidadeDto dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                return Ok(result);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("formador/{id}")]
        public async Task<ActionResult<IEnumerable<DisponibilidadeDto>>> GetByFormador(int id)
        {
            return Ok(await _service.GetByFormadorAsync(id));
        }

        [HttpGet("sala/{id}")]
        public async Task<ActionResult<IEnumerable<DisponibilidadeDto>>> GetBySala(int id)
        {
            return Ok(await _service.GetBySalaAsync(id));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (await _service.DeleteAsync(id)) return NoContent();
            return NotFound();
        }
    }
}