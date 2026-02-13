package com.example.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.example.secmanagementmobile.network.ApiClient
import com.example.secmanagementmobile.storage.TokenStore
import kotlinx.coroutines.*

class HorarioFormandoRedirectActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // layout simples (pode ser só um TextView "A carregar...")
        val tv = TextView(this)
        tv.text = "A carregar horário..."
        tv.setPadding(40, 80, 40, 40)
        setContentView(tv)

        val formandoId = intent.getIntExtra("formandoId", -1)
        if (formandoId <= 0) { finish(); return }

        scope.launch {
            try {
                val token = TokenStore.get(applicationContext) ?: ""
                val auth = "Bearer $token"

                val inscricoes = withContext(Dispatchers.IO) {
                    ApiClient.api.getInscricoesAluno(auth, formandoId)
                }

                // escolhe uma inscrição com turma
                val atual = inscricoes
                    .filter { it.turmaId != null }
                    .maxByOrNull { it.dataInscricao } // mais recente

                val turmaId = atual?.turmaId
                val turmaNome = atual?.turmaNome ?: "Minha Turma"

                if (turmaId == null) {
                    tv.text = "Ainda não estás colocado numa turma."
                    return@launch
                }

                startActivity(
                    Intent(this@HorarioFormandoRedirectActivity, HorarioTurmaActivity::class.java)
                        .putExtra("turmaId", turmaId)
                        .putExtra("turmaNome", turmaNome)
                )
                finish()

            } catch (e: Exception) {
                tv.text = "Erro a carregar inscrições: ${e.message}"
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
