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

        public async Task<AreaDto?> GetAreaByIdAsync(int id)
        {
            var a = await _context.Areas.FindAsync(id);
            if (a == null) return null;
            return new AreaDto { Id = a.Id, Nome = a.Nome };
        }

        public async Task<AreaDto> UpdateAreaAsync(int id, CreateAreaDto dto)
        {
            var area = await _context.Areas.FindAsync(id);
            if (area == null) throw new Exception("Área não encontrada.");

            area.Nome = dto.Nome;
            await _context.SaveChangesAsync();

            return new AreaDto { Id = area.Id, Nome = area.Nome };
        }

        public async Task<bool> DeleteAreaAsync(int id)
        {
            var area = await _context.Areas.FindAsync(id);
            if (area == null) return false;

            // Validar se tem Cursos
            bool temCursos = await _context.Cursos.AnyAsync(c => c.AreaId == id);
            if (temCursos) throw new Exception("Não é possível apagar esta área porque existem cursos associados.");

            _context.Areas.Remove(area);
            await _context.SaveChangesAsync();
            return true;
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

        public async Task<CursoDto> UpdateCursoAsync(int id, CreateCursoDto dto)
        {
            var curso = await _context.Cursos.Include(c => c.Area).FirstOrDefaultAsync(c => c.Id == id);
            if (curso == null) throw new Exception("Curso não encontrado.");

            // Validar se a nova Area existe
            if (!await _context.Areas.AnyAsync(a => a.Id == dto.AreaId))
                throw new Exception("A Área indicada não existe.");

            curso.Nome = dto.Nome;
            curso.NivelCurso = dto.NivelCurso;
            curso.AreaId = dto.AreaId;

            await _context.SaveChangesAsync();

            // Recarregar area para o retorno
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

        public async Task<ModuloDto?> GetModuloByIdAsync(int id)
        {
            var m = await _context.Modulos.FindAsync(id);
            if (m == null) return null;

            return new ModuloDto
            {
                Id = m.Id,
                Nome = m.Nome,
                CargaHorariaTotal = m.CargaHoraria
            };
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

        public async Task<ModuloDto> UpdateModuloAsync(int id, CreateModuloDto dto)
        {
            var modulo = await _context.Modulos.FindAsync(id);
            if (modulo == null) throw new Exception("Módulo não encontrado.");

            modulo.Nome = dto.Nome;
            modulo.CargaHoraria = dto.CargaHorariaTotal;
            // modulo.Nivel = dto.Nivel;

            await _context.SaveChangesAsync();

            return new ModuloDto
            {
                Id = modulo.Id,
                Nome = modulo.Nome,
                CargaHorariaTotal = modulo.CargaHoraria
            };
        }

        public async Task<bool> DeleteModuloAsync(int id)
        {
            var modulo = await _context.Modulos.FindAsync(id);
            if (modulo == null) return false;

            bool emUso = await _context.TurmaModulos.AnyAsync(tm => tm.ModuloId == id);
            if (emUso)
                throw new Exception("Não é possível apagar este módulo pois está associado a uma ou mais turmas.");

            _context.Modulos.Remove(modulo);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}