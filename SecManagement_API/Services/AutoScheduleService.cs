using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class AutoScheduleService : IAutoScheduleService
    {
        private readonly AppDbContext _context;

        public AutoScheduleService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<AutoScheduleResultDto> GenerateAsync(AutoScheduleRequestDto request)
        {
            var result = new AutoScheduleResultDto();

            // 1. Carregar turma e validar
            var turma = await _context.Turmas
                .Include(t => t.Curso)
                .FirstOrDefaultAsync(t => t.Id == request.TurmaId);

            if (turma == null)
                throw new Exception("Turma não encontrada.");

            // 2. Carregar TurmaModulos ordenados por Sequência
            var turmaModulos = await _context.TurmaModulos
                .Include(tm => tm.Modulo)
                .Include(tm => tm.Formador).ThenInclude(f => f.User)
                .Where(tm => tm.TurmaId == request.TurmaId)
                .OrderBy(tm => tm.Sequencia)
                .ToListAsync();

            if (!turmaModulos.Any())
                throw new Exception("A turma não tem módulos configurados. Configure os módulos primeiro.");

            // 3. Carregar todas as salas disponíveis (para fallback)
            var salas = await _context.Salas.ToListAsync();
            if (!salas.Any())
                throw new Exception("Não existem salas registadas no sistema.");

            // 4. Normalizar data de início para UTC
            var dataAtual = DateTime.SpecifyKind(request.DataInicio.Date, DateTimeKind.Utc);

            // 5. Para cada TurmaModulo, gerar sessões
            foreach (var tm in turmaModulos)
            {
                if (tm.Modulo == null) continue;

                var moduloResult = new AutoScheduleModuloResultDto
                {
                    ModuloNome = tm.Modulo.Nome,
                    FormadorNome = tm.Formador?.User?.Nome ?? "Sem Formador",
                    HorasTotais = tm.Modulo.CargaHoraria,
                    HorasAgendadas = 0,
                    Completo = false
                };

                // Calcular horas já agendadas para este TurmaModulo
                var sessoesExistentes = await _context.Sessoes
                    .Where(s => s.TurmaModuloId == tm.Id)
                    .ToListAsync();

                double horasJaAgendadas = sessoesExistentes
                    .Sum(s => (s.HorarioFim - s.HorarioInicio).TotalHours);

                double horasRestantes = tm.Modulo.CargaHoraria - horasJaAgendadas;

                if (horasRestantes <= 0)
                {
                    moduloResult.HorasAgendadas = horasJaAgendadas;
                    moduloResult.Completo = true;
                    result.Modulos.Add(moduloResult);
                    continue;
                }

                // Tentativas: até 365 dias no futuro (safety limit)
                int maxDias = 365;
                int diasTentados = 0;

                while (horasRestantes > 0.01 && diasTentados < maxDias)
                {
                    // Saltar fins de semana (while loop para caso de edge cases)
                    while (dataAtual.DayOfWeek == DayOfWeek.Saturday ||
                           dataAtual.DayOfWeek == DayOfWeek.Sunday)
                    {
                        dataAtual = dataAtual.AddDays(1);
                        diasTentados++;
                    }

                    // Gerar blocos horários para este dia
                    var blocos = GerarBlocosDia(dataAtual, request);

                    foreach (var bloco in blocos)
                    {
                        if (horasRestantes <= 0) break;

                        // Ajustar duração se restam menos horas que o bloco completo
                        var duracaoBloco = (bloco.Fim - bloco.Inicio).TotalHours;
                        DateTime fimEfetivo = bloco.Fim;

                        if (horasRestantes < duracaoBloco)
                        {
                            fimEfetivo = bloco.Inicio.AddHours(horasRestantes);
                        }

                        // Tentar alocar sala
                        int? salaIdEscolhida = await EncontrarSalaDisponivel(
                            salas, bloco.Inicio, fimEfetivo);

                        if (salaIdEscolhida == null)
                        {
                            // Nenhuma sala disponível neste bloco
                            continue;
                        }

                        // Verificar disponibilidade do formador
                        bool formadorDisponivel = await VerificarFormadorDisponivel(
                            tm.FormadorId, bloco.Inicio, fimEfetivo);

                        if (!formadorDisponivel)
                        {
                            continue; // Formador ocupado neste bloco
                        }

                        // Guard final: nunca agendar ao fim de semana
                        if (bloco.Inicio.DayOfWeek == DayOfWeek.Saturday ||
                            bloco.Inicio.DayOfWeek == DayOfWeek.Sunday)
                        {
                            continue;
                        }

                        // ✅ Tudo OK — Criar sessão
                        var sessao = new Sessao
                        {
                            TurmaModuloId = tm.Id,
                            SalaId = salaIdEscolhida.Value,
                            HorarioInicio = bloco.Inicio,
                            HorarioFim = fimEfetivo
                        };

                        _context.Sessoes.Add(sessao);
                        await _context.SaveChangesAsync();

                        double horasSessao = (fimEfetivo - bloco.Inicio).TotalHours;
                        horasRestantes = Math.Round(horasRestantes - horasSessao, 2);
                        moduloResult.HorasAgendadas += horasSessao;

                        // Mapear para DTO de retorno
                        var sala = salas.First(s => s.Id == salaIdEscolhida.Value);
                        result.SessoesCriadas.Add(new SessaoDto
                        {
                            Id = sessao.Id,
                            TurmaModuloId = tm.Id,
                            ModuloNome = tm.Modulo.Nome,
                            FormadorNome = tm.Formador?.User?.Nome ?? "N/A",
                            TurmaNome = turma.Nome,
                            SalaId = sessao.SalaId,
                            SalaNome = sala.Nome,
                            HorarioInicio = sessao.HorarioInicio,
                            HorarioFim = sessao.HorarioFim
                        });
                    }

                    dataAtual = dataAtual.AddDays(1);
                    diasTentados++;
                }

                if (horasRestantes > 0)
                {
                    result.Avisos.Add(
                        $"Módulo '{tm.Modulo.Nome}': só foi possível agendar " +
                        $"{moduloResult.HorasAgendadas:F1}h de {tm.Modulo.CargaHoraria}h. " +
                        $"Faltam {horasRestantes:F1}h (sem slots disponíveis).");
                }

                moduloResult.Completo = horasRestantes <= 0;
                moduloResult.HorasAgendadas += horasJaAgendadas;
                result.Modulos.Add(moduloResult);
            }

            result.TotalSessoesCriadas = result.SessoesCriadas.Count;
            result.TotalHorasAgendadas = (int)result.SessoesCriadas
                .Sum(s => (s.HorarioFim - s.HorarioInicio).TotalHours);

            return result;
        }

        /// <summary>
        /// Gera os blocos horários de um dia de trabalho (manhã + tarde, excluindo almoço).
        /// </summary>
        private List<(DateTime Inicio, DateTime Fim)> GerarBlocosDia(
            DateTime data, AutoScheduleRequestDto config)
        {
            var blocos = new List<(DateTime Inicio, DateTime Fim)>();

            // Bloco da manhã: HoraInicioDia até HoraInicioAlmoco
            if (config.HoraInicioDia < config.HoraInicioAlmoco)
            {
                var inicioManha = data.AddHours(config.HoraInicioDia);
                var fimManha = data.AddHours(config.HoraInicioAlmoco);

                // Dividir em sub-blocos se necessário (conforme DuracaoSessaoHoras)
                var subBlocos = DividirEmSessoes(inicioManha, fimManha, config.DuracaoSessaoHoras);
                blocos.AddRange(subBlocos);
            }

            // Bloco da tarde: HoraFimAlmoco até HoraFimDia
            if (config.HoraFimAlmoco < config.HoraFimDia)
            {
                var inicioTarde = data.AddHours(config.HoraFimAlmoco);
                var fimTarde = data.AddHours(config.HoraFimDia);

                var subBlocos = DividirEmSessoes(inicioTarde, fimTarde, config.DuracaoSessaoHoras);
                blocos.AddRange(subBlocos);
            }

            return blocos;
        }

        /// <summary>
        /// Divide um período em sessões de duração máxima indicada.
        /// </summary>
        private List<(DateTime Inicio, DateTime Fim)> DividirEmSessoes(
            DateTime inicio, DateTime fim, int duracaoMaxHoras)
        {
            var sessoes = new List<(DateTime, DateTime)>();
            var cursor = inicio;

            while (cursor < fim)
            {
                var fimSessao = cursor.AddHours(duracaoMaxHoras);
                if (fimSessao > fim) fimSessao = fim;

                sessoes.Add((cursor, fimSessao));
                cursor = fimSessao;
            }

            return sessoes;
        }

        /// <summary>
        /// Encontra a primeira sala sem conflitos no intervalo indicado.
        /// </summary>
        private async Task<int?> EncontrarSalaDisponivel(
            List<Sala> salas, DateTime inicio, DateTime fim)
        {
            foreach (var sala in salas)
            {
                // Verificar bloqueios manuais (indisponibilidades)
                bool salaBloqueada = await _context.Disponibilidades
                    .AnyAsync(d => d.SalaId == sala.Id
                        && d.Disponivel == false
                        && d.DataInicio < fim
                        && d.DataFim > inicio);

                if (salaBloqueada) continue;

                // Verificar sessões existentes (overlap)
                bool salaOcupada = await _context.Sessoes
                    .AnyAsync(s => s.SalaId == sala.Id
                        && s.HorarioInicio < fim
                        && s.HorarioFim > inicio);

                if (salaOcupada) continue;

                return sala.Id; // Primeira sala livre
            }

            return null; // Nenhuma sala disponível
        }

        /// <summary>
        /// Verifica se o formador está disponível no intervalo indicado.
        /// </summary>
        private async Task<bool> VerificarFormadorDisponivel(
            int formadorId, DateTime inicio, DateTime fim)
        {
            // 1. Verificar bloqueios manuais
            bool formadorBloqueado = await _context.Disponibilidades
                .AnyAsync(d => d.FormadorId == formadorId
                    && d.Disponivel == false
                    && d.DataInicio < fim
                    && d.DataFim > inicio);

            if (formadorBloqueado) return false;

            // 2. Verificar sessões existentes
            bool formadorOcupado = await (
                from s in _context.Sessoes
                join tm in _context.TurmaModulos on s.TurmaModuloId equals tm.Id
                where tm.FormadorId == formadorId
                      && s.HorarioInicio < fim
                      && s.HorarioFim > inicio
                select s.Id
            ).AnyAsync();

            if (formadorOcupado) return false;

            return true;
        }
    }
}
