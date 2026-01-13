using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.DTOs
{
    public class RegisterDto
    {
        [Required(ErrorMessage = "O nome é obrigatório")]
        public string Nome { get; set; } = string.Empty;

        [Required]
        [EmailAddress(ErrorMessage = "Email inválido")]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6, ErrorMessage = "A password deve ter pelo menos 6 caracteres")]
        public string Password { get; set; } = string.Empty;

    }
}