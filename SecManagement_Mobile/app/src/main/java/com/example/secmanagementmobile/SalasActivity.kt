package com.example.secmanagementmobile

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
import com.example.secmanagementmobile.models.SalaDto
import com.example.secmanagementmobile.network.ApiClient
import com.example.secmanagementmobile.ui.SalaAdapter
import com.google.android.material.card.MaterialCardView
import com.google.android.material.progressindicator.CircularProgressIndicator
import kotlinx.coroutines.*

class SalasActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private lateinit var etPesquisar: EditText
    private lateinit var rv: RecyclerView
    private lateinit var progress: CircularProgressIndicator
    private lateinit var txtEmpty: TextView
    private lateinit var cardError: MaterialCardView
    private lateinit var txtError: TextView
    private lateinit var btnRetry: Button

    private lateinit var adapter: SalaAdapter
    private var salasAll: List<SalaDto> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_salas)

        findViewById<Button>(R.id.btnVoltar).setOnClickListener { finish() }

        etPesquisar = findViewById(R.id.etPesquisarSala)
        rv = findViewById(R.id.rvSalas)
        progress = findViewById(R.id.progressSalas)
        txtEmpty = findViewById(R.id.txtSalasEmpty)
        cardError = findViewById(R.id.cardErrorSalas)
        txtError = findViewById(R.id.txtSalasError)
        btnRetry = findViewById(R.id.btnRetrySalas)

        adapter = SalaAdapter(emptyList<SalaDto>()) { sala ->
            startActivity(
                Intent(this, HorarioSalaActivity::class.java)
                    .putExtra("salaId", sala.id)
                    .putExtra("salaNome", sala.nome)
            )
        }

        rv.layoutManager = LinearLayoutManager(this)
        rv.adapter = adapter

        btnRetry.setOnClickListener { loadSalas() }

        etPesquisar.addTextChangedListener { text ->
            val q = text?.toString()?.trim()?.lowercase().orEmpty()
            val filtered = if (q.isEmpty()) salasAll else salasAll.filter {
                it.nome.lowercase().contains(q) || it.id.toString().contains(q)
            }
            adapter.update(filtered)
            txtEmpty.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
        }

        loadSalas()
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

    private fun loadSalas() {
        hideError()
        txtEmpty.visibility = View.GONE
        setLoading(true)

        scope.launch {
            try {
                val list = withContext(Dispatchers.IO) {
                    ApiClient.api.getSalas()
                }

                salasAll = list.sortedBy { it.nome.lowercase() }
                adapter.update(salasAll)
                txtEmpty.visibility = if (salasAll.isEmpty()) View.VISIBLE else View.GONE

            } catch (e: Exception) {
                showError("Erro a carregar salas: ${e.message}")
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
