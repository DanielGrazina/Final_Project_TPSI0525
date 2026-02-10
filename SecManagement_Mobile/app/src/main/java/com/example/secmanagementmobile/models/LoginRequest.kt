package com.example.secmanagementmobile.models

data class LoginRequest(
    val email: String,
    val password: String,
    val twoFactorCode: String? = null
)
