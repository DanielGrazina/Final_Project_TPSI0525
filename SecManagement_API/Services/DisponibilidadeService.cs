using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class DisponibilidadeService : IDisponibilidadeService
    {
        private readonly AppDbContext _context;

        public DisponibilidadeService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DisponibilidadeDto> CreateAsync(CreateDisponibilidadeDto dto)
        {
            if (dto.DataInicio >= dto.DataFim)
                throw new Exception("A data de fim deve ser superior à de início.");

            // Validação Exclusiva: Ou Formador ou Sala
            if (dto.TipoEntidade == "Formador")
            {
                if (dto.FormadorId == null) throw new Exception("FormadorId é obrigatório para tipo 'Formador'.");
                dto.SalaId = null; // Garante que não vai lixo
            }
            else if (dto.TipoEntidade == "Sala")
            {
                if (dto.SalaId == null) throw new Exception("SalaId é obrigatório para tipo 'Sala'.");
                dto.FormadorId = null;
            }

            var disp = new Disponibilidade
            {
                TipoEntidade = dto.TipoEntidade,
                FormadorId = dto.FormadorId,
                SalaId = dto.SalaId,
                EntidadeId = dto.FormadorId ?? dto.SalaId ?? 0, // Campo auxiliar legacy, se o SQL pedir
                DataInicio = dto.DataInicio,
                DataFim = dto.DataFim,
                Disponivel = dto.Disponivel
            };

            _context.Disponibilidades.Add(disp);
            await _context.SaveChangesAsync();

            // Recarregar para trazer nomes
            return await MapToDto(disp.Id);
        }

        public async Task<IEnumerable<DisponibilidadeDto>> GetByFormadorAsync(int formadorId)
        {
            var list = await _context.Disponibilidades
                .Include(d => d.Formador).ThenInclude(f => f.User)
                .Where(d => d.FormadorId == formadorId)
                .OrderBy(d => d.DataInicio)
                .ToListAsync();

            return list.Select(d => new DisponibilidadeDto
            {
                Id = d.Id,
                TipoEntidade = "Formador",
                FormadorId = d.FormadorId,
                FormadorNome = d.Formador?.User?.Nome ?? "N/A",
                DataInicio = d.DataInicio,
                DataFim = d.DataFim,
                Disponivel = d.Disponivel ?? true
            });
        }

        public async Task<IEnumerable<DisponibilidadeDto>> GetBySalaAsync(int salaId)
        {
            var list = await _context.Disponibilidades
                .Include(d => d.Sala)
                .Where(d => d.SalaId == salaId)
                .OrderBy(d => d.DataInicio)
                .ToListAsync();

            return list.Select(d => new DisponibilidadeDto
            {
                Id = d.Id,
                TipoEntidade = "Sala",
                SalaId = d.SalaId,
                SalaNome = d.Sala?.Nome ?? "N/A",
                DataInicio = d.DataInicio,
                DataFim = d.DataFim,
                Disponivel = d.Disponivel ?? true
            });
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var item = await _context.Disponibilidades.FindAsync(id);
            if (item == null) return false;

            _context.Disponibilidades.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }

        // Helper para mapear um único objeto completo
        private async Task<DisponibilidadeDto> MapToDto(int id)
        {
            var d = await _context.Disponibilidades
                .Include(x => x.Formador).ThenInclude(f => f.User)
                .Include(x => x.Sala)
                .FirstAsync(x => x.Id == id);

            return new DisponibilidadeDto
            {
                Id = d.Id,
                TipoEntidade = d.TipoEntidade ?? "",
                FormadorId = d.FormadorId,
                FormadorNome = d.Formador?.User?.Nome,
                SalaId = d.SalaId,
                SalaNome = d.Sala?.Nome,
                DataInicio = d.DataInicio,
                DataFim = d.DataFim,
                Disponivel = d.Disponivel ?? true
            };
        }
    }
}