package com.nakama.player.logger

import timber.log.Timber

/**
 * Track lifecycle sebuah fitur/operasi.
 * Dipakai untuk monitor apakah fitur berjalan normal.
 *
 * Penggunaan:
 * val tracker = NakamaLogger.feature("CloudflareKiller")
 * tracker.start()
 * tracker.success("CF bypassed")
 * tracker.error("Timeout after 15s")
 */
class FeatureTracker(private val featureName: String) {

    fun start() {
        Timber.tag(featureName).i("▶ Started")
    }

    fun success(message: String = "Completed successfully") {
        Timber.tag(featureName).i("✓ $message")
    }

    fun error(message: String) {
        Timber.tag(featureName).e("✗ $message")
    }

    fun warn(message: String) {
        Timber.tag(featureName).w("⚠ $message")
    }

    fun debug(message: String) {
        Timber.tag(featureName).d("• $message")
    }
}
