using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;
using System.Security.Claims;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProfilesController : ControllerBase
    {
        private readonly IProfileService _service;

        public ProfilesController(IProfileService service)
        {
            _service = service;
        }

        // --- FORMADORES ---

        // GET: api/Profiles/formador/5 (Passar o UserID)
        [HttpGet("formador/{userId}")]
        public async Task<ActionResult<FormadorProfileDto>> GetFormador(int userId)
        {
            try
            {
                return Ok(await _service.GetFormadorProfileAsync(userId));
            }
            catch (Exception ex) { return NotFound(ex.Message); }
        }

        // POST: api/Profiles/formador
        [HttpPost("formador")]
        public async Task<ActionResult<FormadorProfileDto>> CreateFormador(CreateFormadorProfileDto dto)
        {
            try
            {
                var res = await _service.CreateFormadorProfileAsync(dto);
                return Ok(res);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        // --- FORMANDOS ---

        // GET: api/Profiles/formando/5 (Passar o UserID)
        [HttpGet("formando/{userId}")]
        public async Task<ActionResult<FormandoProfileDto>> GetFormando(int userId)
        {
            try
            {
                return Ok(await _service.GetFormandoProfileAsync(userId));
            }
            catch (Exception ex) { return NotFound(ex.Message); }
        }

        // POST: api/Profiles/formando
        [HttpPost("formando")]
        public async Task<ActionResult<FormandoProfileDto>> CreateFormando(CreateFormandoProfileDto dto)
        {
            try
            {
                var res = await _service.CreateFormandoProfileAsync(dto);
                return Ok(res);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        // --- FICHEIROS ---

        // POST: api/Profiles/upload/5 (UserId)
        [HttpPost("upload/{userId}")]
        public async Task<ActionResult<UserFicheiroDto>> UploadFile(int userId, [FromForm] UploadFicheiroDto dto)
        {
            try
            {
                var res = await _service.UploadFileAsync(userId, dto.Ficheiro);
                return Ok(res);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        // GET: api/Profiles/file/10 (Download por ID do Ficheiro)
        [HttpGet("file/{fileId}")]
        public async Task<IActionResult> DownloadFile(int fileId)
        {
            var result = await _service.GetFileContentAsync(fileId);
            if (result == null) return NotFound("Ficheiro não encontrado.");

            // Retorna o ficheiro binário com o nome original
            return File(result.Value.Bytes, result.Value.ContentType, result.Value.FileName);
        }

        // DELETE: api/Profiles/file/10
        [HttpDelete("file/{fileId}")]
        public async Task<IActionResult> DeleteFile(int fileId)
        {
            if (await _service.DeleteFileAsync(fileId)) return NoContent();
            return NotFound();
        }
    }
}