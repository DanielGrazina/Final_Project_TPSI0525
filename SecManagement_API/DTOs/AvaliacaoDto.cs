using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.DTOs
{
    public class AvaliacaoDto
    {
        public int Id { get; set; }

        public int TurmaId { get; set; }
        public string TurmaNome { get; set; } = string.Empty;

        public int InscricaoId { get; set; }
        public string FormandoNome { get; set; } = string.Empty;

        public int TurmaModuloId { get; set; }
        public string ModuloNome { get; set; } = string.Empty;

        public decimal Avaliacao { get; set; }
        public string Observacoes { get; set; } = string.Empty;
    }

    public class CreateAvaliacaoDto
    {
        [Required]
        public int TurmaId { get; set; }

        [Required]
        public int InscricaoId { get; set; }

        [Required]
        public int TurmaModuloId { get; set; }

        [Range(0, 20)]
        public decimal Avaliacao { get; set; }

        public string Observacoes { get; set; } = string.Empty;
    }
}