package com.example.secmanagementmobile.models

data class FormandoProfileDto(
    val id: Int,
    val userId: Int,

    val nome: String?,
    val telefone: String?,
    val nif: String?,
    val morada: String?,
    val cc: String?,
    val avatar: String?,

    val email: String?,

    val numeroAluno: String?,
    val dataNascimento: String?,  // depois formatamos se quiseres

    val turmaId: Int?,
    val turmaNome: String?,

    val ficheiros: List<UserFicheiroDto>?
)
