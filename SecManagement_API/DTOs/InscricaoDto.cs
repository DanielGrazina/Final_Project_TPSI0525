namespace SecManagement_API.DTOs
{
    // Usado pelo ALUNO para se candidatar
    public class CreateCandidaturaDto
    {
        public int CursoId { get; set; }
        public int FormandoId { get; set; }
        public string? Telefone { get; set; }
        public string? NIF { get; set; }
        public string? Morada { get; set; }
        public string? CC { get; set; }
    }

    // Usado pelo BACKOFFICE para colocar o aluno na turma
    public class ColocarEmTurmaDto
    {
        public int TurmaId { get; set; }
    }

    // NOVO: Usado pelo ADMIN para aprovar múltiplas candidaturas de uma vez
    public class AprovarLoteDto
    {
        public int TurmaId { get; set; }
        public List<int> InscricaoIds { get; set; } = new();
    }

    // DTO de Leitura atualizado
    public class InscricaoDto
    {
        public int Id { get; set; }
        public int? TurmaId { get; set; }
        public string TurmaNome { get; set; } = "A aguardar colocação";
        public int CursoId { get; set; }
        public string CursoNome { get; set; } = string.Empty;
        public int FormandoId { get; set; }
        public string FormandoNome { get; set; } = string.Empty;
        public DateTime DataInscricao { get; set; }
        public string Estado { get; set; } = string.Empty;
    }
}