package com.example.secmanagementmobile.network

import com.example.secmanagementmobile.models.*
import okhttp3.MultipartBody
import retrofit2.http.*
import okhttp3.ResponseBody
import retrofit2.http.Streaming


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

    @GET("api/Turmas/coordenador/{id}")
    suspend fun getTurmasCoordenador(
        @Header("Authorization") bearer: String,
        @Path("id") id: Int
    ): List<TurmaDto>



    // ---------- SESSOES / HORARIO ----------
    @GET("api/Sessoes/turma/{id}")
    suspend fun getHorarioTurma(
        @Header("Authorization") bearer: String,
        @Path("id") turmaId: Int,
        @Query("start") start: String,
        @Query("end") end: String
    ): List<SessaoDto>

    @GET("api/Sessoes/formador/{id}")
    suspend fun getHorarioFormador(
        @Header("Authorization") bearer: String,
        @Path("id") id: Int,
        @Query("start") start: String,
        @Query("end") end: String
    ): List<SessaoDto>

    @GET("api/Sessoes/sala/{id}")
    suspend fun getHorarioSala(
        @Header("Authorization") bearer: String,
        @Path("id") salaId: Int,
        @Query("start") start: String,
        @Query("end") end: String
    ): List<SessaoDto>


    @GET("api/Sessoes/formando/{id}")
    suspend fun getHorarioFormando(
        @Header("Authorization") bearer: String,
        @Path("id") id: Int,
        @Query("start") start: String,
        @Query("end") end: String
    ): List<SessaoDto>


    // ---------- Formando ----------
    @GET("api/Inscricoes/aluno/{formandoId}")
    suspend fun getInscricoesAluno(
        @Header("Authorization") bearer: String,
        @Path("formandoId") formandoId: Int
    ): List<InscricaoDto>


    // ---------- PROFILES (VISUALIZAÇÃO) ----------

    // Listas (para staff) — se o backend permitir
    @GET("api/Profiles/formandos")
    suspend fun getProfilesFormandos(
        @Header("Authorization") bearer: String
    ): List<FormandoProfileDto>

    @GET("api/Profiles/formadores")
    suspend fun getProfilesFormadores(
        @Header("Authorization") bearer: String
    ): List<FormadorProfileDto>

    // Detalhe (staff ou “o próprio” — vamos reforçar isso no backend mais tarde)
    @GET("api/Profiles/formando/{userId}")
    suspend fun getProfileFormando(
        @Header("Authorization") bearer: String,
        @Path("userId") userId: Int
    ): FormandoProfileDto

    @GET("api/Profiles/formador/{userId}")
    suspend fun getProfileFormador(
        @Header("Authorization") bearer: String,
        @Path("userId") userId: Int
    ): FormadorProfileDto

    // PDFs
    @Streaming
    @GET("api/Profiles/formando/{userId}/pdf")
    suspend fun downloadPdfFormando(
        @Header("Authorization") bearer: String,
        @Path("userId") userId: Int
    ): ResponseBody

    @Streaming
    @GET("api/Profiles/formador/{userId}/pdf")
    suspend fun downloadPdfFormador(
        @Header("Authorization") bearer: String,
        @Path("userId") userId: Int
    ): ResponseBody

    // Download de anexo por ID
    @Streaming
    @GET("api/Profiles/file/{fileId}")
    suspend fun downloadFicheiro(
        @Header("Authorization") bearer: String,
        @Path("fileId") fileId: Int
    ): ResponseBody

    @POST("api/Auth/google")
    suspend fun loginGoogle(@Body body: GoogleLoginRequest): AuthResponse

    @POST("api/Auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest)

    @POST("api/Auth/reset-password")
    suspend fun resetPassword(@Body body: ResetPasswordRequest)


}
