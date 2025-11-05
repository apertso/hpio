package com.hochuplachu.hpio

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.annotation.Keep
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

@Keep
class PaymentNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "PaymentNotificationListener"
        private const val NOTIFICATIONS_FILE = "pending_notifications.json"
        private const val DEDUP_FILE = "notification_dedup.json"
        private const val DEDUP_TIME_WINDOW_MS = 60_000L // 60 seconds

        private val dedupLock = Any()

        // Pre-compiled regex patterns for better performance
        private val REFUND_PATTERN = Regex("\\b(пополнен|зачислен|получен|возврат|refunded|returned)\\b")
        private val TRANSFER_PATTERN = Regex("\\b(перевод|transfer|отправлен|получателю)\\b")
        private val PAYMENT_PATTERN = Regex("\\b(покупка|оплата|заплатили|списание|платеж|transaction|purchase|payment)\\b")

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

        /**
         * Notification type enumeration
         */
        enum class NotificationType {
            PAYMENT,     // Payment/Purchase transaction
            REFUND,      // Refund/Return
            TRANSFER,    // Money transfer
            OTHER        // Unknown type
        }

        /**
         * Detects the notification type based on message content
         * Uses pre-compiled regex patterns for better performance
         */
        fun detectNotificationType(message: String): NotificationType {
            val text = message.lowercase()

            // Check for refunds (earliest exit for most common case)
            if (REFUND_PATTERN.containsMatchIn(text)) {
                return NotificationType.REFUND
            }

            // Check for transfers
            if (TRANSFER_PATTERN.containsMatchIn(text)) {
                return NotificationType.TRANSFER
            }

            // Check for payments/purchases
            if (PAYMENT_PATTERN.containsMatchIn(text)) {
                return NotificationType.PAYMENT
            }

            return NotificationType.OTHER
        }

        /**
         * Determines if the notification is a payment type notification
         */
        fun isPaymentNotification(text: String, title: String = ""): Boolean {
            val combinedText = "$title $text"
            return detectNotificationType(combinedText) == NotificationType.PAYMENT
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)

        sbn ?: return

        // Early exit for unsupported packages to minimize processing
        if (!SUPPORTED_PACKAGES.contains(sbn.packageName)) {
            return
        }

        // Extract notification data once
        val notification: Notification = sbn.notification
        val extras = notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

        // Early exit for empty text
        if (text.isEmpty()) {
            return
        }

        // Log all notifications from supported packages for debugging
        LoggerUtil.debug(this, TAG, "Received notification from ${sbn.packageName}: title='$title', text='$text'")

        // Check if this is a payment notification
        if (!isPaymentNotification(text, title)) {
            LoggerUtil.debug(this, TAG, "Notification filtered out - not a payment type: ${sbn.packageName}")
            return
        }

        // Check for duplicates with persistent storage
        val notificationId = "${sbn.packageName}|$title|$text"
        if (isDuplicate(notificationId)) {
            LoggerUtil.debug(this, TAG, "Duplicate notification detected and skipped: $notificationId")
            return
        }

        // Only now do the heavy work (file I/O)
        handlePaymentNotification(sbn, title, text)
    }

    private fun isDuplicate(notificationId: String): Boolean {
        return synchronized(dedupLock) {
            try {
                val dedupFile = File(filesDir, DEDUP_FILE)
                val currentTime = System.currentTimeMillis()

                val dedupData = if (dedupFile.exists() && dedupFile.length() > 0) {
                    try {
                        JSONObject(dedupFile.readText())
                    } catch (e: Exception) {
                        JSONObject()
                    }
                } else {
                    JSONObject()
                }

                // Clean up old entries
                val keysToRemove = mutableListOf<String>()
                dedupData.keys().forEach { key ->
                    val timestamp = dedupData.optLong(key, 0L)
                    if (currentTime - timestamp > DEDUP_TIME_WINDOW_MS) {
                        keysToRemove.add(key)
                    }
                }
                keysToRemove.forEach { dedupData.remove(it) }

                // Check if this notification is a duplicate
                if (dedupData.has(notificationId)) {
                    return@synchronized true
                }

                // Add current notification to dedup
                dedupData.put(notificationId, currentTime)

                // Save updated dedup data atomically
                val tempFile = File(filesDir, "$DEDUP_FILE.tmp")
                tempFile.writeText(dedupData.toString())
                tempFile.renameTo(dedupFile)

                return@synchronized false
            } catch (e: Exception) {
                LoggerUtil.error(this, TAG, "Error checking for duplicates", e)
                return@synchronized false
            }
        }
    }

    private fun handlePaymentNotification(sbn: StatusBarNotification, title: String, text: String) {
        try {
            val notificationData = JSONObject().apply {
                put("packageName", sbn.packageName)
                put("title", title)
                put("text", text)
                put("timestamp", System.currentTimeMillis())
            }

            saveNotification(notificationData)
        } catch (e: Exception) {
            LoggerUtil.error(this, TAG, "Error handling payment notification", e)
        }
    }

    private fun saveNotification(notificationData: JSONObject) {
        try {
            val file = File(filesDir, NOTIFICATIONS_FILE)

            // Read existing notifications only if file exists
            val notifications = if (file.exists() && file.length() > 0) {
                try {
                    JSONArray(file.readText())
                } catch (e: Exception) {
                    // If file is corrupted, start fresh
                    JSONArray()
                }
            } else {
                JSONArray()
            }

            // Add new notification
            notifications.put(notificationData)

            LoggerUtil.info(this, TAG, "Notification saved to pending_notifications.json: ${notificationData.toString()}")

            // Write atomically using temp file for data safety
            val tempFile = File(filesDir, "$NOTIFICATIONS_FILE.tmp")
            tempFile.writeText(notifications.toString())
            tempFile.renameTo(file)

            // Show local notification to user
            showPaymentNotification(notifications.length())
        } catch (e: Exception) {
            LoggerUtil.error(this, TAG, "Error saving notification", e)
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
            LoggerUtil.error(this, TAG, "Error showing payment notification", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        LoggerUtil.info(this, TAG, "Notification listener connected and ready to receive notifications")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        LoggerUtil.warn(this, TAG, "Notification listener disconnected - will not receive notifications until reconnected")
    }

    override fun onCreate() {
        super.onCreate()
        LoggerUtil.info(this, TAG, "Notification listener service created")
    }

    override fun onDestroy() {
        super.onDestroy()
        LoggerUtil.info(this, TAG, "Notification listener service destroyed")
    }
}


