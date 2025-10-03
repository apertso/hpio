package com.hochuplachu.hpio

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class PaymentNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "PaymentNotificationListener"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)

        if (sbn == null) return

        // Логируем для отладки
        Log.d(TAG, "Notification posted: ${sbn.packageName}")

        // TODO: В будущем здесь будет парсинг уведомлений
        // Пока просто регистрируем сервис для доступа
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
        // Можно обработать удаление уведомлений
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

