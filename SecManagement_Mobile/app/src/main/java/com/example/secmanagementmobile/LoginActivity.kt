package com.example.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.example.secmanagementmobile.R
import com.example.secmanagementmobile.models.LoginRequest
import com.example.secmanagementmobile.network.ApiClient
import com.example.secmanagementmobile.storage.TokenStore
import com.google.android.material.progressindicator.CircularProgressIndicator
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import kotlinx.coroutines.*
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.CustomCredential
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.example.secmanagementmobile.models.GoogleLoginRequest
import androidx.credentials.exceptions.NoCredentialException



class LoginActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

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

    private lateinit var btnGoogle: Button

    private enum class AuthFlow { PASSWORD, GOOGLE }
    private var flow: AuthFlow = AuthFlow.PASSWORD
    private var pendingGoogleIdToken: String? = null


    private var requires2FA = false

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
        btnGoogle = findViewById(R.id.btnGoogle)
        btnGoogle.setOnClickListener { startGoogleLogin() }
        progress = findViewById(R.id.progress)

        cardError = findViewById(R.id.cardError)
        txtError = findViewById(R.id.txtError)
        txtSubtitle = findViewById(R.id.txtSubtitle)

        set2faMode(false)
        hideError()
        setLoading(false)

        val txtForgot = findViewById<TextView>(R.id.txtForgot)
        txtForgot.setOnClickListener {
            val email = etEmail.text?.toString()?.trim().orEmpty()
            startActivity(Intent(this, ForgotPasswordActivity::class.java).apply {
                putExtra("email", email)
            })
        }



        btnLogin.setOnClickListener { handleLogin() }
    }

    private fun handleLogin() {
        hideError()

        val email = etEmail.text?.toString()?.trim().orEmpty()
        val password = etPassword.text?.toString()?.trim().orEmpty()
        val code = et2fa.text?.toString()?.trim().orEmpty()

        if (!requires2FA) {
            // login normal
            if (email.isEmpty() || password.isEmpty()) {
                showError("Preenche email e password.")
                return
            }
            flow = AuthFlow.PASSWORD
        } else {
            // 2FA (tanto normal como google)
            if (code.length != 6) {
                showError("O código 2FA deve ter 6 dígitos.")
                return
            }
        }

        setLoading(true)

        scope.launch {
            try {
                val res = withContext(Dispatchers.IO) {
                    when {
                        requires2FA && flow == AuthFlow.GOOGLE -> {
                            val idToken = pendingGoogleIdToken
                                ?: throw IllegalStateException("IdToken Google em falta.")
                            ApiClient.api.loginGoogle(GoogleLoginRequest(idToken, code))
                        }

                        else -> {
                            val payload = LoginRequest(
                                email = email,
                                password = password,
                                twoFactorCode = if (requires2FA) code else ""
                            )
                            ApiClient.api.login(payload)
                        }
                    }
                }

                if (res.requiresTwoFactor) {
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

                TokenStore.save(this@LoginActivity, token)
                startActivity(Intent(this@LoginActivity, HomeActivity::class.java))
                finish()

            } catch (e: Exception) {
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
        btnGoogle.isEnabled = !loading

    }

    private fun showError(msg: String) {
        txtError.text = msg
        cardError.visibility = View.VISIBLE
    }

    private fun hideError() {
        cardError.visibility = View.GONE
    }

    private fun startGoogleLogin() {
        hideError()
        setLoading(true)
        flow = AuthFlow.GOOGLE

        val cm = CredentialManager.create(this)

        val googleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(getString(R.string.server_client_id))
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        scope.launch {
            try {
                val result = cm.getCredential(this@LoginActivity, request)
                val cred = result.credential

                if (cred is CustomCredential &&
                    cred.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                ) {
                    val googleCred = GoogleIdTokenCredential.createFrom(cred.data)
                    val idToken = googleCred.idToken

                    pendingGoogleIdToken = idToken

                    val res = withContext(Dispatchers.IO) {
                        ApiClient.api.loginGoogle(GoogleLoginRequest(idToken))
                    }

                    if (res.requiresTwoFactor) {
                        requires2FA = true
                        set2faMode(true)
                        et2fa.setText("")
                        showError("Conta Google com 2FA. Insere o código do Authenticator.")
                        return@launch
                    }

                    val token = res.token
                    if (token.isNullOrEmpty()) {
                        showError(res.message.ifEmpty { "Login Google falhou: token não recebido." })
                        return@launch
                    }

                    TokenStore.save(this@LoginActivity, token)
                    startActivity(Intent(this@LoginActivity, HomeActivity::class.java))
                    finish()
                }
            } catch (e: NoCredentialException) {
                showError("Não há contas Google disponíveis. Faz login numa conta Google no dispositivo/Play Store e tenta novamente.")
            } finally {
                setLoading(false)
            }
        }
    }


    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
