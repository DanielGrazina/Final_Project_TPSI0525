package com.example.secmanagementmobile

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.secmanagementmobile.models.HorarioRow
import com.example.secmanagementmobile.models.SessaoDto
import com.example.secmanagementmobile.network.ApiClient
import com.example.secmanagementmobile.storage.TokenStore
import com.example.secmanagementmobile.ui.HorarioSemanaAdapter
import com.google.android.material.progressindicator.CircularProgressIndicator
import kotlinx.coroutines.*
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters

class HorarioFormadorActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private lateinit var txtRange: TextView
    private lateinit var progress: CircularProgressIndicator
    private lateinit var cardError: View
    private lateinit var txtError: TextView
    private lateinit var txtEmpty: TextView
    private lateinit var rv: RecyclerView
    private lateinit var adapter: HorarioSemanaAdapter

    private var formadorId: Int = -1

    private var weekStart: LocalDate = LocalDate.now()
        .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

    private var start: LocalDate = weekStart
    private var end: LocalDate = weekStart.plusDays(6)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_horario_turma)

        formadorId = intent.getIntExtra("formadorId", -1)

        txtRange = findViewById(R.id.txtRange)
        progress = findViewById(R.id.progress)
        cardError = findViewById(R.id.cardError)
        txtError = findViewById(R.id.txtError)
        txtEmpty = findViewById(R.id.txtEmpty)
        rv = findViewById(R.id.rvSessoes)

        rv.layoutManager = LinearLayoutManager(this)
        adapter = HorarioSemanaAdapter(emptyList()) { s ->
            // se quiseres detalhe aqui também, dá (igual ao das turmas)
        }
        rv.adapter = adapter

        findViewById<Button>(R.id.btnVoltar).setOnClickListener { finish() }
        findViewById<Button>(R.id.btnRetry).setOnClickListener { load() }

        findViewById<Button>(R.id.btnPrevWeek).setOnClickListener { setWeek(-1); load() }
        findViewById<Button>(R.id.btnNextWeek).setOnClickListener { setWeek(1); load() }

        if (formadorId <= 0) {
            showError("Formador inválido.")
            return
        }

        updateRangeLabel()
        load()
    }

    private fun setWeek(offsetWeeks: Long) {
        weekStart = weekStart.plusWeeks(offsetWeeks)
        start = weekStart
        end = weekStart.plusDays(6)
        updateRangeLabel()
    }

    private fun updateRangeLabel() {
        val f = DateTimeFormatter.ofPattern("dd/MM")
        txtRange.text = "Meu horário • ${start.format(f)} — ${end.format(f)}"
    }

    private fun load() {
        hideError()
        setEmpty(false)
        setLoading(true)

        val startStr = start.toString()
        val endStr = end.toString()

        scope.launch {
            try {
                val list = withContext(Dispatchers.IO) {
                    val token = TokenStore.get(this@HorarioFormadorActivity) ?: ""
                    val auth = "Bearer $token"
                    ApiClient.api.getHorarioFormador(auth, formadorId, startStr, endStr)
                }

                val rows = buildRowsByDay(list)
                adapter.update(rows)
                setEmpty(rows.isEmpty())
            } catch (e: Exception) {
                showError("Erro a carregar horário: ${e.message}")
            } finally {
                setLoading(false)
            }
        }
    }

    private fun buildRowsByDay(list: List<SessaoDto>): List<HorarioRow> {
        if (list.isEmpty()) return emptyList()

        fun toDate(iso: String): LocalDate = LocalDate.parse(iso.substring(0, 10))
        val ordered = list.sortedBy { it.horarioInicio }
        val grouped = ordered.groupBy { toDate(it.horarioInicio) }

        val out = mutableListOf<HorarioRow>()
        var addedAny = false

        for (i in 0..6) {
            val day = start.plusDays(i.toLong())
            out += HorarioRow.DayHeader(day)

            val dayItems = grouped[day].orEmpty()
            if (dayItems.isNotEmpty()) {
                addedAny = true
                dayItems.forEach { out += HorarioRow.SessaoItem(it) }
            } else {
                out += HorarioRow.EmptyDay(day)
            }
        }

        return if (!addedAny) emptyList() else out
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

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
