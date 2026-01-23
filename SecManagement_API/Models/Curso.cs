using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class Curso
    {
        public int Id { get; set; }

        [Required]
        public string Nome { get; set; } = string.Empty; // Ex: TESP Programação

        public string NivelCurso { get; set; } = string.Empty; // Ex: 5, 4

        public int AreaId { get; set; }
        public Area? Area { get; set; }

        public ICollection<Turma> Turmas { get; set; } = new List<Turma>();
    }
}