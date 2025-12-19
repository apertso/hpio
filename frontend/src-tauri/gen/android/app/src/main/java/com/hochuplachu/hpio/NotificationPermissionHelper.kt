package com.hochuplachu.hpio

import android.Manifest
import android.app.Activity
import android.app.AppOpsManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Process
import android.provider.Settings
import android.text.TextUtils
import androidx.annotation.Keep
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.util.Locale

object NotificationPermissionHelper {
    private const val PREFS_NAME_SERVICE_STATE = "service_state"
    private const val KEY_LAST_HEARTBEAT = "notification_listener_last_heartbeat"
    const val ACTION_SERVICE_HEARTBEAT_PING = "com.hochuplachu.hpio.SERVICE_HEARTBEAT_PING"

    /**
     * Проверяет, имеет ли приложение доступ к уведомлениям (Notification Listener)
     */
    @JvmStatic
    @Keep
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
     * Открывает системные настройки для доступа к уведомлениям (Notification Listener)
     */
    @JvmStatic
    @Keep
    fun openNotificationListenerSettings(context: Context) {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    /**
     * Проверяет, имеет ли приложение разрешение на отображение уведомлений (POST_NOTIFICATIONS)
     */
    @JvmStatic
    @Keep
    fun checkAppNotificationPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            // На Android < 13 разрешение не требуется
            true
        }
    }

    /**
     * Запрашивает разрешение на отображение уведомлений (POST_NOTIFICATIONS)
     * Работает только на Android 13+
     */
    @JvmStatic
    @Keep
    fun requestAppNotificationPermission(activity: Activity): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    activity,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    REQUEST_CODE_POST_NOTIFICATIONS
                )
                false
            } else {
                true
            }
        } else {
            true
        }
    }

    /**
     * Открывает системные настройки приложения для управления уведомлениями
     */
    @JvmStatic
    @Keep
    fun openAppNotificationSettings(context: Context) {
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            }
        } else {
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = android.net.Uri.parse("package:${context.packageName}")
            }
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    /**
     * Проверяет, игнорируются ли оптимизации батареи для приложения
     */
    @JvmStatic
    @Keep
    fun isBatteryOptimizationDisabled(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            powerManager.isIgnoringBatteryOptimizations(context.packageName)
        } else {
            true
        }
    }

    /**
     * Открывает настройки оптимизации батареи для приложения
     */
    @JvmStatic
    @Keep
    fun openBatteryOptimizationSettings(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = android.net.Uri.parse("package:${context.packageName}")
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                context.startActivity(intent)
            } catch (e: Exception) {
                // Резервный вариант: общие настройки оптимизации батареи
                val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(fallbackIntent)
            }
        }
    }

    /**
     * Проверяет, добавлено ли приложение в список автозапуска
     */
    @JvmStatic
    @Keep
    fun isAutostartEnabled(context: Context): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
                val mode = appOps.checkOpNoThrow(
                    "android:auto_start",
                    Process.myUid(),
                    context.packageName
                )
                mode == AppOpsManager.MODE_ALLOWED
            } else {
                true
            }
        } catch (e: Exception) {
            true
        }
    }

    /**
     * Открывает настройки автозапуска для основных прошивок
     */
    @JvmStatic
    @Keep
    fun openAutostartSettings(context: Context) {
        val manufacturer = Build.MANUFACTURER.lowercase(Locale.getDefault())
        val attempts = mutableListOf<Intent>()

        if (manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco")) {
            attempts.add(
                Intent().apply {
                    component = ComponentName(
                        "com.miui.securitycenter",
                        "com.miui.permcenter.autostart.AutoStartManagementActivity"
                    )
                }
            )
            attempts.add(Intent("miui.intent.action.OP_AUTO_START"))
        }

        if (manufacturer.contains("oppo")) {
            attempts.add(
                Intent().apply {
                    component = ComponentName(
                        "com.coloros.safecenter",
                        "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                    )
                }
            )
        }

        if (manufacturer.contains("vivo")) {
            attempts.add(
                Intent().apply {
                    component = ComponentName(
                        "com.vivo.permissionmanager",
                        "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
                    )
                }
            )
        }

        if (manufacturer.contains("huawei") || manufacturer.contains("honor")) {
            attempts.add(
                Intent().apply {
                    component = ComponentName(
                        "com.huawei.systemmanager",
                        "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
                    )
                }
            )
        }

        attempts.add(
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = android.net.Uri.parse("package:${context.packageName}")
            }
        )

        for (intent in attempts) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                context.startActivity(intent)
                return
            } catch (_: Exception) {
                continue
            }
        }

        throw IllegalStateException("Unable to open autostart settings")
    }

    /**
     * Возвращает производителя устройства
     */
    @JvmStatic
    @Keep
    fun getDeviceManufacturer(): String {
        return Build.MANUFACTURER.lowercase(Locale.getDefault())
    }

    /**
     * Показывает локальное уведомление о новых платежах
     */
    @JvmStatic
    @Keep
    fun showLocalNotification(context: Context, title: String, body: String, count: Int) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "payment_notifications"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Payment Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications about payments and reminders"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("click_action", "main")
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val extrasBundle = Bundle().apply {
            putBoolean(INTERNAL_SUMMARY_EXTRA, true)
        }

        val notification = NotificationCompat.Builder(context, channelId)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_notification)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setNumber(count)
            .addExtras(extrasBundle)
            .build()

        notificationManager.notify(NOTIFICATION_ID_PAYMENTS, notification)
    }

    /**
     * Отправляет локальное уведомление о платеже для дев-симуляций
     */
    @JvmStatic
    @Keep
    fun simulatePaymentNotification(context: Context, title: String, body: String) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "payment_notifications"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Payment Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications about payments and reminders"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("click_action", "main")
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notificationId = (System.currentTimeMillis() % Int.MAX_VALUE).toInt()

        val notification = NotificationCompat.Builder(context, channelId)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setSmallIcon(R.drawable.ic_notification)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        notificationManager.notify(notificationId, notification)
    }

    @JvmStatic
    @Keep
    fun updateNotificationListenerHeartbeat(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME_SERVICE_STATE, Context.MODE_PRIVATE)
        prefs.edit().putLong(KEY_LAST_HEARTBEAT, System.currentTimeMillis()).apply()
    }

    @JvmStatic
    @Keep
    fun getNotificationListenerHeartbeat(context: Context): Long {
        val prefs = context.getSharedPreferences(PREFS_NAME_SERVICE_STATE, Context.MODE_PRIVATE)
        return prefs.getLong(KEY_LAST_HEARTBEAT, 0L)
    }

    @JvmStatic
    @Keep
    fun pingNotificationListenerService(context: Context) {
        val intent = Intent(ACTION_SERVICE_HEARTBEAT_PING).apply {
            setPackage(context.packageName)
        }
        context.sendBroadcast(intent)
    }

    private const val REQUEST_CODE_POST_NOTIFICATIONS = 1001
    private const val NOTIFICATION_ID_PAYMENTS = 1000
    const val INTERNAL_SUMMARY_EXTRA = "hpio_internal_summary"
}
