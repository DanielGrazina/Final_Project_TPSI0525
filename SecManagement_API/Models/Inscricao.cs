using System.ComponentModel.DataAnnotations.Schema;

namespace SecManagement_API.Models
{
    public class Inscricao
    {
        public int Id { get; set; }

        public int? TurmaId { get; set; } 
        public Turma? Turma { get; set; }

        public int CursoId { get; set; }
        public Curso? Curso { get; set; }

        public int FormandoId { get; set; }
        public Formando? Formando { get; set; }

        public DateTime DataInscricao { get; set; } = DateTime.UtcNow;
        public string Estado { get; set; } = "Candidatura";
    }
}