using SecManagement_API.DTOs;
using SecManagement_API.Models;

namespace SecManagement_API.Services.Interfaces
{
    public interface IAuthService
    {
        Task<string> RegisterAsync(RegisterDto dto);

        Task<AuthResponseDto> LoginAsync(LoginDto dto);

        Task<string> ForgotPasswordAsync(string email);
        Task<string> ResetPasswordAsync(ResetPasswordDto dto);

        Task<string> EnableTwoFactorAsync(int userId);
        Task<string> ActivateAccountAsync(string email, string token);
        Task<AuthResponseDto> SocialLoginAsync(string email, string provider, string providerKey, string nome);
    }
}
