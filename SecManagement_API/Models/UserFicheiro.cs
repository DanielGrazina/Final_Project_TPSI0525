using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.Models
{
    public class UserFicheiro
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        public byte[] Ficheiro { get; set; } = Array.Empty<byte>();

        public string NomeFicheiro { get; set; } = string.Empty; // ex: "cv.pdf"
        public string ContentType { get; set; } = string.Empty;  // ex: "application/pdf"
    }
}