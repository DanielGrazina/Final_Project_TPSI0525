package pt.danielgrazina.secmanagementmobile.models

data class ResetPasswordRequest(
    val email: String,
    val token: String,
    val newPassword: String
)
