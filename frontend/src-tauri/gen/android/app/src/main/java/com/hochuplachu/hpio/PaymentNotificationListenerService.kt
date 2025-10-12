package com.hochuplachu.hpio

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.annotation.Keep
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileWriter

@Keep
class PaymentNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "PaymentNotificationListener"
        private const val RAIFFEISEN_PACKAGE = "ru.raiffeisennews"
        private const val SHELL_PACKAGE = "com.android.shell"
        private const val NOTIFICATIONS_FILE = "pending_notifications.json"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)

        if (sbn == null) return

        Log.d(TAG, "Notification posted: ${sbn.packageName}")

        if (sbn.packageName == RAIFFEISEN_PACKAGE || sbn.packageName == SHELL_PACKAGE) {
            handleRaiffeisenNotification(sbn)
        }
    }

    private fun handleRaiffeisenNotification(sbn: StatusBarNotification) {
        try {
            val notification: Notification = sbn.notification
            val extras = notification.extras

            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

            Log.d(TAG, "Raiffeisen notification - Title: $title, Text: $text")

            if (text.isEmpty()) {
                Log.d(TAG, "Empty notification text, skipping")
                return
            }

            val notificationData = JSONObject().apply {
                put("packageName", sbn.packageName)
                put("title", title)
                put("text", text)
                put("timestamp", System.currentTimeMillis())
            }

            saveNotification(notificationData)
        } catch (e: Exception) {
            Log.e(TAG, "Error handling Raiffeisen notification", e)
        }
    }

    private fun saveNotification(notificationData: JSONObject) {
        try {
            val file = File(filesDir, NOTIFICATIONS_FILE)
            val notifications = if (file.exists()) {
                val content = file.readText()
                if (content.isNotEmpty()) JSONArray(content) else JSONArray()
            } else {
                JSONArray()
            }

            notifications.put(notificationData)

            FileWriter(file, false).use { writer ->
                writer.write(notifications.toString())
            }

            Log.d(TAG, "Saved notification to file: ${file.absolutePath}")
        } catch (e: Exception) {
            Log.e(TAG, "Error saving notification", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "Notification listener connected")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d(TAG, "Notification listener disconnected")
    }
}

