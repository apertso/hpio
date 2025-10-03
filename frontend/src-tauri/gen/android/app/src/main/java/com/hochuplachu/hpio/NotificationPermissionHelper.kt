package com.hochuplachu.hpio

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils

object NotificationPermissionHelper {
    /**
     * Проверяет, имеет ли приложение доступ к уведомлениям
     */
    @JvmStatic
    fun isNotificationListenerEnabled(context: Context): Boolean {
        val packageName = context.packageName
        val flat = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners"
        )

        if (!flat.isNullOrEmpty()) {
            val names = flat.split(":").toTypedArray()
            for (name in names) {
                val componentName = ComponentName.unflattenFromString(name)
                if (componentName != null) {
                    if (TextUtils.equals(packageName, componentName.packageName)) {
                        return true
                    }
                }
            }
        }
        return false
    }

    /**
     * Открывает системные настройки для доступа к уведомлениям
     */
    @JvmStatic
    fun openNotificationListenerSettings(context: Context) {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }
}
