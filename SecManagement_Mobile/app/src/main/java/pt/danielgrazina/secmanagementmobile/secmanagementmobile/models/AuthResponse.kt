package pt.danielgrazina.secmanagementmobile.models

data class AuthResponse(
    val token: String?,
    val requiresTwoFactor: Boolean,
    val message: String
)