using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace SecManagement_API.DTOs
{
    public class FormandoDto
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int? CursoAtualId { get; set; }

        public bool TemFoto { get; set; }
        public bool TemDocumento { get; set; }
    }

    public class CreateFormandoDto
    {
        [Required]
        public string Nome { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public int? CursoAtualId { get; set; }

        public IFormFile? Foto { get; set; }
        public IFormFile? Documento { get; set; }
    }

    public class FileDownloadDto
    {
        public byte[] Content { get; set; } = Array.Empty<byte>();
        public string ContentType { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
    }
}