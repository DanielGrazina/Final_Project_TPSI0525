package com.example.secmanagementmobile

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.example.secmanagementmobile.network.ApiClient
import kotlinx.coroutines.*

class CursoDetailActivity : AppCompatActivity() {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_curso_detail)

        val txtTitle = findViewById<TextView>(R.id.txtTitle)
        val txtInfo = findViewById<TextView>(R.id.txtInfo)

        val cursoId = intent.getIntExtra("cursoId", -1)
        if (cursoId == -1) {
            txtInfo.text = "Curso inválido."
            return
        }

        scope.launch {
            try {
                val curso = withContext(Dispatchers.IO) {
                    ApiClient.api.getCurso(cursoId)
                }
                txtTitle.text = curso.nome
                txtInfo.text = """
                    Área: ${curso.areaNome}
                    Nível: ${curso.nivelCurso}
                    AreaId: ${curso.areaId}
                    CursoId: ${curso.id}
                """.trimIndent()
            } catch (e: Exception) {
                txtInfo.text = "Erro: ${e.message}"
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}

