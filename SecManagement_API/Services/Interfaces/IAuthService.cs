using SecManagement_API.DTOs;
using SecManagement_API.Models;

namespace SecManagement_API.Services.Interfaces
{
    public interface IAuthService
    {
        Task<string> RegisterAsync(RegisterDto dto);
        Task<string> LoginAsync(LoginDto dto);
    }
}