package com.example.secmanagementmobile.storage

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
        } catch (_: Exception) {
            null
        }
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
        val raw = when {
            json.has("nameid") -> json.getString("nameid")
            json.has("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier") ->
                json.getString("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")
            json.has("sub") -> json.getString("sub")
            else -> null
        } ?: return null

        return raw.toIntOrNull()
    }
}
