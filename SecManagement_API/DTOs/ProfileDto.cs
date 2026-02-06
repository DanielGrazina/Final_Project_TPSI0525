using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace SecManagement_API.DTOs
{
    // --- FICHEIROS ---
    public class UserFicheiroDto
    {
        public int Id { get; set; }
        public string NomeFicheiro { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
    }

    public class UploadFicheiroDto
    {
        [Required]
        public IFormFile Ficheiro { get; set; } = null!;
    }

    // --- FORMADOR ---
    public class FormadorProfileDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }

        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Telefone { get; set; }

        public string AreaEspecializacao { get; set; } = string.Empty;
        public string CorCalendario { get; set; } = string.Empty;

        public List<UserFicheiroDto> Ficheiros { get; set; } = new List<UserFicheiroDto>();
    }

    public class CreateFormadorProfileDto
    {
        [Required]
        public int UserId { get; set; }

        public string AreaEspecializacao { get; set; } = string.Empty;
        public string CorCalendario { get; set; } = "#3788d8";
    }

    // --- FORMANDO ---
    public class FormandoProfileDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;

        public string NumeroAluno { get; set; } = string.Empty;
        public DateTime DataNascimento { get; set; }

        public List<UserFicheiroDto> Ficheiros { get; set; } = new List<UserFicheiroDto>();
    }

    public class CreateFormandoProfileDto
    {
        [Required]
        public int UserId { get; set; }

        [Required]
        public string NumeroAluno { get; set; } = string.Empty;

        public DateTime DataNascimento { get; set; }
    }

    public class UpdateProfileDto
    {
        public string? Telefone { get; set; }
        public string? NIF { get; set; }
        public string? Morada { get; set; }
        public string? CC { get; set; }
    }
}