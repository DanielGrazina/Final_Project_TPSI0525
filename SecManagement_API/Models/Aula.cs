namespace SecManagement_API.Models
{
    public class Aula
    {
        public int Id { get; set; }

        public int CursoModuloId { get; set; }
        public CursoModulo? CursoModulo { get; set; }

        public DateTime DataHoraInicio { get; set; }
        public DateTime DataHoraFim { get; set; }

        public int SalaId { get; set; }
        public Sala? Sala { get; set; }
    }
}