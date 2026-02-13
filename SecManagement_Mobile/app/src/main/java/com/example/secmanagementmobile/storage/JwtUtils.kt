package com.example.secmanagementmobile.storage

import android.util.Base64
import org.json.JSONObject

object JwtUtils {
    private fun payload(token: String): JSONObject? = try {
        val parts = token.split(".")
        val json = String(Base64.decode(parts[1], Base64.URL_SAFE or Base64.NO_WRAP))
        JSONObject(json)
    } catch (_: Exception) { null }

    private fun intClaim(p: org.json.JSONObject, key: String): Int? =
        p.optString(key, "").toIntOrNull()

    fun userId(token: String): Int? {
        val p = payload(token) ?: return null

        // ✅ .NET ClaimTypes.NameIdentifier vira esta key no JWT:
        val candidates = listOf(
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
            "nameid", "sub", "userId", "id"
        )

        for (k in candidates) {
            val v = p.optString(k, "")
            if (v.isNotBlank()) return v.toIntOrNull()
        }
        return null
    }

    fun formandoId(token: String): Int? {
        val p = payload(token) ?: return null
        return intClaim(p, "FormandoId")
    }

    fun formadorId(token: String): Int? {
        val p = payload(token) ?: return null
        return intClaim(p, "FormadorId")
    }

    fun isFormandoFlag(token: String): Boolean {
        val p = payload(token) ?: return false
        return p.optString("IsFormando", "false").equals("true", ignoreCase = true)
    }

    fun isFormadorFlag(token: String): Boolean {
        val p = payload(token) ?: return false
        return p.optString("IsFormador", "false").equals("true", ignoreCase = true)
    }


    fun roles(token: String): List<String> {
        val p = payload(token) ?: return emptyList()

        // normalmente: "role" ou claim MS
        val keys = listOf("role", "roles", "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")
        for (k in keys) {
            if (!p.has(k)) continue
            val v = p.get(k)
            return when (v) {
                is String -> listOf(v)
                else -> {
                    val arr = p.optJSONArray(k) ?: return emptyList()
                    (0 until arr.length()).mapNotNull { arr.optString(it) }
                }
            }
        }
        return emptyList()
    }
}
