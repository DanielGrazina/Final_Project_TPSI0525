namespace SecManagement_API.DTOs
{
    public class FormandoSearchDto
    {
        public int UserId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string NumeroAluno { get; set; } = string.Empty;
        public string TurmaNome { get; set; } = string.Empty;
        public string CursoNome { get; set; } = string.Empty;
    }
}
