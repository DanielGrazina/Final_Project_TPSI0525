using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;
using System.Security.Claims;
using Google.Apis.Auth;

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

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto request)
        {
            try
            {
                var result = await _authService.RegisterAsync(request);
                return Ok(new { message = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

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

        [HttpPost("activate")]
        public async Task<IActionResult> Activate([FromBody] ActivateDto request)
        {
            try
            {
                var result = await _authService.ActivateAccountAsync(request.Email, request.Token);
                return Ok(new { message = result });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [Authorize]
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

        // Login via Google
        [HttpPost("google")]
        public async Task<IActionResult> Google([FromBody] GoogleLoginDto request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.IdToken))
                    return BadRequest(new { message = "IdToken em falta." });

                // Valida o ID Token do Google
                var payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken);

                // Cria/atualiza o user e devolve JWT
                var result = await _authService.SocialLoginAsync(
                    payload.Email,
                    "Google",
                    payload.Subject, // ID único do Google
                    payload.Name ?? payload.Email
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Token Google inválido: " + ex.Message });
            }
        }

        [HttpPost("social-login")]
        public async Task<IActionResult> SocialLogin([FromBody] SocialLoginDto request)
        {
            var result = await _authService.SocialLoginAsync(request.Email, request.Provider, request.ProviderKey, request.Nome);
            return Ok(result);
        }
    }
}
