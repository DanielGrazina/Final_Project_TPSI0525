package com.example.secmanagementmobile.models

data class SessaoDto(
    val id: Int,
    val turmaModuloId: Int,
    val moduloNome: String,
    val formadorNome: String,
    val turmaNome: String,
    val salaId: Int,
    val salaNome: String,
    val horarioInicio: String, // vem como ISO (DateTime)
    val horarioFim: String
)
