using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecManagement_API.Models
{
    [Table("users")]
    public class User
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [EmailAddress]
        [Column("email")]
        public string Email { get; set; } = string.Empty;

        [Column("passwordhash")]
        public string? PasswordHash { get; set; }

        [Column("googleid")]
        public string? GoogleId { get; set; }

        [Column("facebookid")]
        public string? FacebookId { get; set; }

        [Column("isactive")]
        public bool IsActive { get; set; } = false;

        [Required]
        [Column("role")]
        public string Role { get; set; } = "Formando";

        [Column("avatarurl")]
        public string? AvatarUrl { get; set; }

        [Column("nome")]
        public string Nome { get; set; } = string.Empty;

        [Column("telefone")]
        public string? Telefone { get; set; }

        [Column("nif")]
        public string? Nif { get; set; }

        [Column("morada")]
        public string? Morada { get; set; }

        [Column("cc")]
        public string? Cc { get; set; }

        [Column("resettoken")]
        public string? ResetToken { get; set; }

        [Column("resettokenexpiry")]
        public DateTime? ResetTokenExpiry { get; set; }

        [Column("twofactorsecret")]
        public string? TwoFactorSecret { get; set; }

        [Column("twofactorenabled")]
        public bool TwoFactorEnabled { get; set; } = false;

        [Column("createdat")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}