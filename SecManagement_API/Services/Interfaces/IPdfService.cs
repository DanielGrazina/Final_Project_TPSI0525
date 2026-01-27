namespace SecManagement_API.Services.Interfaces
{
    public interface IPdfService
    {
        Task<byte[]> GenerateFormandoReportAsync(int userId);
        Task<byte[]> GenerateFormadorReportAsync(int userId);
    }
}
