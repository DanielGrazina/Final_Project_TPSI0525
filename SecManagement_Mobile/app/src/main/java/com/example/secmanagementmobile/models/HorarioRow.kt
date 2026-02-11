package com.example.secmanagementmobile.models

import java.time.LocalDate

sealed class HorarioRow {
    data class DayHeader(val date: LocalDate) : HorarioRow()
    data class SessaoItem(val sessao: SessaoDto) : HorarioRow()
}
