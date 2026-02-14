package pt.danielgrazina.secmanagementmobile.models

data class AvaliacaoDto(
    val id: Int,
    val turmaId: Int,
    val turmaNome: String,
    val inscricaoId: Int,
    val formandoNome: String,
    val turmaModuloId: Int,
    val moduloNome: String,
    val avaliacao: Double,
    val observacoes: String
)
