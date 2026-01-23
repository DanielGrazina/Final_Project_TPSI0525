using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FormadorController : ControllerBase
    {
        private readonly IFormadorService _formadorService;

        public FormadorController(IFormadorService formadorService)
        {
            _formadorService = formadorService;
        }

        // GET: api/Formador
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FormadorDto>>> GetFormadores()
        {
            return Ok(await _formadorService.GetAllAsync());
        }

        //GET: api/Formador/5
        [HttpGet("{id}")]
        public async Task<ActionResult<FormadorDto>> GetFormador(int id)
        {
            var formador = await _formadorService.GetByIdAsync(id);
            if (formador == null) return NotFound("Formador não encontrado.");
            return Ok(formador);
        }

        // POST: api/Formador
        [HttpPost]
        public async Task<ActionResult<FormadorDto>> PostFormador([FromForm] CreateFormadorDto dto)
        {
            var novoFormador = await _formadorService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetFormador), new { id = novoFormador.Id }, novoFormador);
        }

        // DELETE: api/Formador/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFormador(int id)
        {
            var sucesso = await _formadorService.DeleteAsync(id);
            if (!sucesso) return NotFound();
            return NoContent();
        }

        // GET: api/Formador/5/foto
        [HttpGet("{id}/foto")]
        public async Task<IActionResult> GetFoto(int id)
        {
            var file = await _formadorService.GetFotoAsync(id);
            if (file == null) return NotFound("Foto não encontrada.");
            return File(file.Content, file.ContentType);
        }

        // GET: api/Formador/5/cv
        [HttpGet("{id}/cv")]
        public async Task<IActionResult> GetCV(int id)
        {
            var file = await _formadorService.GetCVAsync(id);
            if (file == null) return NotFound("CV não encontrado.");

            // Force download with original name
            return File(file.Content, file.ContentType, file.FileName);
        }
    }
}