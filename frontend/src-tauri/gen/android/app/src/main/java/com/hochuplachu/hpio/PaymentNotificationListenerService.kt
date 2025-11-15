package com.hochuplachu.hpio

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.hochuplachu.hpio.BuildConfig
import androidx.annotation.Keep
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

@Keep
class PaymentNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "PaymentNotificationListener"
        private const val NOTIFICATIONS_FILE = "pending_notifications.json"
        private const val MAX_PENDING_NOTIFICATIONS = 50
        private const val DEDUP_FILE = "notification_dedup.json"
        private const val DEDUP_TIME_WINDOW_MS = 60_000L // 60 seconds
        const val ACTION_NEW_NOTIFICATION = "com.hochuplachu.hpio.NEW_NOTIFICATION"

        private val dedupLock = Any()

        // Предкомпилированные regex паттерны для лучшей производительности
        private val REFUND_PATTERN = Regex("\\b(пополнен|зачислен|получен|возврат|refunded|returned)\\b")
        private val TRANSFER_PATTERN = Regex("\\b(перевод|transfer|отправлен|получателю)\\b")
        private val PAYMENT_PATTERN = Regex("\\b(покупка|оплата|заплатили|списание|платеж|transaction|purchase|payment)\\b")

        // Поддерживаемые имена пакетов для парсинга уведомлений о платежах
        private val SUPPORTED_PACKAGES = (setOf(
            // Тестовые
            "com.android.shell",
            // Банковские приложения
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
            // Финтех приложения
            "ru.yoo.money",
            "com.yandex.bank",
            "ru.nspk.sbp.pay",
            "ru.ozon.fintech.finance",
            // Маркетплейсы
            "ru.ozon.app.android",
            "com.wildberries.ru",
            "ru.market.android",
            "com.avito.android",
            "ru.aliexpress.buyer",
            "ru.lamoda",
            // Бизнес приложения
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
        ) + BuildConfig.APPLICATION_ID)

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

            // Проверяем возвраты (ранний выход для самого частого случая)
            if (REFUND_PATTERN.containsMatchIn(text)) {
                return NotificationType.REFUND
            }

            // Проверяем переводы
            if (TRANSFER_PATTERN.containsMatchIn(text)) {
                return NotificationType.TRANSFER
            }

            // Проверяем платежи/покупки
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

        // Ранний выход для неподдерживаемых пакетов для минимизации обработки
        if (!SUPPORTED_PACKAGES.contains(sbn.packageName)) {
            return
        }

        // Извлекаем данные уведомления один раз
        val notification: Notification = sbn.notification
        val extras = notification.extras
        val isInternalSummary = extras.getBoolean(NotificationPermissionHelper.INTERNAL_SUMMARY_EXTRA, false)

        var title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val bigTitle = extras.getCharSequence(Notification.EXTRA_TITLE_BIG)?.toString()
        val subTitle = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()
        if (!bigTitle.isNullOrBlank()) {
            title = bigTitle.trim()
        } else if (title.isBlank() && !subTitle.isNullOrBlank()) {
            title = subTitle.trim()
        } else if (title.isBlank()) {
            val infoTitle = extras.getCharSequence(Notification.EXTRA_INFO_TEXT)?.toString()
            if (!infoTitle.isNullOrBlank()) {
                title = infoTitle.trim()
            }
        }
        if (title.isBlank()) {
            title = notification.tickerText?.toString()?.trim() ?: ""
        }

        var text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        if (text.isBlank()) {
            val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            if (!bigText.isNullOrBlank()) {
                text = bigText.trim()
            }
        }
        if (text.isBlank()) {
            val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
            if (!textLines.isNullOrEmpty()) {
                text = textLines.joinToString(" ") { it?.toString() ?: "" }.trim()
            }
        }
        if (text.isBlank()) {
            val summaryText = extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString()
            if (!summaryText.isNullOrBlank()) {
                text = summaryText.trim()
            }
        }
        if (text.isBlank()) {
            val infoText = extras.getCharSequence(Notification.EXTRA_INFO_TEXT)?.toString()
            if (!infoText.isNullOrBlank()) {
                text = infoText.trim()
            }
        }
        if (text.isBlank()) {
            text = notification.tickerText?.toString()?.trim() ?: ""
        }

        try {
            val extraKeys = extras.keySet()
            val snapshotBuilder = StringBuilder()
            for (key in extraKeys) {
                val value = extras.get(key)
                snapshotBuilder.append(key)
                snapshotBuilder.append("=")
                snapshotBuilder.append(value?.toString() ?: "null")
                snapshotBuilder.append("; ")
            }
            val snapshot = snapshotBuilder.toString()
            Log.d(TAG, "Notification extras: $snapshot")
            LoggerUtil.debug(this, TAG, "Notification extras: $snapshot")
        } catch (e: Exception) {
            LoggerUtil.error(this, TAG, "Failed to log notification extras", e)
        }

        // Ранний выход для пустого текста
        if (text.isEmpty()) {
            return
        }

        // Логируем все уведомления от поддерживаемых пакетов для отладки
        LoggerUtil.debug(this, TAG, "Received notification from ${sbn.packageName}: title='$title', text='$text'")

        // Определяем тип уведомления (платеж/возврат/перевод/другое)
        val notificationType = detectNotificationType("$title $text")
        LoggerUtil.debug(this, TAG, "Notification type=$notificationType from ${sbn.packageName}")

        if (sbn.packageName == BuildConfig.APPLICATION_ID) {
            if (isInternalSummary) {
                LoggerUtil.debug(this, TAG, "Skipping internal summary notification")
                return
            }

            if (notificationType != NotificationType.PAYMENT) {
                LoggerUtil.debug(this, TAG, "Skipping internal notification - not a payment type")
                return
            }
        }

        // Выполняем дедупликацию и проверку
        // Проверяем дубликаты с постоянным хранилищем
        val notificationId = "${sbn.packageName}|$title|$text"
        if (isDuplicate(notificationId)) {
            LoggerUtil.debug(this, TAG, "Duplicate notification detected and skipped: $notificationId")
            return
        }

        // Только теперь выполняем тяжелую работу (файловый I/O)
        handlePaymentNotification(sbn, title, text, notificationType)
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

                // Очищаем старые записи
                val keysToRemove = mutableListOf<String>()
                dedupData.keys().forEach { key ->
                    val timestamp = dedupData.optLong(key, 0L)
                    if (currentTime - timestamp > DEDUP_TIME_WINDOW_MS) {
                        keysToRemove.add(key)
                    }
                }
                keysToRemove.forEach { dedupData.remove(it) }

                // Проверяем, является ли это уведомление дубликатом
                if (dedupData.has(notificationId)) {
                    return@synchronized true
                }

                // Добавляем текущее уведомление в дедупликацию
                dedupData.put(notificationId, currentTime)

                // Сохраняем обновленные данные дедупликации атомарно
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

    private fun handlePaymentNotification(
        sbn: StatusBarNotification,
        title: String,
        text: String,
        notificationType: NotificationType,
    ) {
        try {
            val notificationData = JSONObject().apply {
                put("packageName", sbn.packageName)
                put("title", title)
                put("text", text)
                put("timestamp", System.currentTimeMillis())
                put("notificationType", notificationType.name)
            }

            saveNotification(notificationData)
            LoggerUtil.info(this, TAG, "Notification saved (type=$notificationType) from ${sbn.packageName}")
        } catch (e: Exception) {
            LoggerUtil.error(this, TAG, "Error handling payment notification", e)
        }
    }

    private fun saveNotification(notificationData: JSONObject) {
        try {
            val file = File(filesDir, NOTIFICATIONS_FILE)

            // Читаем существующие уведомления только если файл существует
            val notifications = if (file.exists() && file.length() > 0) {
                try {
                    JSONArray(file.readText())
                } catch (e: Exception) {
                    // Если файл поврежден, начинаем заново
                    JSONArray()
                }
            } else {
                JSONArray()
            }

            // Добавляем новое уведомление
            notifications.put(notificationData)

            LoggerUtil.info(this, TAG, "Notification saved to pending_notifications.json: ${notificationData.toString()}")

            // Ограничиваем очередь, чтобы не копить тысячи записей
            val trimmedNotifications = if (notifications.length() > MAX_PENDING_NOTIFICATIONS) {
                val trimmed = JSONArray()
                val startIndex = notifications.length() - MAX_PENDING_NOTIFICATIONS
                for (i in startIndex until notifications.length()) {
                    trimmed.put(notifications.get(i))
                }
                trimmed
            } else {
                notifications
            }

            // Записываем атомарно используя временный файл для безопасности данных
            val tempFile = File(filesDir, "$NOTIFICATIONS_FILE.tmp")
            tempFile.writeText(trimmedNotifications.toString())
            tempFile.renameTo(file)

            // Показываем локальное уведомление пользователю
            showPaymentNotification(trimmedNotifications.length())

            // Отправляем событие для уведомления приложения
            broadcastNewNotification()
        } catch (e: Exception) {
            LoggerUtil.error(this, TAG, "Error saving notification", e)
        }
    }

    private fun broadcastNewNotification() {
        try {
            val intent = Intent(ACTION_NEW_NOTIFICATION)
            LocalBroadcastManager.getInstance(this).sendBroadcast(intent)
            LoggerUtil.debug(this, TAG, "Broadcast sent: NEW_NOTIFICATION")
        } catch (e: Exception) {
            LoggerUtil.error(this, TAG, "Error broadcasting notification event", e)
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
