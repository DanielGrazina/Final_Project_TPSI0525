using System.ComponentModel.DataAnnotations;

namespace SecManagement_API.DTOs
{
    /// <summary>
    /// Pedido de geração automática de horário para uma turma.
    /// </summary>
    public class AutoScheduleRequestDto
    {
        [Required]
        public int TurmaId { get; set; }

        /// <summary>Data a partir da qual gerar sessões (inclusive).</summary>
        [Required]
        public DateTime DataInicio { get; set; }

        /// <summary>Hora de início do dia letivo (default 09:00).</summary>
        public int HoraInicioDia { get; set; } = 9;

        /// <summary>Hora de fim do dia letivo (default 18:00).</summary>
        public int HoraFimDia { get; set; } = 18;

        /// <summary>Hora de início da pausa de almoço (default 13:00).</summary>
        public int HoraInicioAlmoco { get; set; } = 13;

        /// <summary>Hora de fim da pausa de almoço (default 14:00).</summary>
        public int HoraFimAlmoco { get; set; } = 14;

        /// <summary>Duração máxima de cada sessão em horas (default 4).</summary>
        public int DuracaoSessaoHoras { get; set; } = 4;
    }

    /// <summary>
    /// Resultado da geração automática de horário.
    /// </summary>
    public class AutoScheduleResultDto
    {
        public int TotalSessoesCriadas { get; set; }
        public int TotalHorasAgendadas { get; set; }
        public List<AutoScheduleModuloResultDto> Modulos { get; set; } = new();
        public List<string> Avisos { get; set; } = new();
        public List<SessaoDto> SessoesCriadas { get; set; } = new();
    }

    public class AutoScheduleModuloResultDto
    {
        public string ModuloNome { get; set; } = string.Empty;
        public string FormadorNome { get; set; } = string.Empty;
        public int HorasTotais { get; set; }
        public double HorasAgendadas { get; set; }
        public bool Completo { get; set; }
    }
}
