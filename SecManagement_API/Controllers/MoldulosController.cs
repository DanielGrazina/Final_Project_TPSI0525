using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Helpers;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ModulosController : ControllerBase
    {
        private readonly IPedagogicoService _service;

        public ModulosController(IPedagogicoService service)
        {
            _service = service;
        }

        // GET: api/Modulos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ModuloDto>>> GetModulos()
        {
            return Ok(await _service.GetModulosAsync());
        }

        // GET: api/Modulos/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ModuloDto>> GetModulo(int id)
        {
            var modulo = await _service.GetModuloByIdAsync(id);
            if (modulo == null) return NotFound("Módulo não encontrado.");
            return Ok(modulo);
        }

        // POST: api/Modulos
        [HttpPost]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<ModuloDto>> PostModulo(CreateModuloDto dto)
        {
            var novoModulo = await _service.CreateModuloAsync(dto);
            return CreatedAtAction(nameof(GetModulo), new { id = novoModulo.Id }, novoModulo);
        }

        // PUT: api/Modulos/5
        [HttpPut("{id}")]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<ModuloDto>> PutModulo(int id, CreateModuloDto dto)
        {
            try
            {
                var moduloAtualizado = await _service.UpdateModuloAsync(id, dto);
                return Ok(moduloAtualizado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // DELETE: api/Modulos/5
        [HttpDelete("{id}")]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<IActionResult> DeleteModulo(int id)
        {
            try
            {
                var sucesso = await _service.DeleteModuloAsync(id);
                if (!sucesso) return NotFound();
                return NoContent();
            }
            catch (Exception ex)
            {
                // Retorna 400
                return BadRequest(ex.Message);
            }
        }
    }
}