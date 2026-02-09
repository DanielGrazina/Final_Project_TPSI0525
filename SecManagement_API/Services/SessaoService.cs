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
        public async Task<List<FormadorDisponibilidadeDto>> CheckDisponibilidadeFormadoresAsync(int turmaId, DateTime start, DateTime end)
        {
            // 1. Identificar formadores da turma
            var formadoresDaTurma = await _context.TurmaModulos
                .Where(tm => tm.TurmaId == turmaId && tm.FormadorId != null)
                .Select(tm => new { tm.FormadorId, tm.Formador.User.Nome, tm.Formador.User.Avatar })
                .Distinct()
                .ToListAsync();

            var resultado = new List<FormadorDisponibilidadeDto>();

            foreach (var f in formadoresDaTurma)
            {
                var dto = new FormadorDisponibilidadeDto
                {
                    FormadorId = (int)f.FormadorId!,
                    FormadorNome = f.Nome ?? "Sem Nome",
                    Avatar = f.Avatar,
                    Disponivel = false,
                    MotivoIndisponibilidade = "Sem disponibilidade definida."
                };

                // --- PASSO 1: Verificar Bloqueios Explícitos (Vermelhos) ---
                // Se tiver marcado "Indisponível" (ex: Médico) em qualquer parte deste horário, falha logo.
                bool temBloqueio = await _context.Disponibilidades
                    .AnyAsync(d => d.FormadorId == f.FormadorId
                                && d.Disponivel == false
                                && d.DataInicio < end
                                && d.DataFim > start);

                if (temBloqueio)
                {
                    dto.MotivoIndisponibilidade = "Marcado como Indisponível (Agenda Pessoal).";
                    resultado.Add(dto);
                    continue; // Passa ao próximo formador
                }

                // --- PASSO 2: Verificar Aulas Existentes (Conflitos) ---
                bool temAula = await _context.Sessoes
                    .Include(s => s.TurmaModulo)
                    .AnyAsync(s => s.TurmaModulo.FormadorId == f.FormadorId
                                && s.HorarioInicio < end
                                && s.HorarioFim > start);

                if (temAula)
                {
                    dto.MotivoIndisponibilidade = "Já tem aula marcada neste horário.";
                    resultado.Add(dto);
                    continue;
                }

                // --- PASSO 3: Algoritmo de Cobertura (Costurar Blocos) ---
                // Vamos buscar todos os blocos "Verdes" que intersectam o horário pedido
                var blocosDisponiveis = await _context.Disponibilidades
                    .Where(d => d.FormadorId == f.FormadorId
                             && d.Disponivel == true
                             && d.DataInicio < end
                             && d.DataFim > start)
                    .OrderBy(d => d.DataInicio)
                    .ToListAsync();

                if (!blocosDisponiveis.Any())
                {
                    resultado.Add(dto); // Motivo mantém-se "Sem disponibilidade definida"
                    continue;
                }

                // Algoritmo: Verificar se os blocos cobrem o intervalo [start, end] continuamente
                DateTime cobertoAte = start;

                foreach (var bloco in blocosDisponiveis)
                {
                    // Se o bloco começa depois de onde já cobrimos, há um buraco!
                    // Ex: Cobrimos até 10:00, mas o próximo bloco só começa às 10:30.
                    if (bloco.DataInicio > cobertoAte)
                        break;

                    // Estendemos a cobertura até ao fim deste bloco (se ele for mais longe)
                    if (bloco.DataFim > cobertoAte)
                        cobertoAte = bloco.DataFim;

                    // Se já cobrimos tudo até ao fim da aula, podemos parar
                    if (cobertoAte >= end)
                        break;
                }

                // Se a nossa "agulha" conseguiu chegar ao fim do horário, está disponível!
                if (cobertoAte >= end)
                {
                    dto.Disponivel = true;
                    dto.MotivoIndisponibilidade = "";
                }
                else
                {
                    dto.MotivoIndisponibilidade = "Disponibilidade parcial (não cobre o horário todo).";
                }

                resultado.Add(dto);
            }

            return resultado;
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