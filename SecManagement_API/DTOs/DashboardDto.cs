namespace SecManagement_API.DTOs
{
    public class DashboardStatsDto
    {
        public int TotalCursosTerminados { get; set; }
        public int TotalCursosDecorrer { get; set; }
        public int TotalFormandosAtivos { get; set; }
        public List<CursosPorAreaDto> CursosPorArea { get; set; } = new();
        public List<TopFormadorDto> TopFormadores { get; set; } = new();

        // Requisito 1.j – Cursos/turmas a iniciar nos próximos 60 dias
        public List<CursoProximoDto> CursosProximos60Dias { get; set; } = new();
    }

    public class CursosPorAreaDto
    {
        public string Area { get; set; } = string.Empty;
        public int Quantidade { get; set; }
    }

    public class TopFormadorDto
    {
        public string Nome { get; set; } = string.Empty;
        public double TotalHoras { get; set; }
    }

    /// <summary>
    /// Turma cujo DataInicio se situa nos próximos 60 dias.
    /// </summary>
    public class CursoProximoDto
    {
        public int TurmaId { get; set; }
        public string TurmaNome { get; set; } = string.Empty;
        public string CursoNome { get; set; } = string.Empty;
        public string Area { get; set; } = string.Empty;
        public DateTime DataInicio { get; set; }
        public int DiasRestantes { get; set; }
    }
}