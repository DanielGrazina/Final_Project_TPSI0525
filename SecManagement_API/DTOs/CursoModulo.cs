using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.DTOs
{
    public class CursoModuloDto
    {
        public int Id { get; set; }

        public int CursoId { get; set; }
        public string CursoNome { get; set; } = string.Empty;

        public int ModuloId { get; set; }
        public string ModuloNome { get; set; } = string.Empty;

        public int FormadorId { get; set; }
        public string FormadorNome { get; set; } = string.Empty;

        public int SalaPadraoId { get; set; }
        public string SalaNome { get; set; } = string.Empty;

        public string Estado { get; set; } = "Pendente";
    }

    public class CreateCursoModuloDto
    {
        [Required]
        public int CursoId { get; set; }

        [Required]
        public int ModuloId { get; set; }

        [Required]
        public int FormadorId { get; set; }

        [Required]
        public int SalaPadraoId { get; set; }

        public string Estado { get; set; } = "Pendente";
    }
}