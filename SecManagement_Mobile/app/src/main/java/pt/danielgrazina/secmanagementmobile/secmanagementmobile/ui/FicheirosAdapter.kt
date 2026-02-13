package pt.danielgrazina.secmanagementmobile.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import pt.danielgrazina.secmanagementmobile.R
import pt.danielgrazina.secmanagementmobile.models.UserFicheiroDto

class FicheirosAdapter(
    private var items: List<UserFicheiroDto>,
    private val onClick: (UserFicheiroDto) -> Unit
) : RecyclerView.Adapter<FicheirosAdapter.VH>() {

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        val nome: TextView = v.findViewById(R.id.txtNomeFicheiro)
        val tipo: TextView = v.findViewById(R.id.txtTipoFicheiro)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_ficheiro, parent, false)
        return VH(v)
    }

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val f = items[position]
        holder.nome.text = f.nomeFicheiro
        holder.tipo.text = f.contentType
        holder.itemView.setOnClickListener { onClick(f) }
    }

    fun update(newItems: List<UserFicheiroDto>) {
        items = newItems
        notifyDataSetChanged()
    }
}
