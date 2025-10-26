package com.hochuplachu.hpio

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.enableEdgeToEdge
import java.io.File
import java.io.FileWriter
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : TauriActivity() {
  companion object {
    private const val TAG = "MainActivity"
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    setupGlobalExceptionHandler()
    super.onCreate(savedInstanceState)
    logAppLifecycle("APP_START")
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    intent.getStringExtra("click_action")?.let { action ->
      getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
        .edit()
        .putString("pending_navigation", action)
        .apply()
    }
  }

  override fun onResume() {
    super.onResume()
    logAppLifecycle("APP_RESUME")
  }

  override fun onPause() {
    super.onPause()
    logAppLifecycle("APP_PAUSE")
  }

  override fun onDestroy() {
    super.onDestroy()
    logAppLifecycle("APP_STOP")
  }

  private fun setupGlobalExceptionHandler() {
    val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()

    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      try {
        Log.e(TAG, "Uncaught exception in thread ${thread.name}", throwable)

        val timestamp = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
          timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())

        val stackTrace = StringWriter().apply {
          throwable.printStackTrace(PrintWriter(this))
        }.toString().replace("\"", "\\\"").replace("\n", "\\n")

        val errorLog = """
          [$timestamp] [ERROR] [KOTLIN_EXCEPTION] {"message":"${throwable.message?.replace("\"", "\\\"")}","thread":"${thread.name}","stack":"$stackTrace"}

        """.trimIndent()

        writeToLogFile(errorLog)
      } catch (e: Exception) {
        Log.e(TAG, "Error writing exception to log", e)
      }

      defaultHandler?.uncaughtException(thread, throwable)
    }
  }

  private fun logAppLifecycle(event: String) {
    try {
      val timestamp = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
      }.format(Date())

      val logEntry = """[$timestamp] [INFO] [LIFECYCLE] {"event":"$event"}
      """.trimMargin()

      writeToLogFile(logEntry)
    } catch (e: Exception) {
      Log.e(TAG, "Error writing lifecycle log", e)
    }
  }

  private fun writeToLogFile(logEntry: String) {
    try {
      val logFile = File(filesDir, "logs.txt")
      FileWriter(logFile, true).use { writer ->
        writer.write(logEntry)
      }
      Log.d(TAG, "Wrote to log file: ${logFile.absolutePath}")
    } catch (e: Exception) {
      Log.e(TAG, "Error writing to log file", e)
    }
  }
}
