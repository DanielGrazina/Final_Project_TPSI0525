using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CursoModulosController : ControllerBase
    {
        private readonly ICursoModuloService _service;

        public CursoModulosController(ICursoModuloService service)
        {
            _service = service;
        }

        // GET: api/CursoModulos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CursoModuloDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        // GET: api/CursoModulos/curso/5
        [HttpGet("curso/{cursoId}")]
        public async Task<ActionResult<IEnumerable<CursoModuloDto>>> GetByCurso(int cursoId)
        {
            return Ok(await _service.GetByCursoIdAsync(cursoId));
        }

        // GET: api/CursoModulos/5
        [HttpGet("{id}")]
        public async Task<ActionResult<CursoModuloDto>> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound("Distribuição não encontrada.");
            return Ok(result);
        }

        // POST: api/CursoModulos
        [HttpPost]
        public async Task<ActionResult<CursoModuloDto>> Create(CreateCursoModuloDto dto)
        {
            try
            {
                var created = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (Exception ex)
            {
                // Return 400 error if try to duplicate módulo
                return BadRequest(ex.Message);
            }
        }

        // DELETE: api/CursoModulos/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}