package com.example.secmanagementmobile.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.secmanagementmobile.R
import com.example.secmanagementmobile.models.HorarioRow
import java.time.format.DateTimeFormatter

class HorarioSemanaAdapter(
    private var items: List<HorarioRow>
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    companion object {
        private const val TYPE_HEADER = 0
        private const val TYPE_SESSAO = 1
    }

    override fun getItemViewType(position: Int): Int {
        return when (items[position]) {
            is HorarioRow.DayHeader -> TYPE_HEADER
            is HorarioRow.SessaoItem -> TYPE_SESSAO
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return when (viewType) {
            TYPE_HEADER -> {
                val v = LayoutInflater.from(parent.context)
                    .inflate(R.layout.item_dia_header, parent, false)
                HeaderVH(v)
            }
            else -> {
                val v = LayoutInflater.from(parent.context)
                    .inflate(R.layout.item_sessao, parent, false)
                SessaoVH(v)
            }
        }
    }

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val row = items[position]) {
            is HorarioRow.DayHeader -> (holder as HeaderVH).bind(row)
            is HorarioRow.SessaoItem -> (holder as SessaoVH).bind(row)
        }
    }

    fun update(newItems: List<HorarioRow>) {
        items = newItems
        notifyDataSetChanged()
    }

    class HeaderVH(v: View) : RecyclerView.ViewHolder(v) {
        private val txt: TextView = v.findViewById(R.id.txtDayHeader)

        fun bind(h: HorarioRow.DayHeader) {
            val day = h.date.dayOfWeek // MONDAY...
            val dayPt = when (day.value) {
                1 -> "Segunda"
                2 -> "Terça"
                3 -> "Quarta"
                4 -> "Quinta"
                5 -> "Sexta"
                6 -> "Sábado"
                else -> "Domingo"
            }
            val f = DateTimeFormatter.ofPattern("dd/MM")
            txt.text = "$dayPt • ${h.date.format(f)}"
        }
    }

    class SessaoVH(v: View) : RecyclerView.ViewHolder(v) {
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
        }

        private fun formatRange(start: String, end: String): String {
            fun hhmm(x: String): String {
                return if (x.length >= 16 && x.contains("T")) x.substring(11, 16) else x
            }
            return "${hhmm(start)} - ${hhmm(end)}"
        }
    }
}
