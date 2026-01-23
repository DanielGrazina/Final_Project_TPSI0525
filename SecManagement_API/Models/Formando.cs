using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecManagement_API.Models
{
    public class Formando
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        public string NumeroAluno { get; set; } = string.Empty;
        public DateTime DataNascimento { get; set; }

        // public ICollection<Inscricao> Inscricoes { get; set; }
    }
}