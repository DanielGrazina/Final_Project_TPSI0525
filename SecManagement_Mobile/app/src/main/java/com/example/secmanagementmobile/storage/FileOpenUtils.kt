package com.example.secmanagementmobile.utils

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.ResponseBody
import java.io.File

object FileOpenUtils {

    suspend fun saveToCache(
        context: Context,
        body: ResponseBody,
        fileName: String
    ): File = withContext(Dispatchers.IO) {
        val file = File(context.cacheDir, fileName)
        body.byteStream().use { input ->
            file.outputStream().use { output ->
                input.copyTo(output)
            }
        }
        file
    }

    fun openFile(context: Context, file: File, mime: String) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.provider",
            file
        )

        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, mime)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        context.startActivity(Intent.createChooser(intent, "Abrir ficheiro"))
    }
}
