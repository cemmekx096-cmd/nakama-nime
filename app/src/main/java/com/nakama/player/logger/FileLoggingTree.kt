package com.nakama.player.logger

import android.content.Context
import android.util.Log
import timber.log.Timber
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Timber Tree yang simpan log ke file.
 * Satu file per hari: nakama_2025-04-29.log
 * Otomatis hapus log lebih dari 7 hari.
 *
 * Format per baris:
 * [2025-04-29 14:32:01] [INFO ] [NetworkBridge] Request OK → https://...
 */
class FileLoggingTree(private val context: Context) : Timber.Tree() {

    companion object {
        private const val LOG_DIR       = "logs"
        private const val MAX_LOG_DAYS  = 7
        private const val MAX_FILE_SIZE = 5L * 1024L * 1024L // 5MB per file
        private val DATE_FORMAT         = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        private val TIME_FORMAT         = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
    }

    private val logDir = File(context.filesDir, LOG_DIR).also { it.mkdirs() }

    override fun log(priority: Int, tag: String?, message: String, t: Throwable?) {
        try {
            val level = priorityToString(priority)
            val time  = TIME_FORMAT.format(Date())
            val tagStr = tag?.take(20)?.padEnd(20) ?: "Unknown".padEnd(20)

            val entry = buildString {
                append("[$time] ")
                append("[$level] ")
                append("[$tagStr] ")
                append(message)
                if (t != null) {
                    append("\n")
                    append(Log.getStackTraceString(t))
                }
                append("\n")
            }

            writeToFile(entry)
        } catch (e: Exception) {
            // Jangan throw dari logger — bisa infinite loop
            e.printStackTrace()
        }
    }

    // ─────────────────────────────────────────
    // FILE MANAGEMENT
    // ─────────────────────────────────────────

    /**
     * Tulis log entry ke file hari ini.
     * Kalau file > 5MB → buat file baru dengan suffix _2, _3, dst
     */
    private fun writeToFile(entry: String) {
        val file = getCurrentLogFile()

        // Kalau file sudah > 5MB, buat file baru dengan suffix
        val targetFile = if (file.length() > MAX_FILE_SIZE) {
            getRotatedFile()
        } else {
            file
        }

        FileWriter(targetFile, true).use { it.write(entry) }
    }

    /**
     * Ambil file log hari ini.
     * Format: logs/nakama_2025-04-29.log
     */
    fun getCurrentLogFile(): File {
        val today = DATE_FORMAT.format(Date())
        return File(logDir, "nakama_$today.log")
    }

    /**
     * Buat nama file rotasi kalau file terlalu besar.
     * Format: nakama_2025-04-29_2.log, _3.log, dst
     */
    private fun getRotatedFile(): File {
        val today = DATE_FORMAT.format(Date())
        var suffix = 2
        var file: File
        do {
            file = File(logDir, "nakama_${today}_$suffix.log")
            suffix++
        } while (file.exists() && file.length() > MAX_FILE_SIZE)
        return file
    }

    /**
     * Hapus log lebih dari MAX_LOG_DAYS hari.
     * Dipanggil dari NakamaLogger.clearLogs()
     */
    fun clearOldLogs() {
        val cutoff = System.currentTimeMillis() - (MAX_LOG_DAYS * 24 * 60 * 60 * 1000L)
        logDir.listFiles()
            ?.filter { it.isFile && it.lastModified() < cutoff }
            ?.forEach {
                it.delete()
                Timber.d("FileLoggingTree: Deleted old log → ${it.name}")
            }
    }

    // ─────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────

    private fun priorityToString(priority: Int): String {
        return when (priority) {
            Log.VERBOSE -> "VERBOSE"
            Log.DEBUG   -> "DEBUG  "
            Log.INFO    -> "INFO   "
            Log.WARN    -> "WARN   "
            Log.ERROR   -> "ERROR  "
            Log.ASSERT  -> "ASSERT "
            else        -> "UNKNOWN"
        }
    }
}
