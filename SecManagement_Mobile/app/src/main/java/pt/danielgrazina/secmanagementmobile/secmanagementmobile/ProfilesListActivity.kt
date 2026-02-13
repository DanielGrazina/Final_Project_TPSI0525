package pt.danielgrazina.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import pt.danielgrazina.secmanagementmobile.models.FormadorProfileDto
import pt.danielgrazina.secmanagementmobile.models.FormandoProfileDto
import pt.danielgrazina.secmanagementmobile.network.ApiClient
import pt.danielgrazina.secmanagementmobile.storage.TokenStore
import pt.danielgrazina.secmanagementmobile.ui.ProfilesAdapter
import kotlinx.coroutines.*

class ProfilesListActivity : AppCompatActivity() {

    private lateinit var btnFormandos: Button
    private lateinit var btnFormadores: Button
    private lateinit var edtSearch: EditText
    private lateinit var rv: RecyclerView
    private lateinit var txtStatus: TextView

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private enum class Mode { FORMANDOS, FORMADORES }
    private var mode: Mode = Mode.FORMANDOS

    private var formandos: List<FormandoProfileDto> = emptyList()
    private var formadores: List<FormadorProfileDto> = emptyList()

    private lateinit var adapter: ProfilesAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profiles_list)

        btnFormandos = findViewById(R.id.btnFormandos)
        btnFormadores = findViewById(R.id.btnFormadores)
        edtSearch = findViewById(R.id.edtSearch)
        rv = findViewById(R.id.rvProfiles)
        txtStatus = findViewById(R.id.txtStatus)

        adapter = ProfilesAdapter(emptyList()) { item ->
            val i = Intent(this, ProfileActivity::class.java).apply {
                putExtra(ProfileActivity.EXTRA_USER_ID, item.userId)
                putExtra(ProfileActivity.EXTRA_KIND, item.kind) // "formando" ou "formador"
            }
            startActivity(i)
        }

        rv.layoutManager = LinearLayoutManager(this)
        rv.adapter = adapter

        btnFormandos.setOnClickListener {
            mode = Mode.FORMANDOS
            renderList()
        }

        btnFormadores.setOnClickListener {
            mode = Mode.FORMADORES
            renderList()
        }

        // filtro simples (sem TextWatcher fancy)
        findViewById<Button>(R.id.btnSearch).setOnClickListener {
            renderList()
        }

        load()
    }

    private fun load() {
        val token = TokenStore.get(this)
        if (token.isNullOrEmpty()) {
            txtStatus.text = "Sem login."
            return
        }

        scope.launch {
            try {
                txtStatus.text = "A carregar perfis..."
                val t = "Bearer $token"

                val fmds = withContext(Dispatchers.IO) { ApiClient.api.getProfilesFormandos(t) }
                val fmdrs = withContext(Dispatchers.IO) { ApiClient.api.getProfilesFormadores(t) }

                formandos = fmds
                formadores = fmdrs

                txtStatus.text = "Perfis carregados ✅"
                renderList()
            } catch (e: Exception) {
                txtStatus.text = "Erro: ${e.message}"
            }
        }
    }

    private fun renderList() {
        val q = edtSearch.text?.toString()?.trim()?.lowercase().orEmpty()

        val items = when (mode) {
            Mode.FORMANDOS -> formandos.map {
                ProfilesAdapter.Item(
                    kind = "formando",
                    userId = it.userId,
                    title = it.nome ?: "—",
                    subtitle = it.email ?: it.numeroAluno ?: ""
                )
            }
            Mode.FORMADORES -> formadores.map {
                ProfilesAdapter.Item(
                    kind = "formador",
                    userId = it.userId,
                    title = it.nome ?: "—",
                    subtitle = it.email ?: it.areaEspecializacao ?: ""
                )
            }
        }.filter { item ->
            if (q.isBlank()) true else (item.title.lowercase().contains(q) || item.subtitle.lowercase().contains(q))
        }

        adapter.update(items)
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
