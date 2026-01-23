namespace SecManagement_API.Models
{
    public class Disponibilidade
    {
        public int Id { get; set; }

        public int EntidadeId { get; set; }
        public string TipoEntidade { get; set; } = string.Empty; // "Sala" ou "Formador"

        public DateTime DataInicio { get; set; }
        public DateTime DataFim { get; set; }
        public bool Disponivel { get; set; }
    }
}