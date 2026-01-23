using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecManagement_API.Models
{
    public class Formador
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        public string AreaEspecializacao { get; set; } = string.Empty;
        public string CorCalendario { get; set; } = "#3788d8"; // Ex: Hex code

        // public ICollection<TurmaModulo> ModulosAtribuidos { get; set; }
    }
}