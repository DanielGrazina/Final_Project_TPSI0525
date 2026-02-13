package com.example.secmanagementmobile.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.secmanagementmobile.R
import com.example.secmanagementmobile.models.HorarioRow
import com.example.secmanagementmobile.models.SessaoDto
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class HorarioSemanaAdapter(
    private var items: List<HorarioRow>,
    private val onSessaoClick: (SessaoDto) -> Unit
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    companion object {
        private const val TYPE_HEADER = 0
        private const val TYPE_SESSAO = 1
        private const val TYPE_EMPTY = 2
    }

    override fun getItemViewType(position: Int): Int {
        return when (items[position]) {
            is HorarioRow.DayHeader -> TYPE_HEADER
            is HorarioRow.SessaoItem -> TYPE_SESSAO
            is HorarioRow.EmptyDay -> TYPE_EMPTY
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return when (viewType) {
            TYPE_HEADER -> {
                val v = LayoutInflater.from(parent.context)
                    .inflate(R.layout.item_dia_header, parent, false)
                HeaderVH(v)
            }
            TYPE_EMPTY -> {
                val v = LayoutInflater.from(parent.context)
                    .inflate(R.layout.item_dia_vazio, parent, false)
                EmptyVH(v)
            }
            else -> {
                val v = LayoutInflater.from(parent.context)
                    .inflate(R.layout.item_sessao, parent, false)
                SessaoVH(v, onSessaoClick) // ✅ passa o callback
            }
        }
    }

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val row = items[position]) {
            is HorarioRow.DayHeader -> (holder as HeaderVH).bind(row)
            is HorarioRow.SessaoItem -> (holder as SessaoVH).bind(row)
            is HorarioRow.EmptyDay -> (holder as EmptyVH).bind()
        }
    }

    fun update(newItems: List<HorarioRow>) {
        items = newItems
        notifyDataSetChanged()
    }

    class HeaderVH(v: View) : RecyclerView.ViewHolder(v) {
        private val txt: TextView = v.findViewById(R.id.txtDayHeader)

        fun bind(h: HorarioRow.DayHeader) {
            val dayPt = when (h.date.dayOfWeek.value) {
                1 -> "Segunda"
                2 -> "Terça"
                3 -> "Quarta"
                4 -> "Quinta"
                5 -> "Sexta"
                6 -> "Sábado"
                else -> "Domingo"
            }
            val f = DateTimeFormatter.ofPattern("dd/MM")
            val isToday = h.date == LocalDate.now()
            val suffix = if (isToday) " (Hoje)" else ""

            txt.text = "$dayPt • ${h.date.format(f)}$suffix"
            txt.alpha = if (isToday) 1.0f else 0.90f
        }
    }

    class EmptyVH(v: View) : RecyclerView.ViewHolder(v) {
        fun bind() { /* texto já está no XML */ }
    }

    class SessaoVH(v: View, private val onSessaoClick: (SessaoDto) -> Unit) :
        RecyclerView.ViewHolder(v) {

        private val modulo: TextView = v.findViewById(R.id.txtModulo)
        private val formador: TextView = v.findViewById(R.id.txtFormador)
        private val sala: TextView = v.findViewById(R.id.txtSala)
        private val hora: TextView = v.findViewById(R.id.txtHora)

        fun bind(row: HorarioRow.SessaoItem) {
            val s = row.sessao
            modulo.text = s.moduloNome
            formador.text = "Formador: ${s.formadorNome}"
            sala.text = "Sala: ${s.salaNome}"
            hora.text = formatRange(s.horarioInicio, s.horarioFim)
            itemView.setOnClickListener { onSessaoClick(s) }
        }

        private fun formatRange(start: String, end: String): String {
            fun hhmm(x: String): String {
                return if (x.length >= 16 && x.contains("T")) x.substring(11, 16) else x
            }
            return "${hhmm(start)} - ${hhmm(end)}"
        }
    }
}
