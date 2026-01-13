using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;
using System.Security.Claims;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        // (Mantém o HttpPost Register igual)

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto request)
        {
            try
            {
                var result = await _authService.LoginAsync(request);

                // Se pedir 2FA, retorna 202 Accepted para o frontend saber que tem de mudar de ecrã
                if (result.RequiresTwoFactor)
                {
                    return Accepted(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto request)
        {
            try
            {
                var result = await _authService.ForgotPasswordAsync(request.Email);
                return Ok(new { message = result });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto request)
        {
            try
            {
                var result = await _authService.ResetPasswordAsync(request);
                return Ok(new { message = result });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [Authorize] // Só pode ativar quem já está logado
        [HttpPost("enable-2fa")]
        public async Task<IActionResult> Enable2FA()
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
                var qrCodeUrl = await _authService.EnableTwoFactorAsync(userId);
                return Ok(new { qrCodeUrl });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}