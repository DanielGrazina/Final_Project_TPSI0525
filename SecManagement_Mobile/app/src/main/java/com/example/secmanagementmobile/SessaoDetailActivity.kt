package com.example.secmanagementmobile

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class SessaoDetailActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sessao_detail)

        findViewById<Button>(R.id.btnVoltar).setOnClickListener { finish() }

        val modulo = intent.getStringExtra("modulo") ?: "—"
        val formador = intent.getStringExtra("formador") ?: "—"
        val turma = intent.getStringExtra("turma") ?: "—"
        val sala = intent.getStringExtra("sala") ?: "—"
        val inicio = intent.getStringExtra("inicio") ?: "—"
        val fim = intent.getStringExtra("fim") ?: "—"

        findViewById<TextView>(R.id.txtModulo).text = modulo
        findViewById<TextView>(R.id.txtFormador).text = "Formador: $formador"
        findViewById<TextView>(R.id.txtTurma).text = "Turma: $turma"
        findViewById<TextView>(R.id.txtSala).text = "Sala: $sala"
        findViewById<TextView>(R.id.txtHora).text = "${hhmm(inicio)} - ${hhmm(fim)}"
    }

    private fun hhmm(x: String): String {
        return if (x.length >= 16 && x.contains("T")) x.substring(11, 16) else x
    }
}
