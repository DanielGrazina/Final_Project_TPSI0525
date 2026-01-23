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
                .Include(c => c.Area)
                .GroupBy(c => c.Area.Nome)
                .Select(g => new CursosPorAreaDto
                {
                    Area = g.Key,
                    Quantidade = g.Count()
                })
                .ToListAsync();


            // Top 10 Formadores (Cálculo em Memória para evitar erro de SQL)
            // Buscar todas as sessões com os formadores
            var todasSessoes = await _context.Sessoes
                .Include(s => s.TurmaModulo).ThenInclude(tm => tm.Formador).ThenInclude(f => f.User)
                .ToListAsync(); // Traz para a memória do servidor

            // Agrupar e Calcular em C# (Muito mais seguro)
            var topCalc = todasSessoes
                // Filtro de segurança para não dar erro se faltar user
                .Where(s => s.TurmaModulo?.Formador?.User?.Nome != null)
                .GroupBy(s => s.TurmaModulo!.Formador!.User!.Nome)
                .Select(g => new
                {
                    Nome = g.Key,
                    // Subtração simples de datas em C#
                    Horas = g.Sum(s => (s.HorarioFim - s.HorarioInicio).TotalHours)
                })
                .OrderByDescending(x => x.Horas)
                .Take(10)
                .ToList();

            // Mapear para o DTO final
            stats.TopFormadores = topCalc.Select(t => new TopFormadorDto
            {
                Nome = t.Nome,
                TotalHoras = t.Horas
            }).ToList();

            return stats;
        }
    }
}