package com.hochuplachu.hpio

import android.content.Context
import android.util.Log
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.*

object LoggerUtil {
    private const val LOG_FILE_NAME = "logs.txt"
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private fun writeToFile(context: Context, logEntry: String) {
        try {
            // Use dataDir instead of filesDir to match Tauri's BaseDirectory.AppData
            val logFile = File(context.dataDir, LOG_FILE_NAME)
            FileWriter(logFile, true).use { writer ->
                writer.write(logEntry)
                writer.flush()
            }
        } catch (e: Exception) {
            Log.e("LoggerUtil", "Error writing to log file", e)
        }
    }

    fun info(context: Context, tag: String, message: String) {
        Log.i(tag, message)
        val timestamp = dateFormat.format(Date())
        val logEntry = "[$timestamp] [K] [INFO] [$tag] $message\n"
        writeToFile(context, logEntry)
    }

    fun warn(context: Context, tag: String, message: String) {
        Log.w(tag, message)
        val timestamp = dateFormat.format(Date())
        val logEntry = "[$timestamp] [K] [WARN] [$tag] $message\n"
        writeToFile(context, logEntry)
    }

    fun error(context: Context, tag: String, message: String, throwable: Throwable? = null) {
        if (throwable != null) {
            Log.e(tag, message, throwable)
        } else {
            Log.e(tag, message)
        }
        val timestamp = dateFormat.format(Date())
        val errorMessage = if (throwable != null) {
            "$message: ${throwable.message}"
        } else {
            message
        }
        val logEntry = "[$timestamp] [K] [ERROR] [$tag] $errorMessage\n"
        writeToFile(context, logEntry)
    }

    fun debug(context: Context, tag: String, message: String) {
        Log.d(tag, message)
        val timestamp = dateFormat.format(Date())
        val logEntry = "[$timestamp] [K] [DEBUG] [$tag] $message\n"
        writeToFile(context, logEntry)
    }
}


