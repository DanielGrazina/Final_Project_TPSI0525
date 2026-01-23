using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class SessaoService : ISessaoService
    {
        private readonly AppDbContext _context;

        public SessaoService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<SessaoDto> AgendarSessaoAsync(CreateSessaoDto dto)
        {
            // Validações Básicas de Data
            if (dto.HorarioFim <= dto.HorarioInicio)
                throw new Exception("A hora de fim tem de ser superior à de início.");

            // Carregar dados do Módulo/Turma para saber quem é o Formador
            var turmaModulo = await _context.TurmaModulos
                .Include(tm => tm.Modulo)
                .Include(tm => tm.Turma)
                .Include(tm => tm.Formador).ThenInclude(f => f.User)
                .FirstOrDefaultAsync(tm => tm.Id == dto.TurmaModuloId);

            if (turmaModulo == null) throw new Exception("Módulo da turma não encontrado.");

            int formadorId = turmaModulo.FormadorId;

            // VERIFICAR CONFLITO DE SALA
            // Existe alguma sessão NESTA sala, que se sobreponha ao horário pedido?
            bool conflitoSala = await _context.Sessoes
                .AnyAsync(s => s.SalaId == dto.SalaId &&
                               s.HorarioInicio < dto.HorarioFim &&
                               s.HorarioFim > dto.HorarioInicio);

            if (conflitoSala) throw new Exception("A Sala já está ocupada neste horário.");

            // VERIFICAR CONFLITO DE FORMADOR
            // O formador pode estar a dar aula noutra turma ao mesmo tempo?
            // Temos de ver todas as sessões onde o formador é o mesmo.
            bool conflitoFormador = await _context.Sessoes
                .Include(s => s.TurmaModulo)
                .AnyAsync(s => s.TurmaModulo.FormadorId == formadorId &&
                               s.HorarioInicio < dto.HorarioFim &&
                               s.HorarioFim > dto.HorarioInicio);

            if (conflitoFormador) throw new Exception("O Formador já tem aula marcada neste horário noutra turma.");

            // Criar Sessão
            var sessao = new Sessao
            {
                TurmaModuloId = dto.TurmaModuloId,
                SalaId = dto.SalaId,
                HorarioInicio = dto.HorarioInicio,
                HorarioFim = dto.HorarioFim
            };

            _context.Sessoes.Add(sessao);
            await _context.SaveChangesAsync();

            // Retorno
            var sala = await _context.Salas.FindAsync(dto.SalaId);
            return MapToDto(sessao, turmaModulo, sala);
        }

        public async Task<IEnumerable<SessaoDto>> GetHorarioTurmaAsync(int turmaId, DateTime start, DateTime end)
        {
            var sessoes = await _context.Sessoes
                .Include(s => s.Sala)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Modulo)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Formador).ThenInclude(f => f.User)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Turma)
                .Where(s => s.TurmaModulo.TurmaId == turmaId &&
                            s.HorarioInicio >= start && s.HorarioInicio <= end)
                .OrderBy(s => s.HorarioInicio)
                .ToListAsync();

            return sessoes.Select(s => MapToDto(s, s.TurmaModulo, s.Sala));
        }

        public async Task<IEnumerable<SessaoDto>> GetHorarioFormadorAsync(int formadorId, DateTime start, DateTime end)
        {
            var sessoes = await _context.Sessoes
                .Include(s => s.Sala)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Modulo)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Formador).ThenInclude(f => f.User)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Turma)
                .Where(s => s.TurmaModulo.FormadorId == formadorId &&
                            s.HorarioInicio >= start && s.HorarioInicio <= end)
                .OrderBy(s => s.HorarioInicio)
                .ToListAsync();

            return sessoes.Select(s => MapToDto(s, s.TurmaModulo, s.Sala));
        }

        public async Task<bool> DeleteSessaoAsync(int id)
        {
            var s = await _context.Sessoes.FindAsync(id);
            if (s == null) return false;

            _context.Sessoes.Remove(s);
            await _context.SaveChangesAsync();
            return true;
        }

        private static SessaoDto MapToDto(Sessao s, TurmaModulo? tm, Sala? sala)
        {
            return new SessaoDto
            {
                Id = s.Id,
                TurmaModuloId = s.TurmaModuloId,
                ModuloNome = tm?.Modulo?.Nome ?? "N/A",
                FormadorNome = tm?.Formador?.User?.Nome ?? "N/A",
                TurmaNome = tm?.Turma?.Nome ?? "N/A",
                SalaId = s.SalaId,
                SalaNome = sala?.Nome ?? "N/A",
                HorarioInicio = s.HorarioInicio,
                HorarioFim = s.HorarioFim
            };
        }
    }
}