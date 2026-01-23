using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class ModuloService : IModuloService
    {
        private readonly AppDbContext _context;

        public ModuloService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ModuloDto>> GetAllAsync()
        {
            return await _context.Modulos
                .Select(m => new ModuloDto { Id = m.Id, Nome = m.Nome, CargaHorariaTotal = m.CargaHorariaTotal })
                .ToListAsync();
        }

        public async Task<ModuloDto?> GetByIdAsync(int id)
        {
            var m = await _context.Modulos.FindAsync(id);
            if (m == null) return null;
            return new ModuloDto { Id = m.Id, Nome = m.Nome, CargaHorariaTotal = m.CargaHorariaTotal };
        }

        public async Task<Modulo> CreateAsync(CreateModuloDto dto)
        {
            var modulo = new Modulo { Nome = dto.Nome, CargaHorariaTotal = dto.CargaHorariaTotal };
            _context.Modulos.Add(modulo);
            await _context.SaveChangesAsync();
            return modulo;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var modulo = await _context.Modulos.FindAsync(id);
            if (modulo == null) return false;

            _context.Modulos.Remove(modulo);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}