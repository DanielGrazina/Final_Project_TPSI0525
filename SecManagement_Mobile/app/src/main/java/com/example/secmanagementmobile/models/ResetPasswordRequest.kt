package com.example.secmanagementmobile.models

data class ResetPasswordRequest(
    val email: String,
    val token: String,
    val newPassword: String
)
