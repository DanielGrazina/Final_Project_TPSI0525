package pt.danielgrazina.secmanagementmobile

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import pt.danielgrazina.secmanagementmobile.models.SessaoDto
import pt.danielgrazina.secmanagementmobile.network.ApiClient
import pt.danielgrazina.secmanagementmobile.storage.TokenStore
import pt.danielgrazina.secmanagementmobile.ui.SessoesAdapter
import com.google.android.material.card.MaterialCardView
import com.google.android.material.progressindicator.CircularProgressIndicator
import kotlinx.coroutines.*
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters

class HorarioSalaActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private lateinit var btnVoltar: Button
    private lateinit var btnPrevWeek: Button
    private lateinit var btnNextWeek: Button
    private lateinit var btnEstaSemana: Button

    private lateinit var txtRangeHint: TextView
    private lateinit var txtRange: TextView

    private lateinit var progress: CircularProgressIndicator
    private lateinit var cardError: MaterialCardView
    private lateinit var txtError: TextView
    private lateinit var btnRetry: Button
    private lateinit var txtEmpty: TextView

    private lateinit var adapter: SessoesAdapter

    private val fmtHint = DateTimeFormatter.ofPattern("dd/MM")

    private var weekStart: LocalDate =
        LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

    private var salaId: Int = -1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_horario_sala)

        salaId = intent.getIntExtra("salaId", -1)
        if (salaId <= 0) {
            finish()
            return
        }

        // ✅ IDs exatamente como no teu XML
        btnVoltar = findViewById(R.id.btnVoltar)
        btnPrevWeek = findViewById(R.id.btnPrevWeek)
        btnNextWeek = findViewById(R.id.btnNextWeek)
        btnEstaSemana = findViewById(R.id.btnEstaSemana)

        txtRangeHint = findViewById(R.id.txtRangeHint)
        txtRange = findViewById(R.id.txtRange)

        progress = findViewById(R.id.progress)
        cardError = findViewById(R.id.cardError)
        txtError = findViewById(R.id.txtError)
        btnRetry = findViewById(R.id.btnRetry)
        txtEmpty = findViewById(R.id.txtEmpty)

        val rv = findViewById<RecyclerView>(R.id.rvSessoes)
        adapter = SessoesAdapter(emptyList())
        rv.layoutManager = LinearLayoutManager(this)
        rv.adapter = adapter

        btnVoltar.setOnClickListener { finish() }
        btnPrevWeek.setOnClickListener { weekStart = weekStart.minusWeeks(1); refreshUI(); load() }
        btnNextWeek.setOnClickListener { weekStart = weekStart.plusWeeks(1); refreshUI(); load() }
        btnEstaSemana.setOnClickListener {
            weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
            refreshUI()
            load()
        }

        btnRetry.setOnClickListener { load() }

        refreshUI()
        load()
    }

    private fun refreshUI() {
        val weekEnd = weekStart.plusDays(6)
        txtRangeHint.text = "${weekStart.format(fmtHint)} — ${weekEnd.format(fmtHint)}"
        txtRange.text = "${weekStart} → ${weekEnd}"
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
        txtError.text = ""
    }

    private fun load() {
        hideError()
        txtEmpty.visibility = View.GONE
        setLoading(true)

        val token = TokenStore.get(this)
        if (token.isNullOrEmpty()) {
            setLoading(false)
            showError("Precisas de login para ver o horário.")
            return
        }
        val auth = "Bearer $token"

        val startStr = weekStart.toString()
        val endStr = weekStart.plusDays(6).toString()

        scope.launch {
            try {
                val sessoes: List<SessaoDto> = withContext(Dispatchers.IO) {
                    // ✅ se o teu endpoint NÃO levar auth, troca para getHorarioSala(salaId, startStr, endStr)
                    ApiClient.api.getHorarioSala(auth, salaId, startStr, endStr)
                }

                adapter.update(sessoes)
                if (sessoes.isEmpty()) txtEmpty.visibility = View.VISIBLE

            } catch (e: Exception) {
                showError("Erro a carregar horário: ${e.message}")
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
