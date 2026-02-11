package com.example.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.example.secmanagementmobile.storage.*
import com.google.android.material.card.MaterialCardView

class HomeActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        findViewById<android.widget.Button>(R.id.btnLogout).setOnClickListener {
            TokenStore(this).clear()
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }

        findViewById<MaterialCardView>(R.id.cardCursos).setOnClickListener {
            startActivity(Intent(this, CursosActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardHorario).setOnClickListener {
            startActivity(Intent(this, HorarioActivity::class.java))
        }

        /*findViewById<MaterialCardView>(R.id.cardTurmas).setOnClickListener {
            startActivity(Intent(this, TurmasActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardSalas).setOnClickListener {
            startActivity(Intent(this, SalasActivity::class.java))
        }*/

        findViewById<MaterialCardView>(R.id.cardPerfil).setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
        }
    }
}

