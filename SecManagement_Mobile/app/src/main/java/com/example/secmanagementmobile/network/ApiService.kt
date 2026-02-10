package com.example.secmanagementmobile.network

import retrofit2.http.*
import com.example.secmanagementmobile.models.*
import okhttp3.MultipartBody
import retrofit2.http.GET
import retrofit2.http.Path
interface ApiService {
    @POST("api/Auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @GET("api/Cursos")
    suspend fun getCursos(@Header("Authorization") bearer: String): List<CursoDto>

    @GET("api/Cursos")
    suspend fun getCursos(): List<CursoDto>

    @GET("api/Cursos/{id}")
    suspend fun getCurso(@Path("id") id: Int): CursoDto

    @Multipart
    @POST("api/Profiles/user/{userId}/avatar")
    suspend fun uploadAvatar(
        @Path("userId") userId: Int,
        @Part ficheiro: MultipartBody.Part,
        @Header("Authorization") bearer: String
    ): AvatarResponse

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

    @GET("api/Turmas")
    suspend fun getTurmas(): List<TurmaDto>

    @GET("api/Formadores")
    suspend fun getFormadores(@Header("Authorization") bearer: String): List<FormadorDto>

    @GET("api/Salas")
    suspend fun getSalas(): List<SalaDto>

}
