namespace SecManagement_API.Models
{
    public class CursoModulo
    {
        public int Id { get; set; }

        public int CursoId { get; set; }
        public Curso? Curso { get; set; }

        public int ModuloId { get; set; }
        public Modulo? Modulo { get; set; }

        public int FormadorId { get; set; }
        public Formador? Formador { get; set; }

        public int SalaPadraoId { get; set; }
        public Sala? SalaPadrao { get; set; }

        public string Estado { get; set; } = "Pendente";
    }
}