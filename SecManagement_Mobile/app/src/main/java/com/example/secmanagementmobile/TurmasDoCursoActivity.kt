package com.example.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.secmanagementmobile.models.*
import com.google.android.material.progressindicator.CircularProgressIndicator
import com.google.android.material.textfield.TextInputEditText
import com.example.secmanagementmobile.network.ApiClient
import com.example.secmanagementmobile.ui.TurmasAdapter
import kotlinx.coroutines.*

class TurmasDoCursoActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private lateinit var rv: RecyclerView
    private lateinit var adapter: TurmasAdapter
    private lateinit var progress: CircularProgressIndicator
    private lateinit var cardError: View
    private lateinit var txtError: TextView
    private lateinit var txtEmpty: TextView
    private lateinit var etSearch: TextInputEditText
    private lateinit var txtTitle: TextView

    private var cursoId: Int = -1
    private var cursoNome: String = "Turmas"

    private var allTurmas: List<TurmaDto> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_turmas_do_curso)

        cursoId = intent.getIntExtra("cursoId", -1)
        cursoNome = intent.getStringExtra("cursoNome") ?: "Turmas"

        rv = findViewById(R.id.rvTurmas)
        progress = findViewById(R.id.progress)
        cardError = findViewById(R.id.cardError)
        txtError = findViewById(R.id.txtError)
        txtEmpty = findViewById(R.id.txtEmpty)
        etSearch = findViewById(R.id.etSearch)
        txtTitle = findViewById(R.id.txtTitle)

        txtTitle.text = "Turmas — $cursoNome"

        rv.layoutManager = LinearLayoutManager(this)
        adapter = TurmasAdapter(emptyList()) { turma ->
            startActivity(
                Intent(this, HorarioTurmaActivity::class.java)
                    .putExtra("turmaId", turma.id)
                    .putExtra("turmaNome", turma.nome)
            )
        }

        rv.adapter = adapter

        findViewById<Button>(R.id.btnVoltar).setOnClickListener { finish() }
        findViewById<Button>(R.id.btnRetry).setOnClickListener { load() }

        etSearch.addTextChangedListener(SimpleTextWatcher { q -> filter(q) })

        if (cursoId <= 0) {
            showError("Curso inválido.")
            return
        }

        load()
    }

    private fun setLoading(v: Boolean) {
        progress.visibility = if (v) View.VISIBLE else View.GONE
    }

    private fun showError(msg: String) {
        cardError.visibility = View.VISIBLE
        txtError.text = msg
    }

    private fun hideError() {
        cardError.visibility = View.GONE
    }

    private fun setEmpty(v: Boolean) {
        txtEmpty.visibility = if (v) View.VISIBLE else View.GONE
    }

    private fun load() {
        hideError()
        setEmpty(false)
        setLoading(true)

        scope.launch {
            try {
                // 1) tenta endpoint dedicado se existir (descomenta se tiveres)
                // val turmas = withContext(Dispatchers.IO) { ApiClient.api.getTurmasByCurso(cursoId) }

                // 2) fallback: buscar todas e filtrar localmente
                val turmas = withContext(Dispatchers.IO) {
                    ApiClient.api.getTurmas()
                }

                val filtered = turmas.filter { t ->
                    t.cursoId == cursoId
                }


                allTurmas = filtered
                adapter.update(filtered)
                setEmpty(filtered.isEmpty())
            } catch (e: Exception) {
                showError("Erro a carregar turmas: ${e.message}")
            } finally {
                setLoading(false)
            }
        }
    }

    private fun filter(query: String) {
        val q = query.trim().lowercase()
        if (q.isEmpty()) {
            adapter.update(allTurmas)
            setEmpty(allTurmas.isEmpty())
            return
        }

        val filtered = allTurmas.filter { t ->
            t.nome.lowercase().contains(q)
        }

        adapter.update(filtered)
        setEmpty(filtered.isEmpty())
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
