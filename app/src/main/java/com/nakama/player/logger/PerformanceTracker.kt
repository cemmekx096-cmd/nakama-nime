package com.nakama.player.logger

import timber.log.Timber

/**
 * Track durasi operasi.
 * Berguna untuk monitor performance fetch, install extension, dll.
 *
 * Penggunaan:
 * val perf = NakamaLogger.performance("FetchPopular")
 * perf.start()
 * // ... operasi ...
 * perf.end() // log: "FetchPopular done in 342ms"
 */
class PerformanceTracker(private val operationName: String) {

    private var startTime = 0L

    fun start() {
        startTime = System.currentTimeMillis()
        Timber.tag("Perf").d("▶ $operationName started")
    }

    fun end() {
        val duration = System.currentTimeMillis() - startTime
        val emoji = when {
            duration < 500  -> "⚡" // cepat
            duration < 2000 -> "✓"  // normal
            duration < 5000 -> "⚠"  // lambat
            else            -> "✗"  // sangat lambat
        }
        Timber.tag("Perf").d("$emoji $operationName done in ${duration}ms")
    }

    fun endWithLabel(label: String) {
        val duration = System.currentTimeMillis() - startTime
        Timber.tag("Perf").d("✓ $operationName ($label) done in ${duration}ms")
    }
}
