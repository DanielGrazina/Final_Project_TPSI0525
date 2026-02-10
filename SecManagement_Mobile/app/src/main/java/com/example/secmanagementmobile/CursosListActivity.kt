package com.example.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.secmanagementmobile.network.ApiClient
import com.example.secmanagementmobile.ui.*
import com.example.secmanagementmobile.models.*
import kotlinx.coroutines.*
import android.text.Editable
import android.text.TextWatcher



class CursosListActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private lateinit var adapter: CursosAdapter
    private var allCursos: List<CursoDto> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_cursos_list)

        val rv = findViewById<RecyclerView>(R.id.rvCursos)
        val etSearch = findViewById<EditText>(R.id.etSearch)
        val progress = findViewById<ProgressBar>(R.id.progress)
        val txtError = findViewById<TextView>(R.id.txtError)

        adapter = CursosAdapter(emptyList()) { curso ->
            // ✅ Passagem de dados entre activities
            val intent = Intent(this, CursoDetailActivity::class.java)
            intent.putExtra("cursoId", curso.id)
            startActivity(intent)
        }

        rv.layoutManager = LinearLayoutManager(this)
        rv.adapter = adapter

        // Pesquisa (filtra localmente)
        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}

            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val q = s?.toString()?.trim()?.lowercase() ?: ""
                val filtered = if (q.isEmpty()) allCursos else allCursos.filter { c ->
                    c.nome.lowercase().contains(q) || c.areaNome.lowercase().contains(q)
                }
                adapter.update(filtered)
            }

            override fun afterTextChanged(s: Editable?) {}
        })


        // Carregar cursos da API
        scope.launch {
            progress.visibility = android.view.View.VISIBLE
            txtError.text = ""

            try {
                val cursos = withContext(Dispatchers.IO) {
                    ApiClient.api.getCursos()
                }
                allCursos = cursos
                adapter.update(cursos)
            } catch (e: Exception) {
                txtError.text = "Erro a carregar cursos: ${e.message}"
            } finally {
                progress.visibility = android.view.View.GONE
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
