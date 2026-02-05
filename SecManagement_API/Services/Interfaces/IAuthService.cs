using SecManagement_API.DTOs;

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

        // ✅ ALTERADO: agora aceita twoFactorCode opcional para login social
        Task<AuthResponseDto> SocialLoginAsync(
            string email,
            string provider,
            string providerKey,
            string nome,
            string? twoFactorCode = null
        );
    }
}
