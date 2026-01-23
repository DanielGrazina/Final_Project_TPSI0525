using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class FormandoService : IFormandoService
    {
        private readonly AppDbContext _context;

        public FormandoService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<FormandoDto>> GetAllAsync()
        {
            return await _context.Formandos
                .Select(f => new FormandoDto
                {
                    Id = f.Id,
                    Nome = f.Nome,
                    Email = f.Email,
                    CursoAtualId = f.CursoAtualId,
                    // Checks if the byte array is not null/empty
                    TemFoto = f.FotoContent != null && f.FotoContent.Length > 0,
                    TemDocumento = f.DocumentoContent != null && f.DocumentoContent.Length > 0
                })
                .ToListAsync();
        }

        public async Task<FormandoDto?> GetByIdAsync(int id)
        {
            var f = await _context.Formandos.FindAsync(id);
            if (f == null) return null;

            return new FormandoDto
            {
                Id = f.Id,
                Nome = f.Nome,
                Email = f.Email,
                CursoAtualId = f.CursoAtualId,
                TemFoto = f.FotoContent != null,
                TemDocumento = f.DocumentoContent != null
            };
        }

        public async Task<FormandoDto> CreateAsync(CreateFormandoDto dto)
        {
            var formando = new Formando
            {
                Nome = dto.Nome,
                Email = dto.Email,
                CursoAtualId = dto.CursoAtualId
            };

            // Process PHOTO
            if (dto.Foto != null && dto.Foto.Length > 0)
            {
                using (var memoryStream = new MemoryStream())
                {
                    await dto.Foto.CopyToAsync(memoryStream);
                    formando.FotoContent = memoryStream.ToArray(); // Convert to byte[]
                    formando.FotoContentType = dto.Foto.ContentType;
                    formando.FotoFileName = dto.Foto.FileName;
                }
            }

            // Process DOCUMENT (CV)
            if (dto.Documento != null && dto.Documento.Length > 0)
            {
                using (var memoryStream = new MemoryStream())
                {
                    await dto.Documento.CopyToAsync(memoryStream);
                    formando.DocumentoContent = memoryStream.ToArray();
                    formando.DocumentoContentType = dto.Documento.ContentType;
                    formando.DocumentoFileName = dto.Documento.FileName;
                }
            }

            _context.Formandos.Add(formando);
            await _context.SaveChangesAsync();

            // Returns the simple DTO
            return new FormandoDto
            {
                Id = formando.Id,
                Nome = formando.Nome,
                Email = formando.Email,
                CursoAtualId = formando.CursoAtualId,
                TemFoto = formando.FotoContent != null,
                TemDocumento = formando.DocumentoContent != null
            };
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var formando = await _context.Formandos.FindAsync(id);
            if (formando == null) return false;

            _context.Formandos.Remove(formando);
            await _context.SaveChangesAsync();
            return true;
        }

        // --- DOWNLOAD METHODS ---

        public async Task<FileDownloadDto?> GetFotoAsync(int id)
        {
            var f = await _context.Formandos.FindAsync(id);
            if (f == null || f.FotoContent == null) return null;

            return new FileDownloadDto
            {
                Content = f.FotoContent,
                ContentType = f.FotoContentType ?? "image/jpeg",
                FileName = f.FotoFileName ?? "foto.jpg"
            };
        }

        public async Task<FileDownloadDto?> GetDocumentoAsync(int id)
        {
            var f = await _context.Formandos.FindAsync(id);
            if (f == null || f.DocumentoContent == null) return null;

            return new FileDownloadDto
            {
                Content = f.DocumentoContent,
                ContentType = f.DocumentoContentType ?? "application/octet-stream",
                FileName = f.DocumentoFileName ?? "documento.bin"
            };
        }
    }
}