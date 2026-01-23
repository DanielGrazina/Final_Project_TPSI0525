using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class Avaliacao
    {
        public int Id { get; set; }

        public int InscricaoId { get; set; }
        public Inscricao? Inscricao { get; set; }

        public int TurmaModuloId { get; set; }
        public TurmaModulo? TurmaModulo { get; set; }

        public string NotaAvaliacao { get; set; } = string.Empty;
    }
}