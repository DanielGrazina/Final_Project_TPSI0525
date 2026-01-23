using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.DTOs
{
    public class InscricaoDto
    {
        public int Id { get; set; }

        public int FormandoId { get; set; }
        public string FormandoNome { get; set; } = string.Empty;

        public int TurmaId { get; set; }
        public string TurmaNome { get; set; } = string.Empty;

        public DateTime DataInscricao { get; set; }
        public string Estado { get; set; } = string.Empty;
    }

    public class CreateInscricaoDto
    {
        [Required]
        public int FormandoId { get; set; }

        [Required]
        public int TurmaId { get; set; }
    }
}