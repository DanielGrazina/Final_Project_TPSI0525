package pt.danielgrazina.secmanagementmobile.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import pt.danielgrazina.secmanagementmobile.models.TurmaDto
import pt.danielgrazina.secmanagementmobile.R

class TurmasAdapter(
    private var items: List<TurmaDto>,
    private val onClick: (TurmaDto) -> Unit
) : RecyclerView.Adapter<TurmasAdapter.VH>() {

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        val nome: TextView = v.findViewById(R.id.txtNome)
        val extra: TextView = v.findViewById(R.id.txtExtra)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_turma, parent, false)
        return VH(v)
    }

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val t = items[position]
        holder.nome.text = t.nome
        holder.extra.text = buildString {
            append("Curso: ${t.cursoNome}")
            if (!t.estado.isNullOrBlank()) append(" • ${t.estado}")
            if (!t.local.isNullOrBlank()) append(" • ${t.local}")
        }


        holder.itemView.setOnClickListener { onClick(t) }
    }

    fun update(newItems: List<TurmaDto>) {
        items = newItems
        notifyDataSetChanged()
    }
}
