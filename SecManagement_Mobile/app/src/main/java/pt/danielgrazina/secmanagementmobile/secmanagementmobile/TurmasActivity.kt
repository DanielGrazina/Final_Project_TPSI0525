package pt.danielgrazina.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.addTextChangedListener
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import pt.danielgrazina.secmanagementmobile.models.TurmaDto
import pt.danielgrazina.secmanagementmobile.network.ApiClient
import pt.danielgrazina.secmanagementmobile.ui.TurmasAdapter
import com.google.android.material.card.MaterialCardView
import com.google.android.material.progressindicator.CircularProgressIndicator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class TurmasActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private lateinit var etPesquisar: EditText
    private lateinit var rv: RecyclerView
    private lateinit var progress: CircularProgressIndicator
    private lateinit var txtEmpty: TextView
    private lateinit var cardError: MaterialCardView
    private lateinit var txtError: TextView
    private lateinit var btnRetry: Button

    private lateinit var adapter: TurmasAdapter

    private var turmasAll: List<TurmaDto> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_turmas)

        // Voltar
        findViewById<Button>(R.id.btnVoltar).setOnClickListener { finish() }

        etPesquisar = findViewById(R.id.etPesquisarTurma)
        rv = findViewById(R.id.rvTurmas)
        progress = findViewById(R.id.progressTurmas)
        txtEmpty = findViewById(R.id.txtTurmasEmpty)
        cardError = findViewById(R.id.cardErrorTurmas)
        txtError = findViewById(R.id.txtTurmasError)
        btnRetry = findViewById(R.id.btnRetryTurmas)

        // Reutiliza o vosso adapter (que exige onClick)
        adapter = TurmasAdapter(emptyList()) { turma ->
            // Ao clicar: abre o horário da turma
            startActivity(
                Intent(this, HorarioTurmaActivity::class.java)
                    .putExtra("turmaId", turma.id)
                    .putExtra("turmaNome", turma.nome)
            )
        }

        rv.layoutManager = LinearLayoutManager(this)
        rv.adapter = adapter

        btnRetry.setOnClickListener { loadTurmas() }

        etPesquisar.addTextChangedListener { text ->
            val q = text?.toString()?.trim()?.lowercase().orEmpty()
            val filtered = if (q.isEmpty()) turmasAll else turmasAll.filter {
                it.nome.lowercase().contains(q) || it.id.toString().contains(q)
            }
            adapter.update(filtered)
            txtEmpty.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
        }

        loadTurmas()
    }

    private fun setLoading(isLoading: Boolean) {
        progress.visibility = if (isLoading) View.VISIBLE else View.GONE
    }

    private fun showError(message: String?) {
        cardError.visibility = View.VISIBLE
        txtError.text = message ?: "Erro inesperado."
    }

    private fun hideError() {
        cardError.visibility = View.GONE
        txtError.text = ""
    }

    private fun loadTurmas() {
        hideError()
        txtEmpty.visibility = View.GONE
        setLoading(true)

        scope.launch {
            try {
                val list = withContext(Dispatchers.IO) {
                    ApiClient.api.getTurmas()
                }

                turmasAll = list.sortedBy { it.nome.lowercase() }
                adapter.update(turmasAll)

                txtEmpty.visibility = if (turmasAll.isEmpty()) View.VISIBLE else View.GONE

            } catch (e: Exception) {
                showError("Erro a carregar turmas: ${e.message}")
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
