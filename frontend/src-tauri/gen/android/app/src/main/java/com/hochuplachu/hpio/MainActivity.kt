package com.hochuplachu.hpio

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    intent.getStringExtra("click_action")?.let { action ->
      // Store the action to be read by the frontend
      getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
        .edit()
        .putString("pending_navigation", action)
        .apply()
    }
  }
}
