namespace SecManagement_API.Models
{
    public enum UserRole { SuperAdmin, Admin, Secretaria, Formador, Formando }
    public enum TipoSala { Teorica, Informatica, Oficina, Reuniao }
    public enum EstadoTurma { Planeada, Decorrer, Terminada, Cancelada }
    public enum EstadoInscricao { Ativo, Desistiu, Concluido }
}