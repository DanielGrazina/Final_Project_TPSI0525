namespace SecManagement_API.DTOs
{
    public class DashboardStatsDto
    {
        public int TotalCursosTerminados { get; set; }
        public int TotalCursosDecorrer { get; set; }
        public int TotalFormandosAtivos { get; set; }
        public List<CursosPorAreaDto> CursosPorArea { get; set; } = new();
        public List<TopFormadorDto> TopFormadores { get; set; } = new();
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
}