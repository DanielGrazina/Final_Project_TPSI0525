package com.example.secmanagementmobile

import android.app.DatePickerDialog
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.secmanagementmobile.network.ApiClient
import com.example.secmanagementmobile.storage.TokenStore
import kotlinx.coroutines.*
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import com.example.secmanagementmobile.models.*
import com.example.secmanagementmobile.ui.*

class HorarioActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private lateinit var spTipo: Spinner
    private lateinit var spEntidade: Spinner
    private lateinit var btnStart: Button
    private lateinit var btnEnd: Button
    private lateinit var btnCarregar: Button
    private lateinit var txtRange: TextView
    private lateinit var txtError: TextView
    private lateinit var progress: ProgressBar
    private lateinit var adapter: SessoesAdapter

    private var startDate: LocalDate = LocalDate.now()
    private var endDate: LocalDate = LocalDate.now().plusDays(7)
    private val fmtDate = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    // Guardamos o "id selecionado" independentemente do tipo
    private var selectedId: Int? = null

    // Listas carregadas
    private var turmas: List<TurmaDto> = emptyList()
    private var salas: List<SalaDto> = emptyList()
    private var formadores: List<FormadorDto> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_horario)

        spTipo = findViewById(R.id.spTipo)
        spEntidade = findViewById(R.id.spEntidade)
        btnStart = findViewById(R.id.btnStart)
        btnEnd = findViewById(R.id.btnEnd)
        btnCarregar = findViewById(R.id.btnCarregar)
        txtRange = findViewById(R.id.txtRange)
        txtError = findViewById(R.id.txtError)
        progress = findViewById(R.id.progress)

        val rv = findViewById<RecyclerView>(R.id.rvSessoes)
        adapter = SessoesAdapter(emptyList())
        rv.layoutManager = LinearLayoutManager(this)
        rv.adapter = adapter

        // Spinner tipo
        val tipos = listOf("Turma", "Formador", "Sala")
        spTipo.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, tipos)

        atualizarTextoIntervalo()

        btnStart.setOnClickListener { escolherData(isStart = true) }
        btnEnd.setOnClickListener { escolherData(isStart = false) }
        btnCarregar.setOnClickListener { carregarHorario() }

        // Sempre que muda o tipo, carrega lista correspondente
        spTipo.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                val tipo = spTipo.selectedItem.toString()
                carregarEntidades(tipo)
            }
            override fun onNothingSelected(parent: AdapterView<*>) {}
        }

        // Carregar entidades do tipo inicial
        carregarEntidades("Turma")
    }

    private fun atualizarTextoIntervalo() {
        txtRange.text = "Intervalo: ${startDate.format(fmtDate)} → ${endDate.format(fmtDate)}"
    }

    private fun escolherData(isStart: Boolean) {
        val base = if (isStart) startDate else endDate
        DatePickerDialog(
            this,
            { _, year, month, day ->
                val picked = LocalDate.of(year, month + 1, day)
                if (isStart) startDate = picked else endDate = picked
                atualizarTextoIntervalo()
            },
            base.year, base.monthValue - 1, base.dayOfMonth
        ).show()
    }

    private fun setEntidadeSpinner(nomes: List<String>, ids: List<Int>) {
        spEntidade.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, nomes)

        selectedId = if (ids.isNotEmpty()) ids[0] else null

        spEntidade.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                selectedId = ids.getOrNull(position)
            }
            override fun onNothingSelected(parent: AdapterView<*>) {}
        }
    }

    private fun carregarEntidades(tipo: String) {
        txtError.text = ""
        adapter.update(emptyList())

        scope.launch {
            progress.visibility = View.VISIBLE
            try {
                when (tipo) {
                    "Turma" -> {
                        turmas = withContext(Dispatchers.IO) { ApiClient.api.getTurmas() }
                        setEntidadeSpinner(
                            nomes = turmas.map { it.nome },
                            ids = turmas.map { it.id }
                        )
                    }
                    "Sala" -> {
                        salas = withContext(Dispatchers.IO) { ApiClient.api.getSalas() }
                        setEntidadeSpinner(
                            nomes = salas.map { it.nome },
                            ids = salas.map { it.id }
                        )
                    }
                    "Formador" -> {
                        val token = TokenStore(this@HorarioActivity).getToken()
                        if (token.isNullOrEmpty()) {
                            txtError.text = "Precisas de login para ver formadores."
                            setEntidadeSpinner(emptyList(), emptyList())
                            return@launch
                        }

                        formadores = withContext(Dispatchers.IO) {
                            ApiClient.api.getFormadores("Bearer $token")
                        }
                        setEntidadeSpinner(
                            nomes = formadores.map { it.nome },
                            ids = formadores.map { it.id }
                        )
                    }
                }

                if (selectedId == null) {
                    txtError.text = "Não há dados para listar neste tipo."
                }
            } catch (e: Exception) {
                txtError.text = "Erro a carregar lista: ${e.message}"
                setEntidadeSpinner(emptyList(), emptyList())
            } finally {
                progress.visibility = View.GONE
            }
        }
    }

    private fun carregarHorario() {
        txtError.text = ""

        val id = selectedId
        if (id == null) {
            txtError.text = "Seleciona uma entidade primeiro."
            return
        }

        if (endDate.isBefore(startDate)) {
            txtError.text = "A data fim tem de ser depois da data início."
            return
        }

        // ISO UTC
        val startIso = startDate.atStartOfDay().atOffset(ZoneOffset.UTC).toString()
        val endIso = endDate.atTime(23, 59, 59).atOffset(ZoneOffset.UTC).toString()

        val tipo = spTipo.selectedItem.toString()

        scope.launch {
            progress.visibility = View.VISIBLE
            try {
                val sessoes = withContext(Dispatchers.IO) {
                    when (tipo) {
                        "Turma" -> ApiClient.api.getHorarioTurma(id, startIso, endIso)
                        "Formador" -> ApiClient.api.getHorarioFormador(id, startIso, endIso)
                        else -> ApiClient.api.getHorarioSala(id, startIso, endIso)
                    }
                }

                adapter.update(sessoes)

                if (sessoes.isEmpty()) {
                    txtError.text = "Sem sessões nesse intervalo."
                }
            } catch (e: Exception) {
                txtError.text = "Erro a carregar horário: ${e.message}"
            } finally {
                progress.visibility = View.GONE
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
