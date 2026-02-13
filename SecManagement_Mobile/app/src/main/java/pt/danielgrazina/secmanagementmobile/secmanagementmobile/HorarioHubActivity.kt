package pt.danielgrazina.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import pt.danielgrazina.secmanagementmobile.storage.TokenStore
import pt.danielgrazina.secmanagementmobile.storage.JwtUtils


class HorarioHubActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val token = TokenStore.get(this)
        if (token.isNullOrBlank()) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        val rolesRaw = JwtUtils.roles(token)
        val roles = rolesRaw
            .map { it.lowercase().removePrefix("role_") }

        val formandoId = JwtUtils.formandoId(token)
        val formadorId = JwtUtils.formadorId(token)

        val isFormando = roles.contains("formando") || JwtUtils.isFormandoFlag(token)
        val isFormador = roles.contains("formador") || JwtUtils.isFormadorFlag(token)
        val isStaff = roles.any { it in listOf("secretaria", "admin", "superadmin") }

        when {
            isFormando && formandoId != null -> {
                startActivity(
                    Intent(this, HorarioFormandoRedirectActivity::class.java)
                        .putExtra("formandoId", formandoId)
                )
            }
            isFormador && formadorId != null -> {
                startActivity(
                    Intent(this, HorarioFormadorMenuActivity::class.java)
                        .putExtra("formadorId", formadorId)
                )
            }
            isStaff -> startActivity(Intent(this, TurmasSelectActivity::class.java))
            else -> startActivity(Intent(this, TurmasSelectActivity::class.java))
        }
        finish()

    }
}
