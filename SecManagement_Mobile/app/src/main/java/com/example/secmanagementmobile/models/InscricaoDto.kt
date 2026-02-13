package com.example.secmanagementmobile.models

data class InscricaoDto(
    val id: Int,
    val turmaId: Int?,
    val turmaNome: String,
    val cursoId: Int,
    val cursoNome: String,
    val formandoId: Int,
    val formandoNome: String,
    val dataInscricao: String,
    val estado: String
)
