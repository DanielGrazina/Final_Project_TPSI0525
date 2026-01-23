using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class FormadorService : IFormadorService
    {
        private readonly AppDbContext _context;

        public FormadorService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<FormadorDto>> GetAllAsync()
        {
            return await _context.Formadores
                .Select(f => new FormadorDto
                {
                    Id = f.Id,
                    Nome = f.Nome,
                    Email = f.Email,
                    TemFoto = f.FotoContent != null && f.FotoContent.Length > 0,
                    TemCV = f.CVContent != null && f.CVContent.Length > 0
                })
                .ToListAsync();
        }

        public async Task<FormadorDto?> GetByIdAsync(int id)
        {
            var f = await _context.Formadores.FindAsync(id);
            if (f == null) return null;

            return new FormadorDto
            {
                Id = f.Id,
                Nome = f.Nome,
                Email = f.Email,
                TemFoto = f.FotoContent != null,
                TemCV = f.CVContent != null
            };
        }

        public async Task<FormadorDto> CreateAsync(CreateFormadorDto dto)
        {
            var formador = new Formador
            {
                Nome = dto.Nome,
                Email = dto.Email
            };

            // Process PHOTO
            if (dto.Foto != null && dto.Foto.Length > 0)
            {
                using (var memoryStream = new MemoryStream())
                {
                    await dto.Foto.CopyToAsync(memoryStream);
                    formador.FotoContent = memoryStream.ToArray();
                    formador.FotoContentType = dto.Foto.ContentType;
                    formador.FotoFileName = dto.Foto.FileName;
                }
            }

            // Process CV (PDF or Doc)
            if (dto.CV != null && dto.CV.Length > 0)
            {
                using (var memoryStream = new MemoryStream())
                {
                    await dto.CV.CopyToAsync(memoryStream);
                    formador.CVContent = memoryStream.ToArray();
                    formador.CVContentType = dto.CV.ContentType;
                    formador.CVFileName = dto.CV.FileName;
                }
            }

            _context.Formadores.Add(formador);
            await _context.SaveChangesAsync();

            return new FormadorDto
            {
                Id = formador.Id,
                Nome = formador.Nome,
                Email = formador.Email,
                TemFoto = formador.FotoContent != null,
                TemCV = formador.CVContent != null
            };
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var formador = await _context.Formadores.FindAsync(id);
            if (formador == null) return false;

            // Check if modules are already assigned (Referential Integrity)
            // var temAulas = await _context.CursoModulos.AnyAsync(cm => cm.FormadorId == id);
            // if (temAulas) throw new Exception("Cannot delete trainer with assigned modules.");

            _context.Formadores.Remove(formador);
            await _context.SaveChangesAsync();
            return true;
        }

        // --- DOWNLOADS ---

        public async Task<FileDownloadDto?> GetFotoAsync(int id)
        {
            var f = await _context.Formadores.FindAsync(id);
            if (f == null || f.FotoContent == null) return null;

            return new FileDownloadDto
            {
                Content = f.FotoContent,
                ContentType = f.FotoContentType ?? "image/jpeg",
                FileName = f.FotoFileName ?? "foto_formador.jpg"
            };
        }

        public async Task<FileDownloadDto?> GetCVAsync(int id)
        {
            var f = await _context.Formadores.FindAsync(id);
            if (f == null || f.CVContent == null) return null;

            return new FileDownloadDto
            {
                Content = f.CVContent,
                ContentType = f.CVContentType ?? "application/pdf",
                FileName = f.CVFileName ?? "cv.pdf"
            };
        }
    }
}