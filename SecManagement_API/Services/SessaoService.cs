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
            if (turmaModulo.Modulo == null) throw new Exception("Erro de integridade: Módulo não existe.");

            double horasNovaSessao = (dto.HorarioFim - dto.HorarioInicio).TotalHours;

            var sessoesExistentes = await _context.Sessoes
                .Where(s => s.TurmaModuloId == dto.TurmaModuloId)
                .ToListAsync();

            double horasUsadas = sessoesExistentes.Sum(s => (s.HorarioFim - s.HorarioInicio).TotalHours);

            if (horasUsadas + horasNovaSessao > turmaModulo.Modulo.CargaHoraria)
            {
                double horasRestantes = turmaModulo.Modulo.CargaHoraria - horasUsadas;
                throw new Exception($"Não é possível agendar. O módulo tem {turmaModulo.Modulo.CargaHoraria}h, já foram agendadas {horasUsadas}h. Só restam {horasRestantes}h.");
            }

            int formadorId = turmaModulo.FormadorId;

            // VERIFICAR CONFLITO DE SALA
            bool salaBloqueada = await _context.Disponibilidades
                    .AnyAsync(d => d.SalaId == dto.SalaId
                    && d.Disponivel == false
                    && d.DataInicio < dto.HorarioFim
                    && d.DataFim > dto.HorarioInicio);

            if (salaBloqueada)
                throw new Exception("A Sala está marcada como indisponível (Manutenção/Outro) neste horário.");

            // VERIFICAR CONFLITO DE FORMADOR
            bool formadorBloqueado = await _context.Disponibilidades
                    .AnyAsync(d => d.FormadorId == formadorId
                    && d.Disponivel == false
                    && d.DataInicio < dto.HorarioFim
                    && d.DataFim > dto.HorarioInicio);

            if (formadorBloqueado)
                throw new Exception($"O formador {turmaModulo.Formador?.User?.Nome} está indisponível (Férias/Ausência) neste horário.");

            // Criar Sessão
            var sessao = new Sessao
            {
                TurmaModuloId = dto.TurmaModuloId,
                SalaId = dto.SalaId,
                HorarioInicio = dto.HorarioInicio.ToUniversalTime(),
                HorarioFim = dto.HorarioFim.ToUniversalTime()
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

        public async Task<double> DeleteSessaoAsync(int id)
        {
            var s = await _context.Sessoes
                .Include(x => x.TurmaModulo).ThenInclude(tm => tm.Modulo)
                .FirstOrDefaultAsync(x => x.Id == id); // Precisamos dos dados para recalcular

            if (s == null) return -1; // -1 indica erro

            int turmaModuloId = s.TurmaModuloId;
            int cargaTotal = s.TurmaModulo.Modulo.CargaHoraria;

            _context.Sessoes.Remove(s);
            await _context.SaveChangesAsync(); // A sessão desapareceu da BD

            // Recalcular o que sobra agora
            var sessoesRestantes = await _context.Sessoes
                .Where(x => x.TurmaModuloId == turmaModuloId)
                .ToListAsync();

            double horasUsadas = sessoesRestantes.Sum(x => (x.HorarioFim - x.HorarioInicio).TotalHours);

            return cargaTotal - horasUsadas; // Retorna as horas livres atuais
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

        public async Task<IEnumerable<SessaoDto>> GetHorarioSalaAsync(int salaId, DateTime start, DateTime end)
        {
            var sessoes = await _context.Sessoes
                .Include(s => s.Sala)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Modulo)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Formador).ThenInclude(f => f.User)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Turma)
                .Where(s => s.SalaId == salaId &&
                            s.HorarioInicio >= start && s.HorarioInicio <= end)
                .OrderBy(s => s.HorarioInicio)
                .ToListAsync();

            return sessoes.Select(s => MapToDto(s, s.TurmaModulo, s.Sala));
        }
    }
}