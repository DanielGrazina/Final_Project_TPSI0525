using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class Formando
    {
        public int Id { get; set; }

        [Required]
        public string Nome { get; set; } = string.Empty;

        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public byte[]? FotoContent { get; set; }
        public string? FotoContentType { get; set; }
        public string? FotoFileName { get; set; }

        public byte[]? DocumentoContent { get; set; }
        public string? DocumentoContentType { get; set; }
        public string? DocumentoFileName { get; set; }

        public int? UserId { get; set; }
        public User? User { get; set; }

        public int? CursoAtualId { get; set; }
        public Curso? CursoAtual { get; set; }
    }
}