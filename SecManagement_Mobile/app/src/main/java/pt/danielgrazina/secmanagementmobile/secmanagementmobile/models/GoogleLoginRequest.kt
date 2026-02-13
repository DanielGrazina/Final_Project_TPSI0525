package pt.danielgrazina.secmanagementmobile.models

data class GoogleLoginRequest(
    val idToken: String,
    val twoFactorCode: String? = null
)
