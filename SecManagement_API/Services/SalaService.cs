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
                    Tipo = s.Tipo.ToString()
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
                Tipo = s.Tipo.ToString()
            };
        }

        public async Task<SalaDto> CreateAsync(CreateSalaDto dto)
        {
            if (!Enum.TryParse<TipoSala>(dto.Tipo, true, out var tipoEnum))
            {
                throw new ArgumentException($"Tipo de sala inválido: {dto.Tipo}. Aceites: Teorica, Informatica, Oficina, Reuniao");
            }

            var nome = (dto.Nome ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(nome))
                throw new ArgumentException("O nome da sala é obrigatório.");

            var nomeNorm = nome.ToLowerInvariant();
            bool nomeExiste = await _context.Salas.AnyAsync(s => s.NomeNormalized == nomeNorm);
            if (nomeExiste)
                throw new Exception("Já existe uma sala com esse nome.");

            var sala = new Sala
            {
                Nome = nome,
                NomeNormalized = nomeNorm,
                Capacidade = dto.Capacidade,
                Tipo = tipoEnum
            };

            _context.Salas.Add(sala);
            await _context.SaveChangesAsync();

            return new SalaDto
            {
                Id = sala.Id,
                Nome = sala.Nome,
                Capacidade = sala.Capacidade,
                Tipo = sala.Tipo.ToString()
            };
        }

        public async Task<bool> UpdateAsync(int id, CreateSalaDto dto)
        {
            var sala = await _context.Salas.FindAsync(id);
            if (sala == null) return false;

            if (!Enum.TryParse<TipoSala>(dto.Tipo, true, out var tipoEnum))
            {
                throw new ArgumentException($"Tipo de sala inválido: {dto.Tipo}");
            }


            var nome = (dto.Nome ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(nome))
                throw new ArgumentException("O nome da sala é obrigatório.");

            var nomeNorm = nome.ToLowerInvariant();
            bool nomeExiste = await _context.Salas.AnyAsync(s => s.Id != id && s.NomeNormalized == nomeNorm);
            if (nomeExiste)
                throw new Exception("Já existe uma sala com esse nome.");

            sala.Nome = nome;
            sala.NomeNormalized = nomeNorm;
            sala.Capacidade = dto.Capacidade;
            sala.Tipo = tipoEnum;

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