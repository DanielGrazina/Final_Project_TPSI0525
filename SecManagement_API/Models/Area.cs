using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class Area
    {
        public int Id { get; set; }

        [Required]
        public string Nome { get; set; } = string.Empty; // Ex: Informática, Mecatrónica

        public ICollection<Curso> Cursos { get; set; } = new List<Curso>();
    }
}