using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class Turma
    {
        public int Id { get; set; }

        [Required]
        public string Nome { get; set; } = string.Empty; // Ex: "TPSI-PL-1025"

        public DateTime DataInicio { get; set; }
        public DateTime DataFim { get; set; }
        public string Local { get; set; } = string.Empty; // Ex: "Edifício A"
        public string Estado { get; set; } = "Aberta"; // Aberta, A Decorrer, Terminada

        public int CursoId { get; set; }
        public Curso? Curso { get; set; }

        public ICollection<Inscricao> Inscricoes { get; set; } = new List<Inscricao>();
        public ICollection<TurmaModulo> TurmaModulos { get; set; } = new List<TurmaModulo>();
    }
}