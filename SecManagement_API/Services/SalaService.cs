using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class SalaService : ISalaService
    {
        private readonly AppDbContext _context;

        public SalaService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<SalaDto>> GetAllAsync()
        {
            return await _context.Salas
                .Select(s => new SalaDto
                {
                    Id = s.Id,
                    Nome = s.Nome,
                    Capacidade = s.Capacidade,
                    Tipo = s.Tipo
                })
                .ToListAsync();
        }

        public async Task<SalaDto?> GetByIdAsync(int id)
        {
            var s = await _context.Salas.FindAsync(id);
            if (s == null) return null;

            return new SalaDto
            {
                Id = s.Id,
                Nome = s.Nome,
                Capacidade = s.Capacidade,
                Tipo = s.Tipo
            };
        }

        public async Task<SalaDto> CreateAsync(CreateSalaDto dto)
        {
            var sala = new Sala
            {
                Nome = dto.Nome,
                Capacidade = dto.Capacidade,
                Tipo = dto.Tipo
            };

            _context.Salas.Add(sala);
            await _context.SaveChangesAsync();

            return new SalaDto
            {
                Id = sala.Id,
                Nome = sala.Nome,
                Capacidade = sala.Capacidade,
                Tipo = sala.Tipo
            };
        }

        public async Task<bool> UpdateAsync(int id, CreateSalaDto dto)
        {
            var sala = await _context.Salas.FindAsync(id);
            if (sala == null) return false;

            sala.Nome = dto.Nome;
            sala.Capacidade = dto.Capacidade;
            sala.Tipo = dto.Tipo;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var sala = await _context.Salas.FindAsync(id);
            if (sala == null) return false;

            _context.Salas.Remove(sala);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}