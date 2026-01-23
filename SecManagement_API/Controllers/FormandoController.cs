using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FormandoController : ControllerBase
    {
        private readonly IFormandoService _formandoService;

        public FormandoController(IFormandoService formandoService)
        {
            _formandoService = formandoService;
        }

        // GET: api/Formando
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FormandoDto>>> GetFormandos()
        {
            return Ok(await _formandoService.GetAllAsync());
        }

        // GET: api/Formando/5
        [HttpGet("{id}")]
        public async Task<ActionResult<FormandoDto>> GetFormando(int id)
        {
            var formando = await _formandoService.GetByIdAsync(id);
            if (formando == null) return NotFound("Formando não encontrado.");
            return Ok(formando);
        }

        // POST: api/Formando
        [HttpPost]
        public async Task<ActionResult<FormandoDto>> PostFormando([FromForm] CreateFormandoDto dto)
        {
            var novoFormando = await _formandoService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetFormando), new { id = novoFormando.Id }, novoFormando);
        }

        // POST: api/Formando/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFormando(int id)
        {
            var sucesso = await _formandoService.DeleteAsync(id);
            if (!sucesso) return NotFound();
            return NoContent();
        }

        // GET: api/Formandos/5/foto
        [HttpGet("{id}/foto")]
        public async Task<IActionResult> GetFoto(int id)
        {
            var fileDto = await _formandoService.GetFotoAsync(id);
            if (fileDto == null) return NotFound("Foto não encontrada.");

            // Return the file for the browser show it
            return File(fileDto.Content, fileDto.ContentType);
        }

        // GET: api/Formandos/5/documento
        [HttpGet("{id}/documento")]
        public async Task<IActionResult> GetDocumento(int id)
        {
            var fileDto = await _formandoService.GetDocumentoAsync(id);
            if (fileDto == null) return NotFound("Documento não encontrado.");

            // Force download with original name
            return File(fileDto.Content, fileDto.ContentType, fileDto.FileName);
        }
    }
}