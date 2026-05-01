package com.nakama.player.bridge

import android.content.Context
import android.content.Intent
import android.webkit.JavascriptInterface
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import com.google.gson.Gson
import com.nakama.player.logger.NakamaLogger
import com.nakama.player.logger.PerformanceTracker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.io.File

/**
 * Bridge antara JS dan ExoPlayer untuk offline playback.
 * Online playback (embed) dihandle WebView langsung — tidak lewat sini.
 *
 * Dipanggil dari JS:
 * NativePlayer.playOffline(filePath, startPosition, callbackId)
 * NativePlayer.pause()
 * NativePlayer.resume()
 * NativePlayer.seekTo(positionMs)
 * NativePlayer.stop()
 * NativePlayer.getPosition() → Long (ms)
 * NativePlayer.getDuration() → Long (ms)
 * NativePlayer.isPlaying() → Boolean
 * NativePlayer.setSpeed(speed)
 * NativePlayer.getDownloadedFiles() → JSON array
 * NativePlayer.deleteDownload(filePath)
 */
@UnstableApi
class PlayerBridge(
    private val context: Context,
    private val webView: android.webkit.WebView
) {
    companion object {
        const val TAG = "PlayerBridge"
        private const val DOWNLOAD_DIR = "downloads"
        // Progress update interval — setiap 5 detik
        private const val PROGRESS_INTERVAL_MS = 5000L
    }

    private val tracker = NakamaLogger.feature(TAG)
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.Main)

    // ExoPlayer instance — lazy init
    private var player: ExoPlayer? = null

    // Callback ID untuk progress update ke JS
    private var progressCallbackId: String? = null

    // Dir untuk file download
    private val downloadDir = File(context.filesDir, DOWNLOAD_DIR).also { it.mkdirs() }

    // ─────────────────────────────────────────
    // PLAYBACK
    // ─────────────────────────────────────────

    /**
     * Play file video offline dari storage.
     * @param filePath  path file video di internal storage
     * @param startMs   posisi mulai dalam milliseconds (untuk resume)
     * @param callbackId ID callback JS untuk progress update
     */
    @JavascriptInterface
    fun playOffline(
        filePath: String,
        startMs: Long = 0L,
        callbackId: String = ""
    ) {
        val perf = PerformanceTracker("playOffline")
        perf.start()

        scope.launch {
            try {
                Timber.d("$TAG: Playing offline → $filePath (start: ${startMs}ms)")
                tracker.debug("playOffline → $filePath")

                val file = File(filePath)
                if (!file.exists()) {
                    throw Exception("File not found: $filePath")
                }

                // Init atau reuse ExoPlayer
                val exo = getOrCreatePlayer()

                // Set media item
                val mediaItem = MediaItem.fromUri(file.toURI().toString())
                exo.setMediaItem(mediaItem)
                exo.prepare()

                // Seek ke posisi resume kalau ada
                if (startMs > 0) {
                    exo.seekTo(startMs)
                    Timber.d("$TAG: Seeked to ${startMs}ms")
                }

                exo.play()

                progressCallbackId = callbackId.ifBlank { null }

                // Mulai progress update loop
                if (progressCallbackId != null) {
                    startProgressLoop()
                }

                perf.end()
                tracker.success("Playback started → $filePath")

            } catch (e: Exception) {
                perf.end()
                tracker.error("playOffline failed: ${e.message}")
                Timber.e(e, "$TAG: playOffline failed → $filePath")

                // Notify JS error
                if (callbackId.isNotBlank()) {
                    invokeCallback(callbackId, mapOf(
                        "event" to "error",
                        "error" to (e.message ?: "Playback failed")
                    ))
                }
            }
        }
    }

    @JavascriptInterface
    fun pause() {
        scope.launch {
            player?.pause()
            Timber.d("$TAG: Paused")
        }
    }

    @JavascriptInterface
    fun resume() {
        scope.launch {
            player?.play()
            Timber.d("$TAG: Resumed")
        }
    }

    /**
     * Seek ke posisi tertentu.
     * @param positionMs posisi dalam milliseconds
     */
    @JavascriptInterface
    fun seekTo(positionMs: Long) {
        scope.launch {
            player?.seekTo(positionMs)
            Timber.d("$TAG: Seeked to ${positionMs}ms")
        }
    }

    @JavascriptInterface
    fun stop() {
        scope.launch {
            player?.apply {
                stop()
                clearMediaItems()
            }
            progressCallbackId = null
            Timber.d("$TAG: Stopped")
            tracker.debug("Player stopped")
        }
    }

    /**
     * Set kecepatan playback.
     * @param speed 0.5, 0.75, 1.0, 1.25, 1.5, 2.0
     */
    @JavascriptInterface
    fun setSpeed(speed: Float) {
        scope.launch {
            player?.setPlaybackSpeed(speed)
            Timber.d("$TAG: Speed set to ${speed}x")
        }
    }

    // ─────────────────────────────────────────
    // STATE QUERY — synchronous, return langsung
    // ─────────────────────────────────────────

    @JavascriptInterface
    fun getPosition(): Long {
        return player?.currentPosition ?: 0L
    }

    @JavascriptInterface
    fun getDuration(): Long {
        return player?.duration ?: 0L
    }

    @JavascriptInterface
    fun isPlaying(): Boolean {
        return player?.isPlaying ?: false
    }

    @JavascriptInterface
    fun getPlaybackState(): String {
        val state = when (player?.playbackState) {
            Player.STATE_IDLE     -> "idle"
            Player.STATE_BUFFERING -> "buffering"
            Player.STATE_READY    -> if (player?.isPlaying == true) "playing" else "paused"
            Player.STATE_ENDED    -> "ended"
            else                  -> "idle"
        }
        Timber.d("$TAG: State → $state")
        return state
    }

    // ─────────────────────────────────────────
    // DOWNLOAD MANAGEMENT
    // ─────────────────────────────────────────

    /**
     * Ambil semua file yang sudah didownload.
     * @return JSON array DownloadInfo
     */
    @JavascriptInterface
    fun getDownloadedFiles(): String {
        return try {
            val files = downloadDir.listFiles()
                ?.filter { it.isFile && it.canRead() }
                ?.map { file ->
                    mapOf(
                        "name"      to file.nameWithoutExtension,
                        "path"      to file.absolutePath,
                        "size"      to file.length(),
                        "sizeStr"   to formatSize(file.length()),
                        "extension" to file.extension,
                        "modified"  to file.lastModified()
                    )
                } ?: emptyList()

            Timber.d("$TAG: getDownloadedFiles → ${files.size} files")
            gson.toJson(files)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: getDownloadedFiles failed")
            "[]"
        }
    }

    /**
     * Hapus file download.
     * @param filePath absolute path file yang ingin dihapus
     */
    @JavascriptInterface
    fun deleteDownload(filePath: String): Boolean {
        return try {
            val file = File(filePath)

            // Security: pastikan file ada di dalam downloadDir
            // Cegah path traversal attack (../../etc/passwd)
            if (!file.canonicalPath.startsWith(downloadDir.canonicalPath)) {
                Timber.w("$TAG: Path traversal attempt blocked → $filePath")
                return false
            }

            val deleted = file.delete()
            Timber.d("$TAG: deleteDownload → $filePath (deleted=$deleted)")
            tracker.debug("Download deleted → $filePath")
            deleted
        } catch (e: Exception) {
            Timber.e(e, "$TAG: deleteDownload failed → $filePath")
            false
        }
    }

    /**
     * Ambil total ukuran folder download.
     * @return JSON: { "bytes": 123456, "formatted": "120 MB" }
     */
    @JavascriptInterface
    fun getDownloadSize(): String {
        return try {
            val total = downloadDir.walkTopDown()
                .filter { it.isFile }
                .sumOf { it.length() }

            gson.toJson(mapOf(
                "bytes"     to total,
                "formatted" to formatSize(total)
            ))
        } catch (e: Exception) {
            Timber.e(e, "$TAG: getDownloadSize failed")
            gson.toJson(mapOf("bytes" to 0L, "formatted" to "0 B"))
        }
    }

    /**
     * Clear semua file download.
     */
    @JavascriptInterface
    fun clearAllDownloads(): Boolean {
        return try {
            downloadDir.listFiles()?.forEach { it.delete() }
            Timber.d("$TAG: All downloads cleared")
            tracker.success("All downloads cleared")
            true
        } catch (e: Exception) {
            Timber.e(e, "$TAG: clearAllDownloads failed")
            false
        }
    }

    // ─────────────────────────────────────────
    // PROGRESS LOOP — update JS setiap 5 detik
    // ─────────────────────────────────────────

    /**
     * Loop update progress ke JS setiap PROGRESS_INTERVAL_MS.
     * JS pakai ini untuk update progress bar + auto-save ke Room via StorageBridge.
     */
    private fun startProgressLoop() {
        scope.launch {
            while (progressCallbackId != null && player?.isPlaying == true) {
                val position = player?.currentPosition ?: 0L
                val duration = player?.duration ?: 0L
                val state = getPlaybackState()

                invokeCallback(progressCallbackId!!, mapOf(
                    "event"    to "progress",
                    "position" to position,
                    "duration" to duration,
                    "state"    to state
                ))

                // Kalau ended → notify JS dan stop loop
                if (state == "ended") {
                    invokeCallback(progressCallbackId!!, mapOf(
                        "event" to "ended"
                    ))
                    progressCallbackId = null
                    break
                }

                kotlinx.coroutines.delay(PROGRESS_INTERVAL_MS)
            }
        }
    }

    // ─────────────────────────────────────────
    // EXOPLAYER INIT
    // ─────────────────────────────────────────

    /**
     * Get atau create ExoPlayer instance.
     * Satu instance dipakai selama app hidup — tidak create ulang setiap play.
     */
    private fun getOrCreatePlayer(): ExoPlayer {
        return player ?: ExoPlayer.Builder(context)
            .build()
            .also { exo ->
                // Listener untuk event player
                exo.addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(state: Int) {
                        val stateStr = when (state) {
                            Player.STATE_BUFFERING -> "buffering"
                            Player.STATE_READY     -> "ready"
                            Player.STATE_ENDED     -> "ended"
                            Player.STATE_IDLE      -> "idle"
                            else                   -> "unknown"
                        }
                        Timber.d("$TAG: ExoPlayer state → $stateStr")

                        // Notify JS saat state berubah
                        progressCallbackId?.let { cbId ->
                            scope.launch {
                                invokeCallback(cbId, mapOf(
                                    "event" to "stateChanged",
                                    "state" to stateStr
                                ))
                            }
                        }
                    }

                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        Timber.d("$TAG: isPlaying → $isPlaying")
                    }

                    override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                        Timber.e("$TAG: ExoPlayer error → ${error.message}")
                        tracker.error("ExoPlayer error: ${error.message}")

                        progressCallbackId?.let { cbId ->
                            scope.launch {
                                invokeCallback(cbId, mapOf(
                                    "event" to "error",
                                    "error" to (error.message ?: "Playback error")
                                ))
                            }
                        }
                    }
                })
                player = exo
            }
    }

    /**
     * Release ExoPlayer — dipanggil saat Activity destroy.
     */
    fun release() {
        player?.release()
        player = null
        progressCallbackId = null
        Timber.d("$TAG: ExoPlayer released")
        tracker.success("ExoPlayer released")
    }

    // ─────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────

    private suspend fun invokeCallback(callbackId: String, data: Map<String, Any?>) {
        val json = gson.toJson(data)
        val escaped = json.replace("\\", "\\\\").replace("'", "\\'")
        withContext(Dispatchers.Main) {
            webView.evaluateJavascript(
                "NativeCallback.resolve('$callbackId', '$escaped')",
                null
            )
        }
    }

    private fun formatSize(bytes: Long): String {
        return when {
            bytes >= 1024L * 1024L * 1024L ->
                "%.1f GB".format(bytes / (1024.0 * 1024.0 * 1024.0))
            bytes >= 1024L * 1024L ->
                "%.1f MB".format(bytes / (1024.0 * 1024.0))
            bytes >= 1024L ->
                "%.1f KB".format(bytes / 1024.0)
            else -> "$bytes B"
        }
    }
}
