using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.DTOs
{
    public class SessaoDto
    {
        public int Id { get; set; }

        public int TurmaModuloId { get; set; }
        public string ModuloNome { get; set; } = string.Empty;
        public string FormadorNome { get; set; } = string.Empty;
        public string TurmaNome { get; set; } = string.Empty;

        public int SalaId { get; set; }
        public string SalaNome { get; set; } = string.Empty;

        public DateTime HorarioInicio { get; set; }
        public DateTime HorarioFim { get; set; }
    }

    public class CreateSessaoDto
    {
        [Required]
        public int TurmaModuloId { get; set; }

        [Required]
        public int SalaId { get; set; }

        [Required]
        public DateTime HorarioInicio { get; set; }

        [Required]
        public DateTime HorarioFim { get; set; }
    }
}