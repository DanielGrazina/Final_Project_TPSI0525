package com.example.secmanagementmobile

import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.bumptech.glide.Glide
import com.example.secmanagementmobile.network.ApiClient
import com.example.secmanagementmobile.storage.TokenStore
import com.example.secmanagementmobile.utils.JwtUtils
import kotlinx.coroutines.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.InputStream

class ProfileActivity : AppCompatActivity() {

    private var selectedUri: Uri? = null

    private lateinit var imgAvatar: ImageView
    private lateinit var btnPick: Button
    private lateinit var btnUpload: Button
    private lateinit var txtStatus: TextView

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private val pickImage = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            selectedUri = uri
            imgAvatar.setImageURI(uri)
            txtStatus.text = "Imagem selecionada ✅"
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)

        imgAvatar = findViewById(R.id.imgAvatar)
        btnPick = findViewById(R.id.btnPickImage)
        btnUpload = findViewById(R.id.btnUpload)
        txtStatus = findViewById(R.id.txtStatus)

        val tokenStore = TokenStore(this)
        val token = tokenStore.getToken()
        val role = tokenStore.getRole() ?: "User"

        val canEdit = role == "Admin" || role == "Secretaria" || role == "SuperAdmin"

        btnPick.isEnabled = canEdit
        btnUpload.isEnabled = canEdit

        if (!canEdit) {
            txtStatus.text = "Sem permissões para alterar a foto. (Role: $role)"
        } else {
            txtStatus.text = "Podes alterar a foto. (Role: $role)"
        }

        btnPick.setOnClickListener {
            if (!canEdit) return@setOnClickListener
            pickImage.launch("image/*")
        }

        btnUpload.setOnClickListener {
            if (!canEdit) return@setOnClickListener

            if (token.isNullOrEmpty()) {
                txtStatus.text = "Sem token. Faz login novamente."
                return@setOnClickListener
            }

            val uri = selectedUri
            if (uri == null) {
                txtStatus.text = "Escolhe uma imagem primeiro."
                return@setOnClickListener
            }

            val userId = JwtUtils.getUserId(token)
            if (userId == null) {
                txtStatus.text = "Não consegui obter o userId do token."
                return@setOnClickListener
            }

            scope.launch {
                try {
                    txtStatus.text = "A enviar avatar..."

                    val part = withContext(Dispatchers.IO) {
                        uriToMultipart(uri)
                    }

                    val res = withContext(Dispatchers.IO) {
                        ApiClient.api.uploadAvatar(
                            userId = userId,
                            ficheiro = part,
                            bearer = "Bearer $token"
                        )
                    }

                    // A API devolve algo tipo "/api/Profiles/file/123"
                    val fullUrl = ApiClient.baseUrl.trimEnd('/') + res.avatarUrl

                    txtStatus.text = "Upload OK ✅"

                    // Carregar imagem final já a vir da API
                    Glide.with(this@ProfileActivity)
                        .load(fullUrl)
                        .into(imgAvatar)

                } catch (e: Exception) {
                    txtStatus.text = "Erro no upload: ${e.message}"
                }
            }
        }
    }

    private fun uriToMultipart(uri: Uri): MultipartBody.Part {
        val contentType = contentResolver.getType(uri) ?: "application/octet-stream"
        val mediaType = contentType.toMediaTypeOrNull()

        val input: InputStream = contentResolver.openInputStream(uri)
            ?: throw Exception("Não consegui abrir a imagem.")

        val bytes = input.use { it.readBytes() }

        val requestBody = bytes.toRequestBody(mediaType)

        // ⚠️ O nome tem de ser "Ficheiro" (igual ao DTO do backend)
        return MultipartBody.Part.createFormData(
            "Ficheiro",
            "avatar.jpg",
            requestBody
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}


