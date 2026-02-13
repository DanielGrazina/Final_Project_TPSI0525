package pt.danielgrazina.secmanagementmobile.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import pt.danielgrazina.secmanagementmobile.models.SessaoDto
import pt.danielgrazina.secmanagementmobile.R

class SessoesAdapter(
    private var items: List<SessaoDto>
) : RecyclerView.Adapter<SessoesAdapter.VH>() {

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        val modulo: TextView = v.findViewById(R.id.txtModulo)
        val formador: TextView = v.findViewById(R.id.txtFormador)
        val sala: TextView = v.findViewById(R.id.txtSala)
        val hora: TextView = v.findViewById(R.id.txtHora)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_sessao, parent, false)
        return VH(v)
    }

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val s = items[position]
        holder.modulo.text = s.moduloNome
        holder.formador.text = "Formador: ${s.formadorNome}"
        holder.sala.text = "Sala: ${s.salaNome}"
        holder.hora.text = formatRange(s.horarioInicio, s.horarioFim)
    }

    fun update(newItems: List<SessaoDto>) {
        items = newItems
        notifyDataSetChanged()
    }

    private fun formatRange(start: String, end: String): String {
        // Mostra só HH:mm se vier em ISO; caso contrário mostra como está
        fun hhmm(x: String): String {
            return if (x.length >= 16 && x.contains("T")) x.substring(11, 16) else x
        }
        return "${hhmm(start)} - ${hhmm(end)}"
    }
}

