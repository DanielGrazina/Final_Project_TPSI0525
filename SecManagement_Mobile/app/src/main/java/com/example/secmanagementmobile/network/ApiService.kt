package com.example.secmanagementmobile.network

import com.example.secmanagementmobile.models.*
import okhttp3.MultipartBody
import retrofit2.http.*

interface ApiService {

    // ---------- AUTH ----------
    @POST("api/Auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    // ---------- CURSOS ----------
    @GET("api/Cursos")
    suspend fun getCursos(): List<CursoDto>

    @GET("api/Cursos/{id}")
    suspend fun getCurso(@Path("id") id: Int): CursoDto

    // ---------- TURMAS ----------
    @GET("api/Turmas")
    suspend fun getTurmas(): List<TurmaDto>

    @GET("api/Cursos/{id}/turmas")
    suspend fun getTurmasByCurso(@Path("id") cursoId: Int): List<TurmaDto>

    // ---------- SALAS ----------
    @GET("api/Salas")
    suspend fun getSalas(): List<SalaDto>

    // ---------- FORMADORES (PRECISA TOKEN) ----------
    @GET("api/Formadores")
    suspend fun getFormadores(@Header("Authorization") bearer: String): List<FormadorDto>

    // ---------- SESSOES / HORARIO ----------
    @GET("api/Sessoes/turma/{turmaId}")
    suspend fun getHorarioTurma(
        @Path("turmaId") turmaId: Int,
        @Query("start") start: String,
        @Query("end") end: String
    ): List<SessaoDto>

    @GET("api/Sessoes/formador/{formadorId}")
    suspend fun getHorarioFormador(
        @Path("formadorId") formadorId: Int,
        @Query("start") start: String,
        @Query("end") end: String
    ): List<SessaoDto>

    @GET("api/Sessoes/sala/{salaId}")
    suspend fun getHorarioSala(
        @Path("salaId") salaId: Int,
        @Query("start") start: String,
        @Query("end") end: String
    ): List<SessaoDto>

    // ---------- AVATAR UPLOAD (se ainda quiseres manter) ----------
    @Multipart
    @POST("api/Profiles/user/{userId}/avatar")
    suspend fun uploadAvatar(
        @Path("userId") userId: Int,
        @Part ficheiro: MultipartBody.Part,
        @Header("Authorization") bearer: String
    ): AvatarResponse
}
