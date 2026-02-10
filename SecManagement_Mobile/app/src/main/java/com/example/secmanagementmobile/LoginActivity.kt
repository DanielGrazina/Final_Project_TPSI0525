package com.example.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.progressindicator.CircularProgressIndicator
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.example.secmanagementmobile.models.AuthResponse
import com.example.secmanagementmobile.models.LoginRequest
import com.example.secmanagementmobile.network.ApiClient
import com.example.secmanagementmobile.storage.TokenStore
import com.example.secmanagementmobile.utils.JwtUtils
import kotlinx.coroutines.*

class LoginActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private lateinit var tilEmail: TextInputLayout
    private lateinit var tilPassword: TextInputLayout
    private lateinit var til2fa: TextInputLayout

    private lateinit var etEmail: TextInputEditText
    private lateinit var etPassword: TextInputEditText
    private lateinit var et2fa: TextInputEditText

    private lateinit var btnLogin: Button
    private lateinit var progress: CircularProgressIndicator

    private lateinit var cardError: View
    private lateinit var txtError: TextView
    private lateinit var txtSubtitle: TextView

    private var requires2FA: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        tilEmail = findViewById(R.id.tilEmail)
        tilPassword = findViewById(R.id.tilPassword)
        til2fa = findViewById(R.id.til2fa)

        etEmail = findViewById(R.id.etEmail)
        etPassword = findViewById(R.id.etPassword)
        et2fa = findViewById(R.id.et2fa)

        btnLogin = findViewById(R.id.btnLogin)
        progress = findViewById(R.id.progress)

        cardError = findViewById(R.id.cardError)
        txtError = findViewById(R.id.txtError)
        txtSubtitle = findViewById(R.id.txtSubtitle)

        // Se já houver token guardado, pode saltar login (opcional)
        val tokenStore = TokenStore(this)
        if (!tokenStore.getToken().isNullOrEmpty()) {
            goHome()
            return
        }

        set2faMode(false)
        hideError()
        setLoading(false)

        btnLogin.setOnClickListener { handleLogin() }
    }

    private fun handleLogin() {
        hideError()

        val email = etEmail.text?.toString()?.trim().orEmpty()
        val password = etPassword.text?.toString()?.trim().orEmpty()
        val code2fa = et2fa.text?.toString()?.trim().orEmpty()

        // validação básica
        if (!requires2FA) {
            if (email.isEmpty() || password.isEmpty()) {
                showError("Preenche email e password.")
                return
            }
        } else {
            // Em modo 2FA, normalmente já tens email/pass preenchidos
            if (code2fa.length != 6) {
                showError("O código 2FA deve ter 6 dígitos.")
                return
            }
        }

        setLoading(true)

        scope.launch {
            try {
                val payload = LoginRequest(
                    email = email,
                    password = password,
                    twoFactorCode = if (requires2FA) code2fa else ""
                )

                val res: AuthResponse = withContext(Dispatchers.IO) {
                    ApiClient.api.login(payload)
                }

                val needs2fa = res.requiresTwoFactor

                // Se a tua API usar 202, o Retrofit normalmente entra no catch se não fores buscar Response<>
                // Mas como também devolves requiresTwoFactor no body, isto chega.
                if (needs2fa) {
                    requires2FA = true
                    set2faMode(true)
                    et2fa.setText("")
                    showError("Conta com 2FA. Insere o código do Authenticator.")
                    return@launch
                }

                val token = res.token
                if (token.isNullOrEmpty()) {
                    showError(res.message.ifEmpty { "Login falhou: token não recebido." })
                    return@launch
                }

                val store = TokenStore(this@LoginActivity)
                store.saveToken(token)

                // Guardar role do JWT
                val role = JwtUtils.getRole(token)
                if (!role.isNullOrEmpty()) {
                    store.saveRole(role)
                }

                goHome()

            } catch (e: Exception) {
                // Mensagem simples e útil
                showError("Erro no login: ${e.message}")
                if (requires2FA) et2fa.setText("")
            } finally {
                setLoading(false)
            }
        }
    }

    private fun set2faMode(enabled: Boolean) {
        til2fa.visibility = if (enabled) View.VISIBLE else View.GONE
        tilEmail.visibility = if (enabled) View.GONE else View.VISIBLE
        tilPassword.visibility = if (enabled) View.GONE else View.VISIBLE

        txtSubtitle.text = if (enabled) "Autenticação de dois fatores" else "Bem-vindo de volta"
        btnLogin.text = if (enabled) "Validar Código" else "Entrar"
    }

    private fun setLoading(loading: Boolean) {
        progress.visibility = if (loading) View.VISIBLE else View.GONE
        btnLogin.isEnabled = !loading
        etEmail.isEnabled = !loading
        etPassword.isEnabled = !loading
        et2fa.isEnabled = !loading
    }

    private fun showError(msg: String) {
        txtError.text = msg
        cardError.visibility = View.VISIBLE
    }

    private fun hideError() {
        cardError.visibility = View.GONE
    }

    private fun goHome() {
        startActivity(Intent(this, HomeActivity::class.java))
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
