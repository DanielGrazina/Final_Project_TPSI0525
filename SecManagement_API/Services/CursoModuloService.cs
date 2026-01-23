using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class CursoModuloService : ICursoModuloService
    {
        private readonly AppDbContext _context;

        public CursoModuloService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<CursoModuloDto>> GetAllAsync()
        {
            return await _context.CursoModulos
                .Include(cm => cm.Curso)
                .Include(cm => cm.Modulo)
                .Include(cm => cm.Formador)
                .Include(cm => cm.SalaPadrao)
                .Select(cm => MapToDto(cm)) // auxiliary method to map
                .ToListAsync();
        }

        public async Task<IEnumerable<CursoModuloDto>> GetByCursoIdAsync(int cursoId)
        {
            return await _context.CursoModulos
                .Where(cm => cm.CursoId == cursoId)
                .Include(cm => cm.Curso)
                .Include(cm => cm.Modulo)
                .Include(cm => cm.Formador)
                .Include(cm => cm.SalaPadrao)
                .Select(cm => MapToDto(cm))
                .ToListAsync();
        }

        public async Task<CursoModuloDto?> GetByIdAsync(int id)
        {
            var cm = await _context.CursoModulos
                .Include(x => x.Curso)
                .Include(x => x.Modulo)
                .Include(x => x.Formador)
                .Include(x => x.SalaPadrao)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (cm == null) return null;

            return MapToDto(cm);
        }

        public async Task<CursoModuloDto> CreateAsync(CreateCursoModuloDto dto)
        {
            var existe = await _context.CursoModulos
                .AnyAsync(cm => cm.CursoId == dto.CursoId && cm.ModuloId == dto.ModuloId);

            if (existe) throw new Exception("Este módulo já está atribuído a este curso.");

            var entidade = new CursoModulo
            {
                CursoId = dto.CursoId,
                ModuloId = dto.ModuloId,
                FormadorId = dto.FormadorId,
                SalaPadraoId = dto.SalaPadraoId,
                Estado = dto.Estado
            };

            _context.CursoModulos.Add(entidade);
            await _context.SaveChangesAsync();

            // Reload the entity to populate the names (Includes) for the return
            return await GetByIdAsync(entidade.Id) ?? throw new Exception("Erro ao recuperar registo criado.");
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var cm = await _context.CursoModulos.FindAsync(id);
            if (cm == null) return false;

            _context.CursoModulos.Remove(cm);
            await _context.SaveChangesAsync();
            return true;
        }

        // Auxiliary method to avoid repeating mapping code
        private static CursoModuloDto MapToDto(CursoModulo cm)
        {
            return new CursoModuloDto
            {
                Id = cm.Id,
                CursoId = cm.CursoId,
                CursoNome = cm.Curso?.Nome ?? "N/A",
                ModuloId = cm.ModuloId,
                ModuloNome = cm.Modulo?.Nome ?? "N/A",
                FormadorId = cm.FormadorId,
                FormadorNome = cm.Formador?.Nome ?? "N/A",
                SalaPadraoId = cm.SalaPadraoId,
                SalaNome = cm.SalaPadrao?.Nome ?? "N/A",
                Estado = cm.Estado
            };
        }
    }
}