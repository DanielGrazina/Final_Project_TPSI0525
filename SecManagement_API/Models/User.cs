using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        public string? GoogleId { get; set; }
        public string? FacebookId { get; set; }

        public string? Avatar { get; set; }
        public string? Telefone { get; set; }
        public string? NIF { get; set; }
        public string? Morada { get; set; }
        public string? CC { get; set; }

        public bool IsActive { get; set; } = false;
        public string? ActivationToken { get; set; }
        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpires { get; set; }

        public string Role { get; set; } = "User";

        public string? TwoFactorSecret { get; set; }
        public bool IsTwoFactorEnabled { get; set; }

        public Formador? FormadorProfile { get; set; }
        public Formando? FormandoProfile { get; set; }
        public ICollection<UserFicheiro> Ficheiros { get; set; } = new List<UserFicheiro>();
    }
}