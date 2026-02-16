using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IAutoScheduleService
    {
        Task<AutoScheduleResultDto> GenerateAsync(AutoScheduleRequestDto request);
    }
}
