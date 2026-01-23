using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class Sessao
    {
        public int Id { get; set; }

        public int TurmaModuloId { get; set; }
        public TurmaModulo? TurmaModulo { get; set; }

        public int SalaId { get; set; }
        public Sala? Sala { get; set; }

        public DateTime HorarioInicio { get; set; }
        public DateTime HorarioFim { get; set; }
    }
}