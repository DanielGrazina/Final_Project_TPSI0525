using System.ComponentModel.DataAnnotations.Schema;

namespace SecManagement_API.Models
{
    public class Sala
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;

        public TipoSala Tipo { get; set; }

        public int Capacidade { get; set; }
    }
}