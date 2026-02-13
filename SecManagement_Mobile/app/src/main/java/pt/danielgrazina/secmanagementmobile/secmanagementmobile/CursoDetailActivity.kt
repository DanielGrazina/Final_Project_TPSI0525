package pt.danielgrazina.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.progressindicator.CircularProgressIndicator
import pt.danielgrazina.secmanagementmobile.network.ApiClient
import kotlinx.coroutines.*

class CursoDetailActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private lateinit var txtNome: TextView
    private lateinit var txtArea: TextView
    private lateinit var txtNivel: TextView
    private lateinit var txtId: TextView

    private lateinit var progress: CircularProgressIndicator
    private lateinit var cardError: View
    private lateinit var txtError: TextView

    private var cursoId: Int = -1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_curso_detail)

        cursoId = intent.getIntExtra("cursoId", -1)

        txtNome = findViewById(R.id.txtNome)
        txtArea = findViewById(R.id.txtArea)
        txtNivel = findViewById(R.id.txtNivel)
        txtId = findViewById(R.id.txtId)

        progress = findViewById(R.id.progress)
        cardError = findViewById(R.id.cardError)
        txtError = findViewById(R.id.txtError)

        findViewById<Button>(R.id.btnVoltar).setOnClickListener { finish() }
        findViewById<Button>(R.id.btnRetry).setOnClickListener { load() }

        // Read-only: por agora só mostramos mensagem (até criarmos essas páginas)
        findViewById<Button>(R.id.btnVerTurmas).setOnClickListener {
            startActivity(
                Intent(this, TurmasDoCursoActivity::class.java)
                    .putExtra("cursoId", cursoId)
                    .putExtra("cursoNome", txtNome.text.toString())
            )
        }

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

    private fun load() {
        hideError()
        setLoading(true)

        scope.launch {
            try {
                val c = withContext(Dispatchers.IO) {
                    ApiClient.api.getCurso(cursoId)
                }

                txtNome.text = c.nome
                txtArea.text = "Área: ${c.areaNome}"
                txtNivel.text = "Nível: ${c.nivelCurso}"
                txtId.text = "ID: ${c.id}"

            } catch (e: Exception) {
                showError("Erro a carregar curso: ${e.message}")
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
