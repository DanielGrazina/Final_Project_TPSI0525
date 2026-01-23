using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.DTOs
{
    public class UserDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool IsActive { get; set; }

        // public string Nome { get; set; } = string.Empty;

        public bool IsFormador { get; set; }
        public bool IsFormando { get; set; }
    }

    public class UpdateUserDto
    {
        [Required]
        public string Role { get; set; } = string.Empty;

        public bool IsActive { get; set; }

        // public string Nome { get; set; } = string.Empty;
    }
}