package com.nakama.player.logger

import android.content.Context
import timber.log.Timber

/**
 * Logger terpusat Nakama.
 * Wrapper di atas Timber dengan tambahan:
 * - FileLoggingTree → simpan log ke file
 * - FeatureTracker  → track lifecycle fitur
 * - PerformanceTracker → track durasi operasi
 *
 * Init sekali di App.kt:
 * NakamaLogger.init(context, isDebug)
 *
 * Penggunaan:
 * Timber.d("pesan")
 * NakamaLogger.feature("TAG").start()
 */
object NakamaLogger {

    private var fileTree: FileLoggingTree? = null

    /**
     * Init logger — dipanggil sekali di App.onCreate()
     * @param context app context
     * @param isDebug true = tanam DebugTree (logcat), false = file only
     */
    fun init(context: Context, isDebug: Boolean) {
        // File logging — selalu aktif (debug & release)
        fileTree = FileLoggingTree(context).also {
            Timber.plant(it)
        }

        // Logcat — hanya di debug build
        if (isDebug) {
            Timber.plant(Timber.DebugTree())
        }

        Timber.i("NakamaLogger initialized — debug=$isDebug")
    }

    /**
     * Buat FeatureTracker untuk fitur tertentu.
     * @param featureName nama fitur / TAG
     */
    fun feature(featureName: String): FeatureTracker {
        return FeatureTracker(featureName)
    }

    /**
     * Buat PerformanceTracker untuk operasi tertentu.
     * @param operationName nama operasi yang di-track
     */
    fun performance(operationName: String): PerformanceTracker {
        return PerformanceTracker(operationName)
    }

    /**
     * Ambil path file log hari ini.
     * Dipakai Settings → Kirim Log.
     */
    fun getLogFile() = fileTree?.getCurrentLogFile()

    /**
     * Hapus semua file log lama.
     * Dipanggil dari Settings → Hapus Log.
     */
    fun clearLogs() {
        fileTree?.clearOldLogs()
        Timber.i("Log files cleared")
    }
}
