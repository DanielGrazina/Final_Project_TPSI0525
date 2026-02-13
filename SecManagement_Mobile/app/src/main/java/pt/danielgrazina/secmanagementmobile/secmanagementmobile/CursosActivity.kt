package pt.danielgrazina.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import pt.danielgrazina.secmanagementmobile.models.*
import com.google.android.material.progressindicator.CircularProgressIndicator
import com.google.android.material.textfield.TextInputEditText
import pt.danielgrazina.secmanagementmobile.network.ApiClient
import pt.danielgrazina.secmanagementmobile.ui.CursosAdapter
import kotlinx.coroutines.*

class CursosActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private lateinit var rv: RecyclerView
    private lateinit var adapter: CursosAdapter
    private lateinit var progress: CircularProgressIndicator
    private lateinit var cardError: View
    private lateinit var txtError: TextView
    private lateinit var txtEmpty: TextView
    private lateinit var etSearch: TextInputEditText

    private var allCursos: List<CursoDto> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_cursos)

        rv = findViewById(R.id.rvCursos)
        progress = findViewById(R.id.progress)
        cardError = findViewById(R.id.cardError)
        txtError = findViewById(R.id.txtError)
        txtEmpty = findViewById(R.id.txtEmpty)
        etSearch = findViewById(R.id.etSearch)

        rv.layoutManager = LinearLayoutManager(this)

        adapter = CursosAdapter(emptyList()) { curso ->
            startActivity(
                Intent(this, CursoDetailActivity::class.java)
                    .putExtra("cursoId", curso.id)
            )
        }

        rv.adapter = adapter

        findViewById<Button>(R.id.btnVoltar).setOnClickListener { finish() }
        findViewById<Button>(R.id.btnRetry).setOnClickListener { loadCursos() }

        // Pesquisa
        etSearch.addTextChangedListener(SimpleTextWatcher { text ->
            filter(text)
        })

        loadCursos()
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

    private fun loadCursos() {
        hideError()
        setEmpty(false)
        setLoading(true)

        scope.launch {
            try {
                val cursos = withContext(Dispatchers.IO) {
                    ApiClient.api.getCursos()
                }
                allCursos = cursos
                adapter.update(cursos)
                setEmpty(cursos.isEmpty())
            } catch (e: Exception) {
                showError("Erro a carregar cursos: ${e.message}")
            } finally {
                setLoading(false)
            }
        }
    }

    private fun filter(query: String) {
        val q = query.trim().lowercase()
        if (q.isEmpty()) {
            adapter.update(allCursos)
            setEmpty(allCursos.isEmpty())
            return
        }

        val filtered = allCursos.filter { c ->
            c.nome.lowercase().contains(q) || c.areaNome.lowercase().contains(q)
        }

        adapter.update(filtered)
        setEmpty(filtered.isEmpty())
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
