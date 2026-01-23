using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecManagement_API.Models
{
    public class Avaliacao
    {
        public int Id { get; set; }

        public int TurmaId { get; set; }
        public Turma? Turma { get; set; }

        public int InscricaoId { get; set; }
        public Inscricao? Inscricao { get; set; }

        public int TurmaModuloId { get; set; }
        public TurmaModulo? TurmaModulo { get; set; }

        [Column("Avaliacao")]
        public decimal AvaliacaoValor { get; set; }

        public string Observacoes { get; set; } = string.Empty;
    }
}