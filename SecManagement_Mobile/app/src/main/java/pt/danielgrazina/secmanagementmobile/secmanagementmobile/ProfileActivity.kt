package pt.danielgrazina.secmanagementmobile

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.bumptech.glide.Glide
import pt.danielgrazina.secmanagementmobile.models.FormadorProfileDto
import pt.danielgrazina.secmanagementmobile.models.FormandoProfileDto
import pt.danielgrazina.secmanagementmobile.network.ApiClient
import pt.danielgrazina.secmanagementmobile.storage.JwtUtils
import pt.danielgrazina.secmanagementmobile.storage.TokenStore
import pt.danielgrazina.secmanagementmobile.utils.FileOpenUtils
import kotlinx.coroutines.*
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import pt.danielgrazina.secmanagementmobile.models.UserFicheiroDto
import pt.danielgrazina.secmanagementmobile.ui.FicheirosAdapter


class ProfileActivity : AppCompatActivity() {

    private lateinit var rvFicheiros: RecyclerView
    private lateinit var txtFicheirosEmpty: TextView
    private lateinit var ficheirosAdapter: FicheirosAdapter
    private lateinit var imgAvatar: ImageView
    private lateinit var tvNome: TextView
    private lateinit var tvTipo: TextView

    private lateinit var tvEmail: TextView
    private lateinit var tvTelefone: TextView
    private lateinit var tvNif: TextView
    private lateinit var tvMorada: TextView
    private lateinit var tvCc: TextView

    private lateinit var tvExtra1: TextView
    private lateinit var tvExtra2: TextView

    private lateinit var btnOpenPdf: Button
    private lateinit var txtStatus: TextView

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private enum class ProfileKind { FORMANDO, FORMADOR, NONE }
    private var kind: ProfileKind = ProfileKind.NONE
    private var userId: Int? = null
    private var token: String? = null

