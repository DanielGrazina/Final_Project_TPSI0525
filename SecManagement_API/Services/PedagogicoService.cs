using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class PedagogicoService : IPedagogicoService
    {
        private readonly AppDbContext _context;

        public PedagogicoService(AppDbContext context)
        {
            _context = context;
        }

        // --- AREAS ---
        public async Task<IEnumerable<AreaDto>> GetAreasAsync()
        {
            return await _context.Areas
                .Select(a => new AreaDto { Id = a.Id, Nome = a.Nome })
                .ToListAsync();
        }

        public async Task<AreaDto> CreateAreaAsync(CreateAreaDto dto)
        {
            var area = new Area { Nome = dto.Nome };
            _context.Areas.Add(area);
            await _context.SaveChangesAsync();
            return new AreaDto { Id = area.Id, Nome = area.Nome };
        }

        // --- CURSOS ---
        public async Task<IEnumerable<CursoDto>> GetCursosAsync()
        {
            return await _context.Cursos
                .Include(c => c.Area) // Join com Area
                .Select(c => new CursoDto
                {
                    Id = c.Id,
                    Nome = c.Nome,
                    NivelCurso = c.NivelCurso,
                    AreaId = c.AreaId,
                    AreaNome = c.Area != null ? c.Area.Nome : "Sem Área"
                })
                .ToListAsync();
        }

        public async Task<CursoDto?> GetCursoByIdAsync(int id)
        {
            var c = await _context.Cursos
                .Include(x => x.Area)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (c == null) return null;

            return new CursoDto
            {
                Id = c.Id,
                Nome = c.Nome,
                NivelCurso = c.NivelCurso,
                AreaId = c.AreaId,
                AreaNome = c.Area?.Nome ?? "Sem Área"
            };
        }

        public async Task<CursoDto> CreateCursoAsync(CreateCursoDto dto)
        {
            if (!await _context.Areas.AnyAsync(a => a.Id == dto.AreaId))
                throw new Exception("A Área indicada não existe.");

            var curso = new Curso
            {
                Nome = dto.Nome,
                NivelCurso = dto.NivelCurso,
                AreaId = dto.AreaId
            };

            _context.Cursos.Add(curso);
            await _context.SaveChangesAsync();

            var area = await _context.Areas.FindAsync(dto.AreaId);

            return new CursoDto
            {
                Id = curso.Id,
                Nome = curso.Nome,
                NivelCurso = curso.NivelCurso,
                AreaId = curso.AreaId,
                AreaNome = area?.Nome ?? ""
            };
        }

        public async Task<bool> DeleteCursoAsync(int id)
        {
            var curso = await _context.Cursos.FindAsync(id);
            if (curso == null) return false;

            bool temTurmas = await _context.Turmas.AnyAsync(t => t.CursoId == id);
            if (temTurmas) throw new Exception("Não é possível apagar este curso pois já existem turmas associadas.");

            _context.Cursos.Remove(curso);
            await _context.SaveChangesAsync();
            return true;
        }

        // --- MÓDULOS ---
        public async Task<IEnumerable<ModuloDto>> GetModulosAsync()
        {
            return await _context.Modulos
                .Select(m => new ModuloDto
                {
                    Id = m.Id,
                    Nome = m.Nome,
                    CargaHorariaTotal = m.CargaHoraria
                })
                .ToListAsync();
        }

        public async Task<ModuloDto> CreateModuloAsync(CreateModuloDto dto)
        {
            var modulo = new Modulo
            {
                Nome = dto.Nome,
                CargaHoraria = dto.CargaHorariaTotal,
                Nivel = "1"
            };

            _context.Modulos.Add(modulo);
            await _context.SaveChangesAsync();

            return new ModuloDto
            {
                Id = modulo.Id,
                Nome = modulo.Nome,
                CargaHorariaTotal = modulo.CargaHoraria
            };
        }
    }
}