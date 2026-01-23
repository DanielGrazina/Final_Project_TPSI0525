using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class Sala
    {
        public int Id { get; set; }

        [Required]
        public string Nome { get; set; } = string.Empty;

        public int Capacidade { get; set; }
        public string Tipo { get; set; } = "Normal"; 
    }
}