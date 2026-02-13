package pt.danielgrazina.secmanagementmobile.models

data class FormadorProfileDto(
    val id: Int,
    val userId: Int,

    val nome: String?,
    val email: String?,
    val telefone: String?,

    val nif: String?,
    val morada: String?,
    val cc: String?,
    val avatar: String?,

    val areaEspecializacao: String?,
    val corCalendario: String?,

    val ficheiros: List<UserFicheiroDto>?
)
