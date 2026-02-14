package pt.danielgrazina.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.GridLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import pt.danielgrazina.secmanagementmobile.models.SessaoDto
import pt.danielgrazina.secmanagementmobile.network.ApiClient
import pt.danielgrazina.secmanagementmobile.storage.JwtUtils
import pt.danielgrazina.secmanagementmobile.storage.TokenStore
import pt.danielgrazina.secmanagementmobile.ui.SessoesAdapter
import com.google.android.material.card.MaterialCardView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate

class HomeActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private lateinit var proximasAdapter: SessoesAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)


        findViewById<Button>(R.id.btnLogout).setOnClickListener {
            TokenStore.clear(this)
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }

        findViewById<MaterialCardView>(R.id.cardCursos).setOnClickListener {
            startActivity(Intent(this, CursosActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardHorario).setOnClickListener {
            startActivity(Intent(this, HorarioHubActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardTurmas).setOnClickListener {
            startActivity(Intent(this, TurmasActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardSalas).setOnClickListener {
            startActivity(Intent(this, SalasActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardPerfil).setOnClickListener {
            val token = TokenStore.get(this).orEmpty()
            val roles = JwtUtils.roles(token).map { it.lowercase().removePrefix("role_") }

            val isFormando =
                roles.contains("formando") ||
                        JwtUtils.isFormandoFlag(token) ||
                        (JwtUtils.formandoId(token) != null)

            val isFormador =
                roles.contains("formador") ||
                        JwtUtils.isFormadorFlag(token) ||
                        (JwtUtils.formadorId(token) != null)

            val isStaff =
                roles.any { it in listOf("secretaria", "admin", "superadmin") } ||
                        (!isFormando && !isFormador)

            val intent = if (isStaff) {
                Intent(this, ProfilesListActivity::class.java) // ✅ lista para staff
            } else {
                Intent(this, ProfileActivity::class.java)      // ✅ meu perfil
            }

            startActivity(intent)
        }

        findViewById<MaterialCardView>(R.id.cardAvaliacoes).setOnClickListener {
            startActivity(Intent(this, AvaliacoesActivity::class.java))
        }



        applyRoleUI()
    }

    override fun onResume() {
        super.onResume()
        applyRoleUI()
        carregarProximasSessoes()
    }

    private fun applyRoleUI() {
        val token = TokenStore.get(this).orEmpty()
        val roles = JwtUtils.roles(token).map { it.lowercase().removePrefix("role_") }

        val isFormando =
            roles.contains("formando") ||
                    JwtUtils.isFormandoFlag(token) ||
                    (JwtUtils.formandoId(token) != null)

        val isFormador =
            roles.contains("formador") ||
                    JwtUtils.isFormadorFlag(token) ||
                    (JwtUtils.formadorId(token) != null)

        val isStaff =
            roles.any { it in listOf("secretaria", "admin", "superadmin") } ||
                    (!isFormando && !isFormador)

        val cardCursos = findViewById<MaterialCardView>(R.id.cardCursos)
        val cardTurmas = findViewById<MaterialCardView>(R.id.cardTurmas)
        val cardSalas = findViewById<MaterialCardView>(R.id.cardSalas)
        val cardHorario = findViewById<MaterialCardView>(R.id.cardHorario)
        val cardPerfil = findViewById<MaterialCardView>(R.id.cardPerfil)
        val cardAvaliacoes = findViewById<MaterialCardView>(R.id.cardAvaliacoes)

        // default: tudo visível
        cardCursos.visibility = View.VISIBLE
        cardTurmas.visibility = View.VISIBLE
        cardSalas.visibility = View.VISIBLE
        cardHorario.visibility = View.VISIBLE
        cardPerfil.visibility = View.VISIBLE

        when {
            isStaff -> {
                // staff não deve ver avaliações
                cardAvaliacoes.visibility = View.GONE
            }

            isFormando -> {
                // formando pode ver avaliações + horário + perfil
                cardCursos.visibility = View.GONE
                cardTurmas.visibility = View.GONE
                cardSalas.visibility = View.GONE
                // avaliações fica visível
            }

            isFormador -> {
                // formador não vê avaliações
                cardCursos.visibility = View.GONE
                cardTurmas.visibility = View.GONE
                cardSalas.visibility = View.GONE
                cardAvaliacoes.visibility = View.GONE
            }
        }


        // ✅ re-organiza o GridLayout para não ficar torto com GONE
        reflowAtalhosGrid()
    }

    private fun reflowAtalhosGrid() {
        val grid = findViewById<GridLayout>(R.id.gridAtalhos)

        val cards = listOf(
            findViewById<MaterialCardView>(R.id.cardCursos),
            findViewById<MaterialCardView>(R.id.cardHorario),
            findViewById<MaterialCardView>(R.id.cardTurmas),
            findViewById<MaterialCardView>(R.id.cardSalas),
            findViewById<MaterialCardView>(R.id.cardPerfil)
        )

        val visible = cards.filter { it.visibility == View.VISIBLE }
        val cols = 2

        visible.forEachIndexed { index, v ->
            val row = index / cols
            val col = index % cols

            // Se a última linha ficar com 1 item, ele ocupa 2 colunas (fica bonito e centrado)
            val isLastSingle = (index == visible.size - 1) && (visible.size % cols == 1)
            val span = if (isLastSingle) 2 else 1
            val colStart = if (isLastSingle) 0 else col

            val lp = (v.layoutParams as GridLayout.LayoutParams)
            lp.rowSpec = GridLayout.spec(row, 1)
            lp.columnSpec = GridLayout.spec(colStart, span, 1f)
            lp.width = 0 // necessário quando usamos weight

            v.layoutParams = lp
        }
    }

    private fun carregarProximasSessoes() {
        // Se o layout ainda não tiver estes componentes, não faz nada.
        val txtEmpty = findViewById<TextView?>(R.id.txtProximasEmpty) ?: return
        val progress = findViewById<ProgressBar?>(R.id.progressProximas) ?: return
        val rv = findViewById<RecyclerView?>(R.id.rvProximas) ?: return

        // garantir adapter
        if (!::proximasAdapter.isInitialized) {
            proximasAdapter = SessoesAdapter(emptyList())
            rv.layoutManager = LinearLayoutManager(this)
            rv.adapter = proximasAdapter
        }

        txtEmpty.visibility = View.GONE
        progress.visibility = View.VISIBLE

        val token = TokenStore.get(this)
        if (token.isNullOrEmpty()) {
            progress.visibility = View.GONE
            txtEmpty.visibility = View.VISIBLE
            return
        }
        val auth = "Bearer $token"

        val roles = JwtUtils.roles(token).map { it.lowercase().removePrefix("role_") }
        val formandoId = JwtUtils.formandoId(token)
        val formadorId = JwtUtils.formadorId(token)

        val start = LocalDate.now().toString()
        val end = LocalDate.now().plusDays(7).toString()

        scope.launch {
            try {
                val sessoes = withContext(Dispatchers.IO) {
                    when {
                        (roles.contains("formador") || JwtUtils.isFormadorFlag(token)) && formadorId != null ->
                            ApiClient.api.getHorarioFormador(auth, formadorId, start, end)

                        (roles.contains("formando") || JwtUtils.isFormandoFlag(token)) && formandoId != null -> {
                            val inscricoes = ApiClient.api.getInscricoesAluno(auth, formandoId)
                            val turmaId = inscricoes.firstOrNull { it.turmaId != null }?.turmaId
                                ?: inscricoes.firstOrNull()?.turmaId
                            if (turmaId == null) emptyList<SessaoDto>()
                            else ApiClient.api.getHorarioTurma(auth, turmaId, start, end)
                        }

                        else -> emptyList<SessaoDto>()
                    }
                }

                val ordered = sessoes.sortedBy { it.horarioInicio }.take(8)
                proximasAdapter.update(ordered)
                if (ordered.isEmpty()) txtEmpty.visibility = View.VISIBLE

            } catch (_: Exception) {
                txtEmpty.text = "Erro ao carregar próximas sessões."
                txtEmpty.visibility = View.VISIBLE
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
