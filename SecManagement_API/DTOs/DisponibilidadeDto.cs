using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.DTOs
{
    public class DisponibilidadeDto
    {
        public int Id { get; set; }
        public string TipoEntidade { get; set; } = string.Empty;

        public int? FormadorId { get; set; }
        public string? FormadorNome { get; set; }

        public int? SalaId { get; set; }
        public string? SalaNome { get; set; }

        public DateTime DataInicio { get; set; }
        public DateTime DataFim { get; set; }
        public bool Disponivel { get; set; } // true = Livre, false = Ocupado/Manutenção
    }

    public class CreateDisponibilidadeDto
    {
        [Required]
        public int EntidadeId { get; set; }

        [Required]
        [RegularExpression("Formador|Sala", ErrorMessage = "O tipo deve ser 'Formador' ou 'Sala'.")]
        public string TipoEntidade { get; set; } = string.Empty;

        public int? FormadorId { get; set; }
        public int? SalaId { get; set; }

        [Required]
        public DateTime DataInicio { get; set; }

        [Required]
        public DateTime DataFim { get; set; }

        public bool Disponivel { get; set; } = true;
    }
}