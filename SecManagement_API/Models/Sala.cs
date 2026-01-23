using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class Sala
    {
        public int Id { get; set; }
        [Required]
        public string Nome { get; set; } = string.Empty;
        public string Tipo { get; set; } = "Teorica"; // Enum
        public int Capacidade { get; set; }
    }
}