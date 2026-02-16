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

        // POST: api/Auth/register
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

        // POST: api/Auth/login
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
        {
            try
            {
                var result = await _authService.LoginAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Auth/forgot-password
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto request)
        {
            try
            {
                var result = await _authService.ForgotPasswordAsync(request.Email);
                return Ok(new { message = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Auth/reset-password
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto request)
        {
            try
            {
                var result = await _authService.ResetPasswordAsync(request);
                return Ok(new { message = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Auth/set-password
        // Permite a contas OAuth (Google/Facebook) definirem uma password para conseguir
        // entrar com email/password (ex: app mobile).
        [Authorize]
        [HttpPost("set-password")]
        public async Task<IActionResult> SetPassword([FromBody] SetPasswordDto request)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _authService.SetPasswordAsync(userId, request);
                return Ok(new { message = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Auth/activate
        [HttpPost("activate")]
        public async Task<IActionResult> Activate([FromBody] ActivateDto request)
        {
            try
            {
                var result = await _authService.ActivateAccountAsync(request.Email, request.Token);
                return Ok(new { message = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Auth/enable-2fa
        [Authorize]
        [HttpPost("2fa/setup")]
        public async Task<IActionResult> Setup2FA()
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _authService.SetupTwoFactorAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Auth/2fa/confirm
        [Authorize]
        [HttpPost("2fa/confirm")]
        public async Task<IActionResult> Confirm2FA([FromBody] TwoFactorConfirmDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _authService.ConfirmTwoFactorAsync(userId, dto.Code);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Auth/google
        // Login with google (+ 2FA support)
        [HttpPost("google")]
        public async Task<IActionResult> Google([FromBody] GoogleLoginDto request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.IdToken))
                    return BadRequest(new { message = "IdToken em falta." });

                var payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken);

                var result = await _authService.SocialLoginAsync(
                    payload.Email,
                    "Google",
                    payload.Subject,
                    payload.Name ?? payload.Email,
                    request.TwoFactorCode
                );

                if (result.RequiresTwoFactor)
                    return Accepted(result);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Token Google inválido: " + ex.Message });
            }
        }

        // POST: api/Auth/social-login
        // (Se ainda usares isto para FB/Outros. Também suporta 2FA opcional.)
        [HttpPost("social-login")]
        public async Task<IActionResult> SocialLogin([FromBody] SocialLoginDto request)
        {
            try
            {
                var result = await _authService.SocialLoginAsync(
                    request.Email,
                    request.Provider,
                    request.ProviderKey,
                    request.Nome,
                    request.TwoFactorCode
                );

                if (result.RequiresTwoFactor)
                    return Accepted(result);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
