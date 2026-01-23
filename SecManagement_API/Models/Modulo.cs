using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class Modulo
    {
        public int Id { get; set; }

        [Required]
        public string Nome { get; set; } = string.Empty;

        public int CargaHoraria { get; set; }
        public string Nivel { get; set; } = string.Empty;

        public ICollection<TurmaModulo> TurmaModulos { get; set; } = new List<TurmaModulo>();
    }
}