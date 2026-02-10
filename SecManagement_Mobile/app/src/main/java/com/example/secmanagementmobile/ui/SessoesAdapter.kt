package com.example.secmanagementmobile.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.secmanagementmobile.models.*
import com.example.secmanagementmobile.R

class SessoesAdapter(private var items: List<SessaoDto>) :
    RecyclerView.Adapter<SessoesAdapter.VH>() {

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        val l1: TextView = v.findViewById(R.id.txtLinha1)
        val l2: TextView = v.findViewById(R.id.txtLinha2)
        val l3: TextView = v.findViewById(R.id.txtLinha3)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_sessao, parent, false)
        return VH(v)
    }

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val s = items[position]
        holder.l1.text = "${s.turmaNome} — ${s.moduloNome}"
        holder.l2.text = "Formador: ${s.formadorNome} | Sala: ${s.salaNome}"
        holder.l3.text = "${s.horarioInicio}  →  ${s.horarioFim}"
    }

    fun update(newItems: List<SessaoDto>) {
        items = newItems
        notifyDataSetChanged()
    }
}
