using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ModulosController : ControllerBase
    {
        private readonly IModuloService _moduloService;

        public ModulosController(IModuloService moduloService)
        {
            _moduloService = moduloService;
        }

        // GET: api/Modulos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ModuloDto>>> GetModulos()
        {
            var modulos = await _moduloService.GetAllAsync();
            return Ok(modulos);
        }

        // GET: api/Modulos/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ModuloDto>> GetModulo(int id)
        {
            var modulo = await _moduloService.GetByIdAsync(id);

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
            var novoModulo = await _moduloService.CreateAsync(dto);

            // Return 201 Created and the cabeçalho Location header pointing to GetModule
            return CreatedAtAction(nameof(GetModulo), new { id = novoModulo.Id }, novoModulo);
        }

        // DELETE: api/Modulos/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteModulo(int id)
        {
            var sucesso = await _moduloService.DeleteAsync(id);

            if (!sucesso)
            {
                return NotFound("Módulo não encontrado ou não foi possível apagar.");
            }

            return NoContent();
        }

    }
}