using SecManagement_API.DTOs;
using SecManagement_API.Models;

namespace SecManagement_API.Services.Interfaces
{
    public interface IAuthService
    {
        Task<string> RegisterAsync(RegisterDto dto);

        // Mudámos o retorno de string para AuthResponseDto para suportar 2FA
        Task<AuthResponseDto> LoginAsync(LoginDto dto);

        // Recuperação de Password
        Task<string> ForgotPasswordAsync(string email);
        Task<string> ResetPasswordAsync(ResetPasswordDto dto);

        // Ativar 2FA (Retorna o URL do QR Code)
        Task<string> EnableTwoFactorAsync(int userId);
    }
}