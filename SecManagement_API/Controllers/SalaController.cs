using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SalasController : ControllerBase
    {
        private readonly ISalaService _salaService;

        public SalasController(ISalaService salaService)
        {
            _salaService = salaService;
        }

        // GET: api/Salas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SalaDto>>> GetSalas()
        {
            return Ok(await _salaService.GetAllAsync());
        }

        // GET: api/Salas/5
        [HttpGet("{id}")]
        public async Task<ActionResult<SalaDto>> GetSala(int id)
        {
            var sala = await _salaService.GetByIdAsync(id);
            if (sala == null) return NotFound("Sala não encontrada.");
            return Ok(sala);
        }

        // POST: api/Salas
        [HttpPost]
        public async Task<ActionResult<SalaDto>> PostSala(CreateSalaDto dto)
        {
            var novaSala = await _salaService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetSala), new { id = novaSala.Id }, novaSala);
        }

        // PUT: api/Salas/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutSala(int id, CreateSalaDto dto)
        {
            var sucesso = await _salaService.UpdateAsync(id, dto);
            if (!sucesso) return NotFound();
            return NoContent();
        }

        // DELETE: api/Salas/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSala(int id)
        {
            var sucesso = await _salaService.DeleteAsync(id);
            if (!sucesso) return NotFound();
            return NoContent();
        }
    }
}