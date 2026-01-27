using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.DTOs
{
    public class ModuloDto
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public int CargaHoraria { get; set; }
    }

    public class CreateModuloDto
    {
        [Required]
        public string Nome { get; set; } = string.Empty;

        [Range(1, 1000)]
        public int CargaHoraria { get; set; }
    }
}