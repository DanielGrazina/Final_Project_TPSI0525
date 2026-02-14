package pt.danielgrazina.secmanagementmobile.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import pt.danielgrazina.secmanagementmobile.R
import pt.danielgrazina.secmanagementmobile.models.AvaliacaoDto

class AvaliacoesAdapter(
    private var items: List<AvaliacaoDto>
) : RecyclerView.Adapter<AvaliacoesAdapter.VH>() {

    fun update(newItems: List<AvaliacaoDto>) {
        items = newItems
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_avaliacao, parent, false)
        return VH(v)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    class VH(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvTitulo: TextView = itemView.findViewById(R.id.tvTitulo)
        private val tvSub: TextView = itemView.findViewById(R.id.tvSub)
        private val tvNota: TextView = itemView.findViewById(R.id.tvNota)
        private val tvObs: TextView = itemView.findViewById(R.id.tvObs)

        fun bind(a: AvaliacaoDto) {
            tvTitulo.text = a.moduloNome.ifBlank { "Módulo" }

            tvSub.text = "Turma: ${a.turmaNome}"

            tvNota.text = "Nota: ${a.avaliacao}"

            val obs = a.observacoes.trim()
            if (obs.isNotBlank()) {
                tvObs.visibility = View.VISIBLE
                tvObs.text = obs
            } else {
                tvObs.visibility = View.GONE
            }
        }
    }
}
