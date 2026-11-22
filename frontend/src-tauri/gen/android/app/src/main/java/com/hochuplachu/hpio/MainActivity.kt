package com.hochuplachu.hpio

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
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

  // Системная кнопка/жест «Назад». При targetSdk 36 (Android 16) система больше не
  // присылает KEYCODE_BACK в onKeyDown, поэтому обработчик WryActivity не срабатывает
  // и приложение просто закрывается. Передаём нажатие в WebView: React закрывает
  // верхний слой или переходит на родительский экран, а на корневом экране
  // сообщает "exit" — тогда сворачиваем приложение.
  private val backCallback = object : OnBackPressedCallback(true) {
    override fun handleOnBackPressed() {
      dispatchBackToWebView()
    }
  }

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
    onBackPressedDispatcher.addCallback(this, backCallback)
  }

  // На старых версиях Android KEYCODE_BACK приходит сюда, и WryActivity сам делает
  // webView.goBack() в обход React. Направляем его в общий диспетчер «Назад».
  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_BACK) {
      if (event == null || event.repeatCount == 0) {
        onBackPressedDispatcher.onBackPressed()
      }
      return true
    }
    return super.onKeyDown(keyCode, event)
  }

  private fun dispatchBackToWebView() {
    val view = webView
    if (view == null) {
      moveTaskToBack(true)
      return
    }

    val script = """
      (function() {
        try {
          return typeof window.__hpioHandleBack === 'function'
            ? window.__hpioHandleBack()
            : 'unavailable';
        } catch (e) {
          return 'unavailable';
        }
      })();
    """.trimIndent()

    view.evaluateJavascript(script) { rawResult ->
      // evaluateJavascript возвращает JSON: строка приходит в кавычках
      when (rawResult?.trim('"')) {
        "handled" -> Unit
        "exit" -> moveTaskToBack(true)
        else -> {
          // React ещё не загрузился — ведём себя как обычный браузер
          Log.w(TAG, "Back handler unavailable in WebView, result=$rawResult")
          if (view.canGoBack()) view.goBack() else moveTaskToBack(true)
        }
      }
    }
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    this.webView = webView

    // Disable zoom controls and pinch-to-zoom
    webView.settings.apply {
      setSupportZoom(false)
      builtInZoomControls = false
      displayZoomControls = false
      useWideViewPort = false
      loadWithOverviewMode = false
    }

    // Prevent pinch-to-zoom by overriding touch events
    webView.setOnTouchListener { _, event ->
      if (event != null && event.pointerCount > 1) {
        // Multi-touch detected (pinch gesture), consume the event
        true
      } else {
        // Single touch, allow normal scrolling/tapping
        false
      }
    }
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
    AppUpdateHelper.resumePendingInstall(this)
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
    val script = """
      (function() {
        const detail = { timestamp: $timestamp };
        if (window.__TAURI_INTERNALS__?.event?.emit) {
          window.__TAURI_INTERNALS__.event.emit('payment-notification-received', detail);
        }
        const nativeEvent = new CustomEvent('hpio-native-notification', { detail });
        window.dispatchEvent(nativeEvent);
      })();
    """.trimIndent()

    webView?.post {
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
