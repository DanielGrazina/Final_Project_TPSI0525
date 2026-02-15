using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class StatsService : IStatsService
    {
        private readonly AppDbContext _context;

        public StatsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DashboardStatsDto> GetDashboardStatsAsync()
        {
            var stats = new DashboardStatsDto();

            // Totais de Cursos
            stats.TotalCursosTerminados = await _context.Turmas
                .CountAsync(t => t.Estado == "Terminada");

            stats.TotalCursosDecorrer = await _context.Turmas
                .CountAsync(t => t.Estado == "Decorrer");

            // Formandos Ativos
            stats.TotalFormandosAtivos = await _context.Inscricoes
                .CountAsync(i => i.Estado == "Ativo");

            // Cursos por Área
            stats.CursosPorArea = await _context.Cursos
                .GroupBy(c => c.Area != null ? c.Area.Nome : "Sem Área")
                .Select(g => new CursosPorAreaDto
                {
                    Area = g.Key,
                    Quantidade = g.Count()
                })
                .ToListAsync();


            // Top 10 Formadores (Cálculo Otimizado DB)
            // Agrupa por nome e soma a diferenla de horas diretamente no SQL
            stats.TopFormadores = await _context.Sessoes
                .Where(s => s.TurmaModulo.Formador.User.Nome != null)
                .GroupBy(s => s.TurmaModulo.Formador.User.Nome)
                .Select(g => new TopFormadorDto
                { 
                    Nome = g.Key,
                    TotalHoras = g.Sum(s => (s.HorarioFim - s.HorarioInicio).TotalHours)
                })
                .OrderByDescending(x => x.TotalHoras)
                .Take(10)
                .ToListAsync();

            // Requisito 1.j – Cursos/turmas a iniciar nos próximos 60 dias
            // Npgsql exige DateTimes UTC para colunas timestamptz
            var hoje = DateTime.UtcNow.Date;
            var limite = hoje.AddDays(60);

            // 1) Materializa da BD (só filtro + projeção simples)
            var turmasProximas = await _context.Turmas
                .Where(t => t.DataInicio >= hoje && t.DataInicio <= limite)
                .OrderBy(t => t.DataInicio)
                .Select(t => new
                {
                    t.Id,
                    t.Nome,
                    CursoNome = t.Curso != null ? t.Curso.Nome : "",
                    Area      = t.Curso != null && t.Curso.Area != null ? t.Curso.Area.Nome : "Sem Área",
                    t.DataInicio
                })
                .ToListAsync();

            // 2) Calcula DiasRestantes no C# (evita problemas de tradução SQL)
            stats.CursosProximos60Dias = turmasProximas
                .Select(t => new CursoProximoDto
                {
                    TurmaId       = t.Id,
                    TurmaNome     = t.Nome,
                    CursoNome     = t.CursoNome,
                    Area          = t.Area,
                    DataInicio    = t.DataInicio,
                    DiasRestantes = (t.DataInicio.Date - hoje).Days
                })
                .ToList();

            return stats;
        }
    }
}