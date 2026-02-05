using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Helpers;
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
        private readonly IPdfService _pdfService;

        public ProfilesController(IProfileService service, IPdfService pdfService)
        {
            _service = service;
            _pdfService = pdfService;
        }

        // --- FORMADORES ---

        // GET: api/Profiles/formador/5 (Passar o UserID)
        [HttpGet("formador/{userId}")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
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
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<FormadorProfileDto>> CreateFormador(CreateFormadorProfileDto dto)
        {
            try
            {
                var res = await _service.CreateFormadorProfileAsync(dto);
                return Ok(res);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        // GET: api/Profiles/formador/5/pdf
        [HttpGet("formador/{userId}/pdf")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<IActionResult> DownloadFormadorPdf(int userId)
        {
            try
            {
                var pdfBytes = await _pdfService.GenerateFormadorReportAsync(userId);
                return File(pdfBytes, "application/pdf", $"relatorio_formador_{userId}.pdf");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // --- FORMANDOS ---

        // GET: api/Profiles/formando/5 (Passar o UserID)
        [HttpGet("formando/{userId}")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
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
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<FormandoProfileDto>> CreateFormando(CreateFormandoProfileDto dto)
        {
            try
            {
                var res = await _service.CreateFormandoProfileAsync(dto);
                return Ok(res);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        // GET: api/Profiles/formando/5/pdf
        [HttpGet("formando/{userId}/pdf")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<IActionResult> DownloadFormandoPdf(int userId)
        {
            try
            {
                var pdfBytes = await _pdfService.GenerateFormandoReportAsync(userId);
                return File(pdfBytes, "application/pdf", $"relatorio_formando_{userId}.pdf");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // --- FICHEIROS ---

        // POST: api/Profiles/upload/5 (UserId)
        [HttpPost("upload/{userId}")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
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
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<IActionResult> DownloadFile(int fileId)
        {
            var result = await _service.GetFileContentAsync(fileId);
            if (result == null) return NotFound("Ficheiro não encontrado.");

            // Retorna o ficheiro binário com o nome original
            return File(result.Value.Bytes, result.Value.ContentType, result.Value.FileName);
        }

        // DELETE: api/Profiles/file/10
        [HttpDelete("file/{fileId}")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<IActionResult> DeleteFile(int fileId)
        {
            if (await _service.DeleteFileAsync(fileId)) return NoContent();
            return NotFound();
        }

        // --- SECRETARIA ---

        // PUT: api/Profiles/formando/5/numero
        // Body: { "novoNumero": "A2026001" }
        [HttpPut("formando/{userId}/numero")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<FormandoProfileDto>> UpdateNumeroAluno(int userId, [FromBody] UpdateNumeroDto request)
        {
            try
            {
                // Este método foi o que adicionámos ao ProfileService na resposta anterior
                var result = await _service.UpdateNumeroAlunoAsync(userId, request.NovoNumero);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}