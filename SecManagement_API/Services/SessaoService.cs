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
            // Normalizar horários para UTC (consistência)
            var inicioUtc = dto.HorarioInicio.ToUniversalTime();
            var fimUtc = dto.HorarioFim.ToUniversalTime();

            // Validações Básicas de Data
            if (fimUtc <= inicioUtc)
                throw new Exception("A hora de fim tem de ser superior à de início.");

            // Carregar dados do Módulo/Turma para saber quem é o Formador
            var turmaModulo = await _context.TurmaModulos
                .Include(tm => tm.Modulo)
                .Include(tm => tm.Turma)
                .Include(tm => tm.Formador).ThenInclude(f => f.User)
                .FirstOrDefaultAsync(tm => tm.Id == dto.TurmaModuloId);

            if (turmaModulo == null) throw new Exception("Módulo da turma não encontrado.");
            if (turmaModulo.Modulo == null) throw new Exception("Erro de integridade: Módulo não existe.");

            double horasNovaSessao = (fimUtc - inicioUtc).TotalHours;

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

            // 1) CONFLITOS DE INDISPONIBILIDADE (bloqueios manuais)
            bool salaBloqueada = await _context.Disponibilidades
                .AnyAsync(d => d.SalaId == dto.SalaId
                    && d.Disponivel == false
                    && d.DataInicio < fimUtc
                    && d.DataFim > inicioUtc);

            if (salaBloqueada)
                throw new Exception("A Sala está marcada como indisponível (Manutenção/Outro) neste horário.");

            bool formadorBloqueado = await _context.Disponibilidades
                .AnyAsync(d => d.FormadorId == formadorId
                    && d.Disponivel == false
                    && d.DataInicio < fimUtc
                    && d.DataFim > inicioUtc);

            if (formadorBloqueado)
                throw new Exception($"O formador {turmaModulo.Formador?.User?.Nome} está indisponível (Férias/Ausência) neste horário.");

            // 2) CONFLITOS DE OVERLAP COM OUTRAS SESSÕES (isto é o bug!)
            bool salaOcupada = await _context.Sessoes.AnyAsync(s =>
                s.SalaId == dto.SalaId &&
                s.HorarioInicio < fimUtc &&
                s.HorarioFim > inicioUtc
            );

            if (salaOcupada)
                throw new Exception("Não é possível agendar: a sala já tem uma sessão marcada nesse horário.");

            // Como Sessao não tem FormadorId direto, vamos buscar pelo TurmaModulo
            bool formadorOcupado = await (
                from s in _context.Sessoes
                join tm in _context.TurmaModulos on s.TurmaModuloId equals tm.Id
                where tm.FormadorId == formadorId
                      && s.HorarioInicio < fimUtc
                      && s.HorarioFim > inicioUtc
                select s.Id
            ).AnyAsync();

            if (formadorOcupado)
                throw new Exception($"Não é possível agendar: o formador {turmaModulo.Formador?.User?.Nome} já tem sessão nesse horário.");

            // Criar Sessão
            var sessao = new Sessao
            {
                TurmaModuloId = dto.TurmaModuloId,
                SalaId = dto.SalaId,
                HorarioInicio = inicioUtc,
                HorarioFim = fimUtc
            };

            _context.Sessoes.Add(sessao);
            await _context.SaveChangesAsync();

            // Retorno
            var sala = await _context.Salas.FindAsync(dto.SalaId);
            return MapToDto(sessao, turmaModulo, sala);
        }

        public async Task<IEnumerable<SessaoDto>> GetHorarioTurmaAsync(int turmaId, DateTime start, DateTime end)
        {
            var startUtc = start.ToUniversalTime();
            var endUtc = end.ToUniversalTime();

            var sessoes = await _context.Sessoes
                .Include(s => s.Sala)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Modulo)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Turma)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Formador).ThenInclude(f => f.User)
                .Where(s =>
                    s.TurmaModulo.TurmaId == turmaId &&
                    s.HorarioInicio < endUtc &&
                    s.HorarioFim > startUtc
                )
                .OrderBy(s => s.HorarioInicio)
                .ToListAsync();

            return sessoes.Select(s => MapToDto(s, s.TurmaModulo, s.Sala));
        }

        public async Task<IEnumerable<SessaoDto>> GetHorarioFormadorAsync(int formadorId, DateTime start, DateTime end)
        {
            var startUtc = start.ToUniversalTime();
            var endUtc = end.ToUniversalTime();

            var sessoes = await _context.Sessoes
                .Include(s => s.Sala)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Modulo)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Turma)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Formador).ThenInclude(f => f.User)
                .Where(s =>
                    s.TurmaModulo.FormadorId == formadorId &&
                    s.HorarioInicio < endUtc &&
                    s.HorarioFim > startUtc
                )
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

        public async Task<IEnumerable<SessaoDto>> GetSessoesByDateAsync(DateTime date)
        {
            var targetDate = date.Date;

            var sessoes = await _context.Sessoes
                .Include(s => s.Sala)
                .Include(s => s.TurmaModulo)
                    .ThenInclude(tm => tm!.Turma)
                .Include(s => s.TurmaModulo)
                    .ThenInclude(tm => tm!.Modulo)
                .Include(s => s.TurmaModulo)
                    .ThenInclude(tm => tm!.Formador)
                        .ThenInclude(f => f!.User)
                .Where(s => s.HorarioInicio.Date == targetDate)
                .OrderBy(s => s.HorarioInicio)
                .ToListAsync();

            return sessoes.Select(s => new SessaoDto
            {
                Id = s.Id,
                TurmaModuloId = s.TurmaModuloId,
                SalaId = s.SalaId,
                SalaNome = s.Sala?.Nome ?? "Sem Sala",
                TurmaNome = s.TurmaModulo?.Turma?.Nome ?? "Sem Turma",
                ModuloNome = s.TurmaModulo?.Modulo?.Nome ?? "Sem Módulo",
                FormadorNome = s.TurmaModulo?.Formador?.User?.Nome ?? "Sem Formador",
                HorarioInicio = s.HorarioInicio,
                HorarioFim = s.HorarioFim
            });
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
            var startUtc = start.ToUniversalTime();
            var endUtc = end.ToUniversalTime();

            var sessoes = await _context.Sessoes
                .Include(s => s.Sala)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Modulo)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Turma)
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Formador).ThenInclude(f => f.User)
                .Where(s =>
                    s.SalaId == salaId &&
                    s.HorarioInicio < endUtc &&
                    s.HorarioFim > startUtc
                )
                .OrderBy(s => s.HorarioInicio)
                .ToListAsync();

            return sessoes.Select(s => MapToDto(s, s.TurmaModulo, s.Sala));
        }


    }
}