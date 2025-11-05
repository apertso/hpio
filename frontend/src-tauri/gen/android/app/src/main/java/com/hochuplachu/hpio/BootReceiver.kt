package com.hochuplachu.hpio

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.annotation.Keep

@Keep
class BootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            "android.intent.action.QUICKBOOT_POWERON" -> {
                Log.d(TAG, "Device booted or app updated, notification listener should reconnect automatically")
                // NotificationListenerService will be rebound automatically by the system
                // if it was enabled before boot/update
            }
        }
    }
}

