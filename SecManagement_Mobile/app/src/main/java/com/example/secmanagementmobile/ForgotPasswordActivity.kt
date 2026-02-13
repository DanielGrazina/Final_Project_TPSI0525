package com.example.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.example.secmanagementmobile.models.ForgotPasswordRequest
import com.example.secmanagementmobile.network.ApiClient
import kotlinx.coroutines.*

class ForgotPasswordActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_forgot_password)

        val etEmail = findViewById<EditText>(R.id.etEmail)
        val btnEnviar = findViewById<Button>(R.id.btnEnviar)
        val btnJaTenho = findViewById<Button>(R.id.btnJaTenhoCodigo)
        val txtStatus = findViewById<TextView>(R.id.txtStatus)

        // se vier email do login
        val prefill = intent.getStringExtra("email")
        if (!prefill.isNullOrBlank()) etEmail.setText(prefill)

        btnEnviar.setOnClickListener {
            val email = etEmail.text?.toString()?.trim().orEmpty()
            if (email.isBlank()) {
                txtStatus.text = "Preenche o email."
                return@setOnClickListener
            }

            btnEnviar.isEnabled = false
            txtStatus.text = "A enviar..."

            scope.launch {
                try {
                    withContext(Dispatchers.IO) {
                        ApiClient.api.forgotPassword(ForgotPasswordRequest(email))
                    }
                    txtStatus.text = "Enviado ✅ Verifica o teu email (spam incluído)."
                } catch (e: Exception) {
                    txtStatus.text = "Erro: ${e.message}"
                } finally {
                    btnEnviar.isEnabled = true
                }
            }
        }

        btnJaTenho.setOnClickListener {
            val email = etEmail.text?.toString()?.trim().orEmpty()
            startActivity(Intent(this, ResetPasswordActivity::class.java).apply {
                putExtra("email", email)
            })
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
