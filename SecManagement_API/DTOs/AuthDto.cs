namespace SecManagement_API.DTOs
{
    public class TwoFactorSetupDto
    {
        public string QrCodeUrl { get; set; } = string.Empty;
        public string ManualEntryKey { get; set; } = string.Empty;
    }

    public class TwoFactorConfirmDto
    {
        public string Code { get; set; } = string.Empty;
    }

    public class TwoFactorRecoveryDto
    {
        public IEnumerable<string> BackupCodes { get; set; } = new List<string>();
        public string Message { get; set; } = string.Empty;
    }
}