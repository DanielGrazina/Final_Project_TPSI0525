using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class CursoService : ICursoService
    {
        private readonly AppDbContext _context;

        public CursoService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<CursoDto>> GetAllAsync()
        {
            return await _context.Cursos
                .Select(c => new CursoDto
                {
                    Id = c.Id,
                    Nome = c.Nome,
                    Area = c.Area,
                    DataInicio = c.DataInicio,
                    DataFim = c.DataFim,
                    IsAtivo = c.IsAtivo
                })
                .ToListAsync();
        }

        public async Task<CursoDto?> GetByIdAsync(int id)
        {
            var c = await _context.Cursos.FindAsync(id);
            if (c == null) return null;

            return new CursoDto
            {
                Id = c.Id,
                Nome = c.Nome,
                Area = c.Area,
                DataInicio = c.DataInicio,
                DataFim = c.DataFim,
                IsAtivo = c.IsAtivo
            };
        }

        public async Task<CursoDto> CreateAsync(CreateCursoDto dto)
        {
            var curso = new Curso
            {
                Nome = dto.Nome,
                Area = dto.Area,
                DataInicio = dto.DataInicio,
                DataFim = dto.DataFim,
                IsAtivo = true
            };

            _context.Cursos.Add(curso);
            await _context.SaveChangesAsync();

            // Returns the DTO of the created course
            return new CursoDto
            {
                Id = curso.Id,
                Nome = curso.Nome,
                Area = curso.Area,
                DataInicio = curso.DataInicio,
                DataFim = curso.DataFim,
                IsAtivo = curso.IsAtivo
            };
        }

        public async Task<bool> UpdateAsync(int id, CreateCursoDto dto)
        {
            var curso = await _context.Cursos.FindAsync(id);
            if (curso == null) return false;

            curso.Nome = dto.Nome;
            curso.Area = dto.Area;
            curso.DataInicio = dto.DataInicio;
            curso.DataFim = dto.DataFim;
            curso.IsAtivo = curso.DataFim > DateTime.Now;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var curso = await _context.Cursos.FindAsync(id);
            if (curso == null) return false;

            // Dependency validation (Business Rule)
            var temDependentes = await _context.CursoModulos.AnyAsync(cm => cm.CursoId == id) ||
                                 await _context.Formandos.AnyAsync(f => f.CursoAtualId == id);

            if (temDependentes) throw new Exception("Não pode apagar curso com módulos ou formandos.");

            _context.Cursos.Remove(curso);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}