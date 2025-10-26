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
        private const val NOTIFICATIONS_FILE = "pending_notifications.json"

        // Track recently processed notification keys to avoid duplicates
        private val processedNotificationKeys = mutableSetOf<String>()
        private const val MAX_TRACKED_KEYS = 100 // Limit memory usage

        // Supported package names for payment notification parsing
        private val SUPPORTED_PACKAGES = setOf(
            // Test
            "com.android.shell",
            // Bank applications
            "ru.raiffeisennews",                  // Раиффайзен
            "ru.sberbankmobile",                  // Сбербанк
            "com.idamob.tinkoff.android",         // Тинькофф
            "ru.vtb24.mobilebanking",             // ВТБ
            "ru.alfabank.mobile.android",         // Альфа-Банк
            "ru.sovcombank.halvacard",            // Совкомбанк
            "ru.pochtabank.pochtaapp",            // Почта Банк
            "ru.rshb.mobilebank",                 // Россельхозбанк
            "ru.otpbank.online",                  // ОТП Банк
            "ru.psb.mobile",                      // Промсвязьбанк
            "ru.unicreditbank.mobile",            // Уникредит
            "ru.mtsbank.mobile",                  // МТС Банк
            "ru.bspb.mobile",                     // Банк Санкт-Петербург
            "ru.akbmetallbank.mobile",            // Металлинвестбанк
            // Fintech applications
            "ru.yoo.money",
            "com.yandex.bank",
            "ru.nspk.sbp.pay",
            "ru.ozon.fintech.finance",
            // Marketplace applications
            "ru.ozon.app.android",
            "com.wildberries.ru",
            "ru.market.android",
            "com.avito.android",
            "ru.aliexpress.buyer",
            "ru.lamoda",
            // Business applications
            "ru.sberbank.bankingbusiness",
            "com.idamob.tinkoff.business",
            "ru.vtb.mobile.business",
            "ru.alfabank.mobile.android.biz",
            "ru.sovcombank.business",
            "ru.modulebank",
            "ru.tochka.app",
            "ru.openbusiness.app",
            "ru.rosbank.business",
            "ru.uralsib.business",
            "ru.psb.business",
            "ru.mtsbank.business",
            "ru.bspb.business",
            "ru.tcsbank.business",
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)

        if (sbn == null) return

        Log.d(TAG, "Notification posted: ${sbn.packageName}, key: ${sbn.key}")

        // Check if we've already processed this notification using its unique key
        if (processedNotificationKeys.contains(sbn.key)) {
            Log.d(TAG, "Duplicate notification detected (key: ${sbn.key}), skipping")
            return
        }

        if (SUPPORTED_PACKAGES.contains(sbn.packageName)) {
            handlePaymentNotification(sbn)

            // Mark this notification as processed
            processedNotificationKeys.add(sbn.key)

            // Prevent memory leak by limiting the set size
            if (processedNotificationKeys.size > MAX_TRACKED_KEYS) {
                // Remove oldest entries (in practice, this is fine since we just need recent deduplication)
                val iterator = processedNotificationKeys.iterator()
                repeat(20) {
                    if (iterator.hasNext()) {
                        iterator.next()
                        iterator.remove()
                    }
                }
            }
        }
    }

    private fun handlePaymentNotification(sbn: StatusBarNotification) {
        try {
            val notification: Notification = sbn.notification
            val extras = notification.extras

            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

            Log.d(TAG, "Payment notification from ${sbn.packageName} - Title: $title, Text: $text")

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
            Log.e(TAG, "Error handling payment notification from ${sbn.packageName}", e)
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

            // Показываем локальное уведомление о новом платеже
            showPaymentNotification(notifications.length())
        } catch (e: Exception) {
            Log.e(TAG, "Error saving notification", e)
        }
    }

    private fun showPaymentNotification(count: Int) {
        try {
            val title: String
            val body: String

            if (count == 1) {
                title = "Новое предложение платежа"
                body = "Откройте приложение для обработки"
            } else {
                title = "Новые предложения платежей"
                body = "У вас $count предложений для обработки"
            }

            NotificationPermissionHelper.showLocalNotification(
                this,
                title,
                body,
                count
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error showing payment notification", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "Notification listener connected")

        // Clear the processed keys cache when listener reconnects
        // to avoid memory buildup and handle service restarts
        processedNotificationKeys.clear()
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d(TAG, "Notification listener disconnected")
    }
}

