using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class Curso
    {
        public int Id { get; set; }

        [Required]
        public string Nome { get; set; } = string.Empty;

        public string Area { get; set; } = string.Empty;
        public DateTime DataInicio { get; set; }
        public DateTime DataFim { get; set; }
        public bool IsAtivo { get; set; } = true;

        // Relações
        public ICollection<CursoModulo> CursoModulos { get; set; } = new List<CursoModulo>();
        public ICollection<Formando> Formandos { get; set; } = new List<Formando>();
    }
}