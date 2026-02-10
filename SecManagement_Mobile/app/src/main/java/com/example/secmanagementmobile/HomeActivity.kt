package com.example.secmanagementmobile

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity
import com.example.secmanagementmobile.storage.TokenStore

class HomeActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        findViewById<Button>(R.id.btnCursos).setOnClickListener {
            startActivity(Intent(this, CursosListActivity::class.java))
        }

        findViewById<Button>(R.id.btnPerfil).setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
        }

        findViewById<Button>(R.id.btnHorario).setOnClickListener {
            startActivity(Intent(this, HorarioActivity::class.java))
        }

        findViewById<Button>(R.id.btnLogout).setOnClickListener {
            TokenStore(this).clear()
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }

    }
}

