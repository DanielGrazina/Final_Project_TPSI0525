package pt.danielgrazina.secmanagementmobile.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import pt.danielgrazina.secmanagementmobile.R
import pt.danielgrazina.secmanagementmobile.models.SalaDto

class SalaAdapter(
    private var items: List<SalaDto>,
    private val onClick: (SalaDto) -> Unit
) : RecyclerView.Adapter<SalaAdapter.VH>() {

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        val txtNome: TextView = v.findViewById(R.id.txtSalaNome)
        val txtSub: TextView = v.findViewById(R.id.txtSalaSub)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_sala, parent, false)
        return VH(v)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        val s = items[position]
        holder.txtNome.text = s.nome
        holder.txtSub.text = "ID: ${s.id}"
        holder.itemView.setOnClickListener { onClick(s) }
    }

    override fun getItemCount(): Int = items.size

    fun update(newItems: List<SalaDto>) {
        items = newItems
        notifyDataSetChanged()
    }
}
