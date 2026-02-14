package pt.danielgrazina.secmanagementmobile

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.*
import pt.danielgrazina.secmanagementmobile.models.AvaliacaoDto
import pt.danielgrazina.secmanagementmobile.storage.JwtUtils
import pt.danielgrazina.secmanagementmobile.storage.TokenStore
import pt.danielgrazina.secmanagementmobile.ui.AvaliacoesAdapter
import pt.danielgrazina.secmanagementmobile.network.ApiClient

class AvaliacoesActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private lateinit var progress: ProgressBar
    private lateinit var txtEmpty: TextView
    private lateinit var txtError: TextView
    private lateinit var rv: RecyclerView
    private lateinit var adapter: AvaliacoesAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_avaliacoes)

        // Só Formando (segurança extra)
        val token = TokenStore.get(this).orEmpty()
        val roles = JwtUtils.roles(token).map { it.lowercase().removePrefix("role_") }
        val isFormando =
            roles.contains("formando") ||
                    JwtUtils.isFormandoFlag(token) ||
                    (JwtUtils.formandoId(token) != null)

        if (!isFormando) {
            finish()
            return
        }

        // Botão voltar (se existir no layout)
        findViewById<Button?>(R.id.btnBack)?.setOnClickListener {
            finish()
        }

        progress = findViewById(R.id.progressAvaliacoes)
        txtEmpty = findViewById(R.id.txtAvaliacoesEmpty)
        txtError = findViewById(R.id.txtAvaliacoesError)
        rv = findViewById(R.id.rvAvaliacoes)

        adapter = AvaliacoesAdapter(emptyList())
        rv.layoutManager = LinearLayoutManager(this)
        rv.adapter = adapter

        carregarAvaliacoes()
    }

    private fun carregarAvaliacoes() {
        val token = TokenStore.get(this)
        if (token.isNullOrEmpty()) {
            showError("Sem sessão. Faz login novamente.")
            return
        }

        val formandoId = JwtUtils.formandoId(token)
        if (formandoId == null) {
            showError("Não foi possível obter o ID do formando.")
            return
        }

        // UI estado inicial
        txtError.visibility = View.GONE
        txtEmpty.visibility = View.GONE
        rv.visibility = View.VISIBLE
        progress.visibility = View.VISIBLE

        scope.launch {
            try {
                val lista: List<AvaliacaoDto> = withContext(Dispatchers.IO) {
                    ApiClient.api.getNotasAluno("Bearer $token", formandoId)
                }

                adapter.update(lista)

                if (lista.isEmpty()) {
                    txtEmpty.visibility = View.VISIBLE
                    rv.visibility = View.GONE
                } else {
                    txtEmpty.visibility = View.GONE
                    rv.visibility = View.VISIBLE
                }

            } catch (e: Exception) {
                showError("Erro ao carregar avaliações: ${e.message}")
            } finally {
                progress.visibility = View.GONE
            }
        }
    }

    private fun showError(msg: String) {
        progress.visibility = View.GONE
        txtEmpty.visibility = View.GONE
        rv.visibility = View.GONE

        txtError.text = msg
        txtError.visibility = View.VISIBLE
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
