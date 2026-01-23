using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class Formador
    {
        public int Id { get; set; }

        [Required]
        public string Nome { get; set; } = string.Empty;

        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public byte[]? FotoContent { get; set; }
        public string? FotoContentType { get; set; }
        public string? FotoFileName { get; set; }

        public byte[]? CVContent { get; set; }
        public string? CVContentType { get; set; }
        public string? CVFileName { get; set; }

        public int? UserId { get; set; }
        public User? User { get; set; }

        public ICollection<CursoModulo> ModulosLecionados { get; set; } = new List<CursoModulo>();
    }
}