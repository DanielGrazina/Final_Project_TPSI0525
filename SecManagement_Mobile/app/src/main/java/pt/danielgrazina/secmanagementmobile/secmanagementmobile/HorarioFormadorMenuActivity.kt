package pt.danielgrazina.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

class HorarioFormadorMenuActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_horario_formador_menu)

        val btnMeuHorario = findViewById<Button>(R.id.btnMeuHorario)
        val btnTurmasCoordenador = findViewById<Button>(R.id.btnTurmasCoordenador)

        val formadorId = intent.getIntExtra("formadorId", -1)

        val btnVoltar = findViewById<Button>(R.id.btnVoltar)
        btnVoltar.setOnClickListener {
            finish()
        }

        btnMeuHorario.setOnClickListener {
            startActivity(
                Intent(this, HorarioFormadorActivity::class.java)
                    .putExtra("formadorId", formadorId)
            )
        }

        btnTurmasCoordenador.setOnClickListener {
            startActivity(
                Intent(this, TurmasSelectActivity::class.java)
                    .putExtra("coordenadorId", formadorId)
            )
        }
    }
}

