namespace SecManagement_API.DTOs
{
    public class FormadorDisponibilidadeDto
    {
        public int FormadorId { get; set; }
        public string FormadorNome { get; set; } = string.Empty;
        public string? Avatar { get; set; }
        public bool Disponivel { get; set; }
        public string MotivoIndisponibilidade { get; set; } = string.Empty;
    }
}