using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Helpers;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CursosController : ControllerBase
    {
        private readonly IPedagogicoService _service;

        public CursosController(IPedagogicoService service)
        {
            _service = service;
        }

        [HttpGet]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<IEnumerable<CursoDto>>> GetCursos()
        {
            return Ok(await _service.GetCursosAsync());
        }

        [HttpGet("{id}")]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<CursoDto>> GetCurso(int id)
        {
            var curso = await _service.GetCursoByIdAsync(id);
            if (curso == null) return NotFound("Curso não encontrado.");
            return Ok(curso);
        }

        [HttpPost]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<CursoDto>> PostCurso(CreateCursoDto dto)
        {
            try
            {
                var novoCurso = await _service.CreateCursoAsync(dto);
                return CreatedAtAction(nameof(GetCurso), new { id = novoCurso.Id }, novoCurso);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<CursoDto>> PutCurso(int id, CreateCursoDto dto)
        {
            try
            {
                return Ok(await _service.UpdateCursoAsync(id, dto));
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<IActionResult> DeleteCurso(int id)
        {
            try
            {
                var sucesso = await _service.DeleteCursoAsync(id);
                if (!sucesso) return NotFound();
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}