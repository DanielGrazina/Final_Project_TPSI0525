package pt.danielgrazina.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import pt.danielgrazina.secmanagementmobile.models.ResetPasswordRequest
import pt.danielgrazina.secmanagementmobile.network.ApiClient
import kotlinx.coroutines.*

class ResetPasswordActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_reset_password)

        val etEmail = findViewById<EditText>(R.id.etEmail)
        val etToken = findViewById<EditText>(R.id.etToken)
        val etNew = findViewById<EditText>(R.id.etNewPass)
        val etConfirm = findViewById<EditText>(R.id.etConfirmPass)
        val btnReset = findViewById<Button>(R.id.btnReset)
        val txtStatus = findViewById<TextView>(R.id.txtStatus)

        val prefill = intent.getStringExtra("email")
        if (!prefill.isNullOrBlank()) etEmail.setText(prefill)

        btnReset.setOnClickListener {
            val email = etEmail.text?.toString()?.trim().orEmpty()
            val token = etToken.text?.toString()?.trim().orEmpty()
            val newPass = etNew.text?.toString()?.trim().orEmpty()
            val confirm = etConfirm.text?.toString()?.trim().orEmpty()

            if (email.isBlank() || token.isBlank() || newPass.isBlank() || confirm.isBlank()) {
                txtStatus.text = "Preenche todos os campos."
                return@setOnClickListener
            }
            if (newPass != confirm) {
                txtStatus.text = "As passwords não coincidem."
                return@setOnClickListener
            }
            if (newPass.length < 6) {
                txtStatus.text = "Password demasiado curta (mín. 6)."
                return@setOnClickListener
            }

            btnReset.isEnabled = false
            txtStatus.text = "A alterar password..."

            scope.launch {
                try {
                    withContext(Dispatchers.IO) {
                        ApiClient.api.resetPassword(ResetPasswordRequest(email, token, newPass))
                    }
                    txtStatus.text = "Password alterada ✅"

                    // volta ao login
                    startActivity(Intent(this@ResetPasswordActivity, LoginActivity::class.java))
                    finish()

                } catch (e: Exception) {
                    txtStatus.text = "Erro: ${e.message}"
                } finally {
                    btnReset.isEnabled = true
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
