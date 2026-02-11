package com.example.secmanagementmobile.models

data class TurmaDto(
    val id: Int,
    val nome: String,
    val cursoId: Int,
    val cursoNome: String,
    val dataInicio: String? = null,
    val dataFim: String? = null,
    val local: String? = null,
    val estado: String? = null,
    val coordenadorNome: String? = null
)
