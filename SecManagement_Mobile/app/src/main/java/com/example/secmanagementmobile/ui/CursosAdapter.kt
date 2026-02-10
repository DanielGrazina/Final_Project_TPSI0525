package com.example.secmanagementmobile.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.secmanagementmobile.models.*
import com.example.secmanagementmobile.R


class CursosAdapter(
    private var items: List<CursoDto>,
    private val onClick: (CursoDto) -> Unit
) : RecyclerView.Adapter<CursosAdapter.VH>() {

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        val nome: TextView = v.findViewById(R.id.txtNome)
        val area: TextView = v.findViewById(R.id.txtArea)
        val nivel: TextView = v.findViewById(R.id.txtNivel)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_curso, parent, false)
        return VH(v)
    }

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val c = items[position]
        holder.nome.text = c.nome
        holder.area.text = "Área: ${c.areaNome}"
        holder.nivel.text = "Nível: ${c.nivelCurso}"

        holder.itemView.setOnClickListener { onClick(c) }
    }

    fun update(newItems: List<CursoDto>) {
        items = newItems
        notifyDataSetChanged()
    }
}
