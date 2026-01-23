using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ModuloController : ControllerBase
    {
        private readonly IModuloService _service;

        public ModuloController(IModuloService service)
        {
            _service = service;
        }

        // GET: api/Modulos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ModuloDto>>> GetModulos()
        {
            return Ok(await _service.GetAllAsync());
        }

        // GET: api/Modulos/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ModuloDto>> GetModulo(int id)
        {
            var modulo = await _service.GetByIdAsync(id);

            if (modulo == null)
            {
                return NotFound("Módulo não encontrado.");
            }

            return Ok(modulo);
        }

        // POST: api/Modulos
        [HttpPost]
        public async Task<ActionResult<ModuloDto>> PostModulo(CreateModuloDto dto)
        {
            var novoModulo = await _service.CreateAsync(dto);

            // Return "201 Created" and the header 'Location' pointing to GetModulo
            return CreatedAtAction(nameof(GetModulo), new { id = novoModulo.Id }, novoModulo);
        }

        // DELETE: api/Modulos/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteModulo(int id)
        {
            var sucesso = await _service.DeleteAsync(id);

            if (!sucesso)
            {
                return NotFound("Módulo não encontrado ou não foi possível apagar.");
            }

            return NoContent();
        }
    }
}