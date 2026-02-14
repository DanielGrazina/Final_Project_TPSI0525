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

        // Contas criadas por OAuth (Google/Facebook) não têm password.
        // Este método permite definir uma password para entrar com email/password (ex: app mobile).
        Task<string> SetPasswordAsync(int userId, SetPasswordDto dto);



        Task<AuthResponseDto> SocialLoginAsync(
            string email,
            string provider,
            string providerKey,
            string nome,
            string? twoFactorCode = null
        );
    }
}
