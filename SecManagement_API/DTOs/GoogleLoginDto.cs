namespace SecManagement_API.DTOs
{
    public class GoogleLoginDto
    {
        public string IdToken { get; set; } = string.Empty;

        // ✅ NOVO: usado quando o user tem 2FA ligado (challenge)
        public string? TwoFactorCode { get; set; }
    }
}
