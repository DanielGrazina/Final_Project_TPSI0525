package pt.danielgrazina.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import pt.danielgrazina.secmanagementmobile.models.TurmaDto
import pt.danielgrazina.secmanagementmobile.network.ApiClient
import pt.danielgrazina.secmanagementmobile.ui.TurmasAdapter
import kotlinx.coroutines.*
import androidx.core.widget.addTextChangedListener


class TurmasSelectActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private lateinit var adapter: TurmasAdapter

    private var turmasAll: List<TurmaDto> = emptyList()
    private var turmasFiltered: List<TurmaDto> = emptyList()


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_turmas_select)

        val coordenadorId = intent.getIntExtra("coordenadorId", -1)
        val etPesquisar = findViewById<EditText>(R.id.etPesquisar)

        etPesquisar.addTextChangedListener { text ->
            val q = text?.toString()?.trim()?.lowercase().orEmpty()

            turmasFiltered = if (q.isEmpty()) {
                turmasAll
            } else {
                turmasAll.filter {
                    it.nome.lowercase().contains(q) || it.id.toString().contains(q)
                }
            }

            adapter.update(turmasFiltered)
        }


        findViewById<Button>(R.id.btnVoltar).setOnClickListener { finish() }

        val rv = findViewById<RecyclerView>(R.id.rvTurmas)
        rv.layoutManager = LinearLayoutManager(this)

        adapter = TurmasAdapter(emptyList()) { turma ->
            startActivity(
                Intent(this, HorarioTurmaActivity::class.java)
                    .putExtra("turmaId", turma.id)
                    .putExtra("turmaNome", turma.nome)
            )
        }
        rv.adapter = adapter

        scope.launch {
            val turmas: List<TurmaDto> = withContext(Dispatchers.IO) { ApiClient.api.getTurmas() }

            // ✅ se vier coordenadorId, filtra turmas coordenadas
            val filtered = if (coordenadorId > 0) {
                turmas.filter { it.coordenadorId == coordenadorId }
            } else turmas

            adapter.update(filtered)

            turmasAll = turmas // a lista original
            turmasFiltered = turmasAll
            adapter.update(turmasFiltered)

        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