    companion object {
        const val EXTRA_USER_ID = "extra_user_id"
        const val EXTRA_KIND = "extra_kind" // "formando" | "formador"
    }


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)

        imgAvatar = findViewById(R.id.imgAvatar)
        tvNome = findViewById(R.id.tvNome)
        tvTipo = findViewById(R.id.tvTipo)

        tvEmail = findViewById(R.id.tvEmail)
        tvTelefone = findViewById(R.id.tvTelefone)
        tvNif = findViewById(R.id.tvNif)
        tvMorada = findViewById(R.id.tvMorada)
        tvCc = findViewById(R.id.tvCc)

        tvExtra1 = findViewById(R.id.tvExtra1)
        tvExtra2 = findViewById(R.id.tvExtra2)

        btnOpenPdf = findViewById(R.id.btnOpenPdf)
        txtStatus = findViewById(R.id.txtStatus)
        rvFicheiros = findViewById(R.id.rvFicheiros)
        txtFicheirosEmpty = findViewById(R.id.txtFicheirosEmpty)

        ficheirosAdapter = FicheirosAdapter(emptyList()) { f ->
            downloadAndOpenFicheiro(f)
        }

        rvFicheiros.layoutManager = LinearLayoutManager(this)
        rvFicheiros.adapter = ficheirosAdapter


        token = TokenStore.get(this)
        if (token.isNullOrEmpty()) {
            txtStatus.text = "Sem login. Faz login novamente."
            btnOpenPdf.isEnabled = false
            return
        }

        val tokenStr = token!!
        val tokenUserId = JwtUtils.userId(tokenStr)

        val extraUserId = intent.getIntExtra(EXTRA_USER_ID, -1).takeIf { it > 0 }
        val extraKind = intent.getStringExtra(EXTRA_KIND)

        if (extraUserId != null && !extraKind.isNullOrBlank()) {
            // ✅ modo staff: abrir perfil de outra pessoa
            userId = extraUserId
            kind = when (extraKind.lowercase()) {
                "formando" -> ProfileKind.FORMANDO
                "formador" -> ProfileKind.FORMADOR
                else -> ProfileKind.NONE
            }
        } else {
            // ✅ modo normal: abrir o próprio
            userId = tokenUserId
            kind = when {
                JwtUtils.isFormandoFlag(tokenStr) -> ProfileKind.FORMANDO
                JwtUtils.isFormadorFlag(tokenStr) -> ProfileKind.FORMADOR
                else -> ProfileKind.NONE
            }
        }

        btnOpenPdf.isEnabled = (kind != ProfileKind.NONE)

        btnOpenPdf.setOnClickListener {
            if (kind == ProfileKind.NONE) return@setOnClickListener
            downloadAndOpenPdf()
        }

        loadMyProfile()
    }

    private fun loadMyProfile() {
        val t = token ?: return
        val uid = userId ?: return

        scope.launch {
            try {
                txtStatus.text = "A carregar perfil..."
                when (kind) {
                    ProfileKind.FORMANDO -> {
                        val dto = withContext(Dispatchers.IO) {
                            ApiClient.api.getProfileFormando("Bearer $t", uid)
                        }
                        bindFormando(dto)

                    }
                    ProfileKind.FORMADOR -> {
                        val dto = withContext(Dispatchers.IO) {
                            ApiClient.api.getProfileFormador("Bearer $t", uid)
                        }
                        bindFormador(dto)
                    }
                    ProfileKind.NONE -> {
                        txtStatus.text = "Este utilizador não tem perfil de Formando/Formador."
                        tvTipo.text = "Sem perfil"
                    }
                }
            } catch (e: Exception) {
                txtStatus.text = "Erro a carregar perfil: ${e.message}"
            }
        }
    }

    private fun bindFormando(p: FormandoProfileDto) {
        tvTipo.text = "Formando"
        tvNome.text = p.nome

        tvEmail.text = "Email: ${s(p.email)}"
        tvTelefone.text = "Telefone: ${p.telefone ?: "-"}"
        tvNif.text = "NIF: ${p.nif ?: "-"}"
        tvMorada.text = "Morada: ${p.morada ?: "-"}"
        tvCc.text = "CC: ${p.cc ?: "-"}"

        tvExtra1.text = "Nº Aluno: ${s(p.numeroAluno)}"
        tvExtra2.text = "Turma: ${p.turmaNome ?: "-"}"

        loadAvatar(p.avatar)

        showFicheiros(p.ficheiros)

        txtStatus.text = "Perfil carregado ✅"
    }

    private fun s(v: String?): String {
        val t = v?.trim()
        return if (t.isNullOrEmpty()) "-" else t
    }


    private fun bindFormador(p: FormadorProfileDto) {
        tvTipo.text = "Formador"
        tvNome.text = s(p.nome)

        tvEmail.text = "Email: ${s(p.email)}"
        tvTelefone.text = "Telefone: ${s(p.telefone)}"
        tvNif.text = "NIF: ${s(p.nif)}"
        tvMorada.text = "Morada: ${s(p.morada)}"
        tvCc.text = "CC: ${s(p.cc)}"

        tvExtra1.text = "Área: ${s(p.areaEspecializacao)}"
        tvExtra2.text = "Cor calendário: ${s(p.corCalendario)}"

        loadAvatar(p.avatar)

        showFicheiros(p.ficheiros)

        txtStatus.text = "Perfil carregado ✅"
    }


    private fun loadAvatar(avatarPath: String?) {
        if (avatarPath.isNullOrBlank()) return

        val url = if (avatarPath.startsWith("http", ignoreCase = true)) {
            avatarPath
        } else {
            ApiClient.baseUrl.trimEnd('/') + avatarPath
        }

        Glide.with(this)
            .load(url)
            .into(imgAvatar)
    }

    private fun downloadAndOpenPdf() {
        val t = token ?: return
        val uid = userId ?: return

        scope.launch {
            try {
                txtStatus.text = "A descarregar PDF..."
                val body = withContext(Dispatchers.IO) {
                    when (kind) {
                        ProfileKind.FORMANDO -> ApiClient.api.downloadPdfFormando("Bearer $t", uid)
                        ProfileKind.FORMADOR -> ApiClient.api.downloadPdfFormador("Bearer $t", uid)
                        ProfileKind.NONE -> throw IllegalStateException("Sem perfil")
                    }
                }

                val fileName = when (kind) {
                    ProfileKind.FORMANDO -> "perfil_formando_$uid.pdf"
                    ProfileKind.FORMADOR -> "perfil_formador_$uid.pdf"
                    ProfileKind.NONE -> "perfil.pdf"
                }

                val file = FileOpenUtils.saveToCache(this@ProfileActivity, body, fileName)
                FileOpenUtils.openFile(this@ProfileActivity, file, "application/pdf")
                txtStatus.text = "PDF aberto ✅"
            } catch (e: Exception) {
                txtStatus.text = "Erro no PDF: ${e.message}"
            }
        }
    }
    private fun showFicheiros(list: List<UserFicheiroDto>?) {
        val safe = list ?: emptyList()

        if (safe.isEmpty()) {
            txtFicheirosEmpty.visibility = View.VISIBLE
            rvFicheiros.visibility = View.GONE
        } else {
            txtFicheirosEmpty.visibility = View.GONE
            rvFicheiros.visibility = View.VISIBLE
            ficheirosAdapter.update(safe)
        }
    }


    private fun guessMime(nome: String?, contentType: String?): String {
        if (!contentType.isNullOrBlank() && contentType.contains("/")) return contentType
        val n = (nome ?: "").lowercase()
        return when {
            n.endsWith(".pdf") -> "application/pdf"
            n.endsWith(".png") -> "image/png"
            n.endsWith(".jpg") || n.endsWith(".jpeg") -> "image/jpeg"
            n.endsWith(".txt") -> "text/plain"
            else -> "*/*"
        }
    }

    private fun sanitizeFileName(name: String): String =
        name.replace(Regex("""[^\w\.\- ]"""), "_").trim().ifBlank { "ficheiro" }

    private fun downloadAndOpenFicheiro(f: UserFicheiroDto) {
        val t = token ?: return

        scope.launch {
            try {
                txtStatus.text = "A descarregar anexo..."
                val body = withContext(Dispatchers.IO) {
                    ApiClient.api.downloadFicheiro("Bearer $t", f.id)
                }

                val safeName = sanitizeFileName(f.nomeFicheiro)
                val file = FileOpenUtils.saveToCache(this@ProfileActivity, body, safeName)
                val mime = guessMime(f.nomeFicheiro, f.contentType)

                FileOpenUtils.openFile(this@ProfileActivity, file, mime)
                txtStatus.text = "Anexo aberto ✅"
            } catch (e: Exception) {
                txtStatus.text = "Erro no anexo: ${e.message}"
            }
        }
    }


    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
