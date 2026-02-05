namespace SecManagement_API.DTOs
{
    public class SocialLoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty;
        public string ProviderKey { get; set; } = string.Empty;
        public string Nome { get; set; } = string.Empty;
        public string? TwoFactorCode { get; set; } // NOVO: usado quando o user tem 2FA ligado (challenge)
    }
}