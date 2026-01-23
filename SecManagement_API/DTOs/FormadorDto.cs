using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace SecManagement_API.DTOs
{
    public class FormadorDto
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        public bool TemFoto { get; set; }
        public bool TemCV { get; set; }
    }

    public class CreateFormadorDto
    {
        [Required]
        public string Nome { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public IFormFile? Foto { get; set; }
        public IFormFile? CV { get; set; }
    }
}