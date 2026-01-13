namespace SecManagement_API.DTOs
{
    public class AuthResponseDto
    {
        public string? Token { get; set; }
        public bool RequiresTwoFactor { get; set; } = false;
        public string Message { get; set; } = string.Empty;
    }
}
