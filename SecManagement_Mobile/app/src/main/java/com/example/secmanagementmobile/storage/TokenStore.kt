package com.example.secmanagementmobile.storage

import android.content.Context

class TokenStore(context: Context) {
    private val prefs = context.getSharedPreferences("auth", Context.MODE_PRIVATE)

    fun saveToken(token: String) {
        prefs.edit().putString("jwt", token).apply()
    }
    fun getToken(): String? = prefs.getString("jwt", null)

    fun saveRole(role: String) {
        prefs.edit().putString("role", role).apply()
    }
    fun getRole(): String? = prefs.getString("role", null)

    fun clear() {
        prefs.edit().clear().apply()
    }

}
