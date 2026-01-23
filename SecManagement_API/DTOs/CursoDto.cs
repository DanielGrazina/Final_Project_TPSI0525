using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.DTOs
{
    public class CursoDto
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Area { get; set; } = string.Empty;
        public DateTime DataInicio { get; set; }
        public DateTime DataFim { get; set; }
        public bool IsAtivo { get; set; }
    }

    public class CreateCursoDto
    {
        [Required]
        public string Nome { get; set; } = string.Empty;

        [Required]
        public string Area { get; set; } = string.Empty;

        public DateTime DataInicio { get; set; }
        public DateTime DataFim { get; set; }
    }
}