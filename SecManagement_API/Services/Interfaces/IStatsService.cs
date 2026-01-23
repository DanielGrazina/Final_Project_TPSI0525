using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IStatsService
    {
        Task<DashboardStatsDto> GetDashboardStatsAsync();
    }
}