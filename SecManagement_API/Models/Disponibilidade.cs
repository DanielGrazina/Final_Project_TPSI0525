using System.ComponentModel.DataAnnotations.Schema;

namespace SecManagement_API.Models
{
    public class Disponibilidade
    {
        public int Id { get; set; }

        public int? FormadorId { get; set; }
        public Formador? Formador { get; set; }

        public int? SalaId { get; set; }
        public Sala? Sala { get; set; }

        public string TipoEntidade { get; set; } = string.Empty;

        public int EntidadeId { get; set; }

        public DateTime DataInicio { get; set; }
        public DateTime DataFim { get; set; }

        public bool? Disponivel { get; set; } = true;
    }
}