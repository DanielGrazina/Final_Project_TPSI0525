package com.example.secmanagementmobile.models

data class GoogleLoginRequest(
    val idToken: String,
    val twoFactorCode: String? = null
)
