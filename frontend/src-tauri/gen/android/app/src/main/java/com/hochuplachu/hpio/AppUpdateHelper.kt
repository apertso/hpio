package com.hochuplachu.hpio

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import androidx.annotation.Keep
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.CountDownLatch

@Keep
object AppUpdateHelper {
    private const val TAG = "AppUpdateHelper"
    private const val RELEASE_API = "https://api.github.com/repos/apertso/hpio/releases/latest"
    private const val ALLOWED_PREFIX = "https://github.com/apertso/hpio/releases/download/"

    @Volatile
    private var pendingUrl: String? = null

    @Volatile
    private var installing = false

    @JvmStatic
    fun fetchLatestRelease(): String {
        val connection = openConnection(RELEASE_API)
        connection.setRequestProperty("Accept", "application/vnd.github+json")
        return readBody(connection)
    }

    /**
     * Предпочтительная архитектура устройства. arm64-v8a совпадает с отдельным APK релиза.
     */
    @JvmStatic
    fun deviceArch(): String {
        val abi = Build.SUPPORTED_ABIS.firstOrNull().orEmpty()
        return if (abi == "arm64-v8a") "aarch64" else abi
    }

    /**
     * Скачивает APK и открывает системный установщик.
     * Если установка из этого источника запрещена, открывает настройку и продолжает после возврата.
     */
    @JvmStatic
    fun startInstall(context: Context, url: String): String {
        if (!isAllowedApkUrl(url)) return "invalid_url"
        if (installing) return "installing"
        if (!canRequestInstall(context)) {
            pendingUrl = url
            openInstallSettings(context)
            return "need_permission"
        }
        pendingUrl = null
        installing = true
        return try {
            downloadAndInstall(context.applicationContext, url)
            "installing"
        } catch (error: Exception) {
            Log.e(TAG, "Failed to download app update", error)
            "error:${error.message ?: "download failed"}"
        } finally {
            installing = false
        }
    }

    fun resumePendingInstall(context: Context) {
        val url = pendingUrl ?: return
        if (!canRequestInstall(context) || installing) return
        pendingUrl = null
        val appContext = context.applicationContext
        Thread {
            installing = true
            try {
                downloadAndInstall(appContext, url)
            } catch (error: Exception) {
                Log.e(TAG, "Failed to resume app update", error)
            } finally {
                installing = false
            }
        }.start()
    }

    private fun isAllowedApkUrl(url: String): Boolean {
        if (!url.startsWith(ALLOWED_PREFIX)) return false
        val name = url.substringAfterLast('/')
        return name == "app-arm64-release.apk" || name == "app-armv7-release.apk"
    }

    private fun canRequestInstall(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
        return context.packageManager.canRequestPackageInstalls()
    }

    private fun openInstallSettings(context: Context) {
        val intent = Intent(
            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
            Uri.parse("package:${context.packageName}"),
        )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    private fun downloadAndInstall(context: Context, url: String) {
        val file = File(context.cacheDir, "update.apk")
        if (file.exists()) file.delete()
        val connection = openConnection(url)
        try {
            connection.inputStream.use { input ->
                FileOutputStream(file).use { output -> input.copyTo(output) }
            }
        } finally {
            connection.disconnect()
        }
        if (file.length() < 1024) {
            file.delete()
            throw IllegalStateException("Downloaded update file is empty")
        }
        installApk(context, file)
    }

    private fun installApk(context: Context, file: File) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file,
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val resolvers = context.packageManager.queryIntentActivities(
            intent,
            PackageManager.MATCH_DEFAULT_ONLY,
        )
        for (resolve in resolvers) {
            context.grantUriPermission(
                resolve.activityInfo.packageName,
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION,
            )
        }
        Log.i(TAG, "Opening Android package installer")
        onMainThread { context.startActivity(intent) }
    }

    private fun onMainThread(block: () -> Unit) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            block()
            return
        }
        val latch = CountDownLatch(1)
        val failure = arrayOfNulls<Exception>(1)
        Handler(Looper.getMainLooper()).post {
            try {
                block()
            } catch (error: Exception) {
                failure[0] = error
            } finally {
                latch.countDown()
            }
        }
        latch.await()
        val error = failure[0]
        if (error != null) throw error
    }

    private fun openConnection(url: String): HttpURLConnection {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.instanceFollowRedirects = true
        connection.connectTimeout = 20_000
        connection.readTimeout = 300_000
        connection.setRequestProperty("User-Agent", "hpio-android")
        connection.connect()
        val code = connection.responseCode
        if (code !in 200..299) {
            connection.disconnect()
            throw IllegalStateException("GitHub HTTP $code")
        }
        return connection
    }

    private fun readBody(connection: HttpURLConnection): String {
        return try {
            connection.inputStream.bufferedReader().use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }
}
