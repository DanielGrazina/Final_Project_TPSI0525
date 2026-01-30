using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.DTOs
{
    // --- AREAS ---
    public class AreaDto
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
    }

    public class CreateAreaDto
    {
        [Required]
        public string Nome { get; set; } = string.Empty;
    }

    // --- CURSOS (Definição) ---
    public class CursoDto
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string NivelCurso { get; set; } = string.Empty;
        public int AreaId { get; set; }
        public string AreaNome { get; set; } = string.Empty; // Útil para o frontend
    }

    public class CreateCursoDto
    {
        [Required]
        public string Nome { get; set; } = string.Empty;
        public string NivelCurso { get; set; } = string.Empty;
        [Required]
        public int AreaId { get; set; }
    }

    // --- TURMAS (Execução) ---
    public class TurmaDto
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public DateTime DataInicio { get; set; }
        public DateTime DataFim { get; set; }
        public int? CoordenadorId { get; set; }
        public string CoordenadorNome { get; set; } = "N/A";
        public string Local { get; set; } = string.Empty;
        public string Estado { get; set; } = string.Empty;

        public int CursoId { get; set; }
        public string CursoNome { get; set; } = string.Empty;
    }

    public class CreateTurmaDto
    {
        [Required]
        public string Nome { get; set; } = string.Empty; // Ex: "TPSI 1024"
        public int? CoordenadorId { get; set; }
        public DateTime DataInicio { get; set; }
        public DateTime DataFim { get; set; }
        public string Local { get; set; } = string.Empty;
        [Required]
        public int CursoId { get; set; }
        [Required]
        [RegularExpression("Planeada|Decorrer|Terminada|Cancelada", ErrorMessage = "O estado deve ser: Planeada, Decorrer, Terminada ou Cancelada.")]
        public string Estado { get; set; } = "Planeada";
    }

    // --- TURMA MODULOS (A Distribuição/Horário Base) ---
    public class TurmaModuloDto
    {
        public int Id { get; set; }

        public int TurmaId { get; set; }
        public string TurmaNome { get; set; } = string.Empty;

        public int ModuloId { get; set; }
        public string ModuloNome { get; set; } = string.Empty;

        public int FormadorId { get; set; }
        public string FormadorNome { get; set; } = string.Empty;

        public int Sequencia { get; set; }
    }

    public class CreateTurmaModuloDto
    {
        [Required] public int TurmaId { get; set; }
        [Required] public int ModuloId { get; set; }
        [Required] public int FormadorId { get; set; }
        public int Sequencia { get; set; } // Ordem do módulo
    }
}