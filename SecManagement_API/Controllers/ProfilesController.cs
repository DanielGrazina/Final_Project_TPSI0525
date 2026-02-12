using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Helpers;
using SecManagement_API.Services.Interfaces;

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

        // -------------------------
        // ✅ PUBLIC FILE (AVATAR)
        // -------------------------
        // GET: api/Profiles/public-file/10
        // Serve APENAS imagens, sem auth (para <img src="...">)
        [HttpGet("public-file/{fileId}")]
        [AllowAnonymous]
        public async Task<IActionResult> PublicDownloadImage(int fileId)
        {
            var result = await _service.GetFileContentAsync(fileId);
            if (result == null) return NotFound("Ficheiro não encontrado.");

            // Segurança: só permite imagens neste endpoint público
            if (string.IsNullOrWhiteSpace(result.Value.ContentType) || !result.Value.ContentType.StartsWith("image/"))
                return NotFound("Ficheiro não disponível publicamente.");

            return File(result.Value.Bytes, result.Value.ContentType, result.Value.FileName);
        }

        // -------------------------
        // --- FORMADORES ---
        // -------------------------

        // GET: api/Profiles/formadores
        [HttpGet("formadores")]
        [Authorize] // Qualquer utilizador logado pode ver (ajusta Roles se quiseres)
        public async Task<ActionResult<IEnumerable<FormadorProfileDto>>> GetTodosFormadores()
        {
            try
            {
                var result = await _service.GetAllFormadoresAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Profiles/formador/5 (UserId)
        [HttpGet("formador/{userId}")]
        public async Task<ActionResult<FormadorProfileDto>> GetFormador(int userId)
        {
            try
            {
                return Ok(await _service.GetFormadorProfileAsync(userId));
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // POST: api/Profiles/formador
        [HttpPost("formador")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<FormadorProfileDto>> CreateFormador([FromBody] CreateFormadorProfileDto dto)
        {
            try
            {
                var res = await _service.CreateFormadorProfileAsync(dto);
                return Ok(res);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Profiles/formador/5/pdf
        [HttpGet("formador/{userId}/pdf")]
        public async Task<IActionResult> DownloadFormadorPdf(int userId)
        {
            try
            {
                var pdfBytes = await _pdfService.GenerateFormadorReportAsync(userId);
                return File(pdfBytes, "application/pdf", $"relatorio_formador_{userId}.pdf");
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // -------------------------
        // --- FORMANDOS ---
        // -------------------------

        // GET: api/Profiles/formandos
        [HttpGet("formandos")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin},{Roles.Formador}")]
        public async Task<ActionResult<IEnumerable<FormandoProfileDto>>> GetTodosFormandos()
        {
            try
            {
                var result = await _service.GetAllFormandosAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Profiles/formando/5 (UserId)
        [HttpGet("formando/{userId}")]
        public async Task<ActionResult<FormandoProfileDto>> GetFormando(int userId)
        {
            try
            {
                return Ok(await _service.GetFormandoProfileAsync(userId));
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // POST: api/Profiles/formando
        [HttpPost("formando")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<FormandoProfileDto>> CreateFormando([FromBody] CreateFormandoProfileDto dto)
        {
            try
            {
                var res = await _service.CreateFormandoProfileAsync(dto);
                return Ok(res);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Profiles/formando/5/pdf
        [HttpGet("formando/{userId}/pdf")]
        public async Task<IActionResult> DownloadFormandoPdf(int userId)
        {
            try
            {
                var pdfBytes = await _pdfService.GenerateFormandoReportAsync(userId);
                return File(pdfBytes, "application/pdf", $"relatorio_formando_{userId}.pdf");
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // -------------------------
        // --- FICHEIROS (AUTH) ---
        // -------------------------

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
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Profiles/file/10 (Download por ID) - com auth
        [HttpGet("file/{fileId}")]
        public async Task<IActionResult> DownloadFile(int fileId)
        {
            var result = await _service.GetFileContentAsync(fileId);
            if (result == null) return NotFound("Ficheiro não encontrado.");

            return File(result.Value.Bytes, result.Value.ContentType, result.Value.FileName);
        }

        // DELETE: api/Profiles/file/10
        [HttpDelete("file/{fileId}")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<IActionResult> DeleteFile(int fileId)
        {
            try
            {
                if (await _service.DeleteFileAsync(fileId)) return NoContent();
                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // -------------------------
        // --- SECRETARIA / ADMIN ---
        // -------------------------

        // PUT: api/Profiles/formando/5/numero
        [HttpPut("formando/{userId}/numero")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<FormandoProfileDto>> UpdateNumeroAluno(int userId, [FromBody] UpdateNumeroDto request)
        {
            try
            {
                var result = await _service.UpdateNumeroAlunoAsync(userId, request.NovoNumero);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/Profiles/user/5/dados
        [HttpPut("user/{userId}/dados")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<UserDto>> UpdateDadosPessoais(int userId, [FromBody] UpdateDadosPessoaisDto dto)
        {
            try
            {
                var result = await _service.UpdateDadosPessoaisAsync(userId, dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Profiles/user/5/avatar
        [HttpPost("user/{userId}/avatar")]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<IActionResult> UploadAvatar(int userId, [FromForm] UploadFicheiroDto dto)
        {
            try
            {
                var avatarUrl = await _service.UpdateAvatarAsync(userId, dto.Ficheiro);
                return Ok(new { avatarUrl });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
