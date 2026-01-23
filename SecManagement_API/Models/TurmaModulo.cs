using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class TurmaModulo
    {
        public int Id { get; set; }
        public int TurmaId { get; set; }
        public Turma? Turma { get; set; }

        public int ModuloId { get; set; }
        public Modulo? Modulo { get; set; }

        public int FormadorId { get; set; }
        public Formador? Formador { get; set; }

        public int Sequencia { get; set; } // Ordem do módulo na turma (1º, 2º, etc)

        public ICollection<Avaliacao> Avaliacoes { get; set; } = new List<Avaliacao>();
        public ICollection<Sessao> Sessoes { get; set; } = new List<Sessao>();
    }
}