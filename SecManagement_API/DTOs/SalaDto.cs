using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.DTOs
{
    public class SalaDto
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public int Capacidade { get; set; }
        public string Tipo { get; set; } = "Normal";
    }

    public class CreateSalaDto
    {
        [Required]
        public string Nome { get; set; } = string.Empty;

        [Range(1, 500)]
        public int Capacidade { get; set; }

        public string Tipo { get; set; } = "Normal";
    }
}