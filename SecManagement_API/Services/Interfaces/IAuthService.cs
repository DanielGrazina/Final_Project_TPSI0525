using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IAuthService
    {
        Task<string> RegisterAsync(RegisterDto dto);

        Task<AuthResponseDto> LoginAsync(LoginDto dto);

        Task<string> ForgotPasswordAsync(string email);
        Task<string> ResetPasswordAsync(ResetPasswordDto dto);

        Task<TwoFactorSetupDto> SetupTwoFactorAsync(int userId);
        Task<TwoFactorRecoveryDto> ConfirmTwoFactorAsync(int userId, string code);
        Task<string> ActivateAccountAsync(string email, string token);



        Task<AuthResponseDto> SocialLoginAsync(
            string email,
            string provider,
            string providerKey,
            string nome,
            string? twoFactorCode = null
        );
    }
}
