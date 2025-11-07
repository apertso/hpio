package com.hochuplachu.hpio

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.util.Log
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.localbroadcastmanager.content.LocalBroadcastManager
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

  private var webView: WebView? = null

  private val notificationReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action == PaymentNotificationListenerService.ACTION_NEW_NOTIFICATION) {
        Log.d(TAG, "Received NEW_NOTIFICATION broadcast")
        emitNotificationEvent()
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    setupGlobalExceptionHandler()
    super.onCreate(savedInstanceState)
    logAppLifecycle("APP_START")
    registerNotificationReceiver()
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    this.webView = webView
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
    unregisterNotificationReceiver()
    logAppLifecycle("APP_STOP")
  }

  private fun registerNotificationReceiver() {
    try {
      val filter = IntentFilter(PaymentNotificationListenerService.ACTION_NEW_NOTIFICATION)
      LocalBroadcastManager.getInstance(this).registerReceiver(notificationReceiver, filter)
      Log.d(TAG, "Notification receiver registered")
    } catch (e: Exception) {
      Log.e(TAG, "Error registering notification receiver", e)
    }
  }

  private fun unregisterNotificationReceiver() {
    try {
      LocalBroadcastManager.getInstance(this).unregisterReceiver(notificationReceiver)
      Log.d(TAG, "Notification receiver unregistered")
    } catch (e: Exception) {
      Log.e(TAG, "Error unregistering notification receiver", e)
    }
  }

  private fun emitNotificationEvent() {
    val timestamp = System.currentTimeMillis()
    webView?.post {
      val script = "window.__TAURI_INTERNALS__?.event?.emit('payment-notification-received', {timestamp: $timestamp})"
      webView?.evaluateJavascript(script, null)
    }
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
          [$timestamp] [K] [ERROR] [KOTLIN_EXCEPTION] {"message":"${throwable.message?.replace("\"", "\\\"")}","thread":"${thread.name}","stack":"$stackTrace"}

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
      LoggerUtil.info(this, TAG, "LIFECYCLE: $event")
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
