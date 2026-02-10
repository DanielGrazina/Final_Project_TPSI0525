package com.example.secmanagementmobile.utils

import android.util.Base64
import org.json.JSONObject

object JwtUtils {

    private fun payloadJson(token: String): JSONObject? {
        return try {
            val parts = token.split(".")
            if (parts.size < 2) return null

            val payload = parts[1]
                .replace('-', '+')
                .replace('_', '/')

            val decoded = String(Base64.decode(payload, Base64.DEFAULT))
            JSONObject(decoded)
        } catch (e: Exception) { null }
    }

    fun getRole(token: String): String? {
        val json = payloadJson(token) ?: return null
        return when {
            json.has("role") -> json.getString("role")
            json.has("http://schemas.microsoft.com/ws/2008/06/identity/claims/role") ->
                json.getString("http://schemas.microsoft.com/ws/2008/06/identity/claims/role")
            else -> null
        }
    }

    fun getUserId(token: String): Int? {
        val json = payloadJson(token) ?: return null
        val key1 = "nameid"
        val key2 = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
        val key3 = "sub"

        val raw = when {
            json.has(key1) -> json.getString(key1)
            json.has(key2) -> json.getString(key2)
            json.has(key3) -> json.getString(key3)
            else -> null
        } ?: return null

        return raw.toIntOrNull()
    }
}

