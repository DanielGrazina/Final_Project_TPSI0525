using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;

namespace SecManagement_API.Services.Interfaces
{
    public interface IProfileService
    {
        // --- GESTÃO DE PERFIS ---
        Task<FormadorProfileDto> GetFormadorProfileAsync(int userId);
        Task<FormadorProfileDto> CreateFormadorProfileAsync(CreateFormadorProfileDto dto);

        Task<FormandoProfileDto> GetFormandoProfileAsync(int userId);
        Task<FormandoProfileDto> CreateFormandoProfileAsync(CreateFormandoProfileDto dto);

        // --- GESTÃO DE FICHEIROS ---
        Task<UserFicheiroDto> UploadFileAsync(int userId, IFormFile file);

        Task<UserFicheiroDto?> GetFileDetailsAsync(int fileId);

        Task<(byte[] Bytes, string ContentType, string FileName)?> GetFileContentAsync(int fileId);

        Task<bool> DeleteFileAsync(int fileId);
    }
}