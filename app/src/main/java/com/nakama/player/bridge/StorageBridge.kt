package com.nakama.player.bridge

import android.content.Context
import android.webkit.JavascriptInterface
import com.google.gson.Gson
import com.nakama.player.data.db.AppDatabase
import com.nakama.player.data.model.AnimeModel
import com.nakama.player.data.model.EpisodeModel
import com.nakama.player.data.model.ProgressModel
import com.nakama.player.logger.NakamaLogger
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import timber.log.Timber

/**
 * Bridge antara JS dan storage Android (Room DB + SharedPreferences).
 *
 * Dipanggil dari JS:
 *
 * — Anime/Library —
 * NativeStorage.addToLibrary(animeJson)
 * NativeStorage.removeFromLibrary(animeId, pkg)
 * NativeStorage.isInLibrary(animeId, pkg) → boolean
 * NativeStorage.getLibrary() → JSON array
 *
 * — Progress —
 * NativeStorage.saveProgress(animeId, pkg, episodeId, position, duration)
 * NativeStorage.getProgress(episodeId) → JSON
 * NativeStorage.markWatched(episodeId, animeId, pkg)
 * NativeStorage.getWatchedEpisodes(animeId, pkg) → JSON array
 * NativeStorage.getLastWatched(animeId, pkg) → JSON
 *
 * — History —
 * NativeStorage.getHistory() → JSON array
 * NativeStorage.clearHistory()
 * NativeStorage.removeFromHistory(animeId, pkg)
 *
 * — Settings —
 * NativeStorage.getSetting(key) → string
 * NativeStorage.setSetting(key, value)
 * NativeStorage.getAllSettings() → JSON
 */
class StorageBridge(
    private val context: Context,
    private val webView: android.webkit.WebView
) {
    companion object {
        const val TAG = "StorageBridge"
    }

    private val tracker = NakamaLogger.feature(TAG)
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO)
    private val db = AppDatabase.getInstance(context)
    private val prefs = context.getSharedPreferences("nakama_settings", Context.MODE_PRIVATE)

    // ─────────────────────────────────────────
    // LIBRARY — tambah/hapus anime ke pustaka
    // ─────────────────────────────────────────

    /**
     * Tambah anime ke pustaka (Beranda).
     * @param animeJson JSON string AnimeModel dari JS
     */
    @JavascriptInterface
    fun addToLibrary(animeJson: String) {
        scope.launch {
            try {
                val anime = gson.fromJson(animeJson, AnimeModel::class.java)
                db.animeDao().insert(anime)
                Timber.d("$TAG: Added to library → ${anime.title}")
                tracker.success("Added ${anime.title} to library")
            } catch (e: Exception) {
                Timber.e(e, "$TAG: addToLibrary failed")
                tracker.error("addToLibrary failed: ${e.message}")
            }
        }
    }

    /**
     * Hapus anime dari pustaka.
     */
    @JavascriptInterface
    fun removeFromLibrary(animeId: String, pkg: String) {
        scope.launch {
            try {
                db.animeDao().delete(animeId, pkg)
                Timber.d("$TAG: Removed from library → $animeId ($pkg)")
                tracker.success("Removed $animeId from library")
            } catch (e: Exception) {
                Timber.e(e, "$TAG: removeFromLibrary failed")
                tracker.error("removeFromLibrary failed: ${e.message}")
            }
        }
    }

    /**
     * Cek apakah anime sudah di pustaka.
     * Synchronous karena JS butuh return value langsung.
     */
    @JavascriptInterface
    fun isInLibrary(animeId: String, pkg: String): Boolean {
        return try {
            runBlocking {
                db.animeDao().exists(animeId, pkg)
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: isInLibrary failed")
            false
        }
    }

    /**
     * Ambil semua anime di pustaka.
     * @return JSON array AnimeModel
     */
    @JavascriptInterface
    fun getLibrary(): String {
        return try {
            val library = runBlocking { db.animeDao().getAll() }
            Timber.d("$TAG: getLibrary → ${library.size} anime")
            gson.toJson(library)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: getLibrary failed")
            "[]"
        }
    }

    // ─────────────────────────────────────────
    // PROGRESS — simpan/ambil progress tonton
    // ─────────────────────────────────────────

    /**
     * Simpan progress tonton episode.
     * Dipanggil setiap 5 detik saat player aktif.
     *
     * @param animeId   ID anime
     * @param pkg       package extension (id.oploverz)
     * @param episodeId ID episode unik
     * @param position  posisi playback dalam detik
     * @param duration  durasi total dalam detik
     */
    @JavascriptInterface
    fun saveProgress(
        animeId: String,
        pkg: String,
        episodeId: String,
        position: Long,
        duration: Long
    ) {
        scope.launch {
            try {
                val progress = ProgressModel(
                    episodeId = episodeId,
                    animeId = animeId,
                    pkg = pkg,
                    position = position,
                    duration = duration,
                    lastWatched = System.currentTimeMillis(),
                    // Tandai selesai kalau progress >= 90%
                    completed = duration > 0 && (position.toFloat() / duration) >= 0.9f
                )
                db.progressDao().upsert(progress)
                Timber.d("$TAG: Progress saved → $episodeId: ${position}s / ${duration}s")
            } catch (e: Exception) {
                Timber.e(e, "$TAG: saveProgress failed")
            }
        }
    }

    /**
     * Ambil progress episode.
     * @return JSON ProgressModel, atau "{}" kalau belum ada
     */
    @JavascriptInterface
    fun getProgress(episodeId: String): String {
        return try {
            val progress = runBlocking { db.progressDao().get(episodeId) }
            if (progress != null) {
                Timber.d("$TAG: Progress for $episodeId → ${progress.position}s")
                gson.toJson(progress)
            } else {
                "{}"
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: getProgress failed")
            "{}"
        }
    }

    /**
     * Tandai episode sebagai sudah ditonton (completed = true).
     * Dipanggil saat episode selesai atau user swipe next.
     */
    @JavascriptInterface
    fun markWatched(episodeId: String, animeId: String, pkg: String) {
        scope.launch {
            try {
                val existing = db.progressDao().get(episodeId)
                val progress = existing?.copy(completed = true, lastWatched = System.currentTimeMillis())
                    ?: ProgressModel(
                        episodeId = episodeId,
                        animeId = animeId,
                        pkg = pkg,
                        position = 0,
                        duration = 0,
                        lastWatched = System.currentTimeMillis(),
                        completed = true
                    )
                db.progressDao().upsert(progress)
                Timber.d("$TAG: Marked watched → $episodeId")
                tracker.success("Marked $episodeId as watched")
            } catch (e: Exception) {
                Timber.e(e, "$TAG: markWatched failed")
                tracker.error("markWatched failed: ${e.message}")
            }
        }
    }

    /**
     * Ambil semua episode yang sudah ditonton untuk anime tertentu.
     * Dipakai untuk warnai episode list di UI.
     * @return JSON array episodeId yang completed
     */
    @JavascriptInterface
    fun getWatchedEpisodes(animeId: String, pkg: String): String {
        return try {
            val watched = runBlocking {
                db.progressDao().getWatchedEpisodeIds(animeId, pkg)
            }
            Timber.d("$TAG: Watched episodes for $animeId → ${watched.size}")
            gson.toJson(watched)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: getWatchedEpisodes failed")
            "[]"
        }
    }

    /**
     * Ambil episode terakhir yang ditonton untuk anime tertentu.
     * Dipakai untuk tombol Play otomatis (resume/next).
     * @return JSON ProgressModel episode terakhir, atau "{}"
     */
    @JavascriptInterface
    fun getLastWatched(animeId: String, pkg: String): String {
        return try {
            val last = runBlocking {
                db.progressDao().getLastWatched(animeId, pkg)
            }
            if (last != null) {
                Timber.d("$TAG: Last watched for $animeId → ${last.episodeId}")
                gson.toJson(last)
            } else {
                "{}"
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: getLastWatched failed")
            "{}"
        }
    }

    // ─────────────────────────────────────────
    // HISTORY — riwayat tonton
    // ─────────────────────────────────────────

    /**
     * Ambil riwayat tonton — diurutkan dari yang terbaru.
     * @return JSON array AnimeModel yang pernah ditonton
     */
    @JavascriptInterface
    fun getHistory(): String {
        return try {
            val history = runBlocking { db.animeDao().getHistory() }
            Timber.d("$TAG: History → ${history.size} entries")
            gson.toJson(history)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: getHistory failed")
            "[]"
        }
    }

    /**
     * Hapus satu anime dari riwayat.
     */
    @JavascriptInterface
    fun removeFromHistory(animeId: String, pkg: String) {
        scope.launch {
            try {
                db.progressDao().deleteByAnime(animeId, pkg)
                Timber.d("$TAG: Removed from history → $animeId ($pkg)")
                tracker.success("Removed $animeId from history")
            } catch (e: Exception) {
                Timber.e(e, "$TAG: removeFromHistory failed")
            }
        }
    }

    /**
     * Hapus semua riwayat tonton.
     */
    @JavascriptInterface
    fun clearHistory() {
        scope.launch {
            try {
                db.progressDao().deleteAll()
                Timber.d("$TAG: History cleared")
                tracker.success("History cleared")
            } catch (e: Exception) {
                Timber.e(e, "$TAG: clearHistory failed")
                tracker.error("clearHistory failed: ${e.message}")
            }
        }
    }

    // ─────────────────────────────────────────
    // SETTINGS — SharedPreferences
    // ─────────────────────────────────────────

    /**
     * Ambil satu setting.
     * @return value string, atau "" kalau tidak ada
     */
    @JavascriptInterface
    fun getSetting(key: String): String {
        return prefs.getString(key, "") ?: ""
    }

    /**
     * Simpan satu setting.
     */
    @JavascriptInterface
    fun setSetting(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
        Timber.d("$TAG: Setting saved → $key=$value")
    }

    /**
     * Ambil semua settings sekaligus.
     * Dipakai settings page JS untuk load initial state.
     * @return JSON map semua settings
     */
    @JavascriptInterface
    fun getAllSettings(): String {
        return try {
            val all = prefs.all.mapValues { it.value.toString() }
            gson.toJson(all)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: getAllSettings failed")
            "{}"
        }
    }

    // ─────────────────────────────────────────
    // BACKUP — export/import data
    // ─────────────────────────────────────────

    /**
     * Export semua data ke JSON string.
     * Dipanggil backup.js untuk generate file .zip.
     * @return JSON berisi library, progress, settings
     */
    @JavascriptInterface
    fun exportData(): String {
        return try {
            val library  = runBlocking { db.animeDao().getAll() }
            val progress = runBlocking { db.progressDao().getAll() }
            val settings = prefs.all.mapValues { it.value.toString() }

            val backup = mapOf(
                "library"   to library,
                "progress"  to progress,
                "settings"  to settings,
                "exportedAt" to System.currentTimeMillis()
            )

            Timber.d("$TAG: Exported ${library.size} anime, ${progress.size} progress entries")
            tracker.success("Data exported")
            gson.toJson(backup)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: exportData failed")
            tracker.error("exportData failed: ${e.message}")
            "{}"
        }
    }

    /**
     * Import data dari JSON string backup.
     * @param backupJson JSON string dari file backup
     * @param callbackId ID callback JS
     */
    @JavascriptInterface
    fun importData(backupJson: String, callbackId: String) {
        scope.launch {
            try {
                @Suppress("UNCHECKED_CAST")
                val backup = gson.fromJson(backupJson, Map::class.java)

                // Import library
                val libraryJson = gson.toJson(backup["library"])
                val library = gson.fromJson(libraryJson, Array<AnimeModel>::class.java)
                db.animeDao().insertAll(library.toList())

                // Import progress
                val progressJson = gson.toJson(backup["progress"])
                val progress = gson.fromJson(progressJson, Array<ProgressModel>::class.java)
                db.progressDao().insertAll(progress.toList())

                // Import settings
                @Suppress("UNCHECKED_CAST")
                val settings = backup["settings"] as? Map<String, String> ?: emptyMap()
                val editor = prefs.edit()
                settings.forEach { (k, v) -> editor.putString(k, v) }
                editor.apply()

                Timber.d("$TAG: Imported ${library.size} anime, ${progress.size} progress")
                tracker.success("Data imported successfully")

                invokeCallback(callbackId, mapOf(
                    "success" to true,
                    "animeCount" to library.size,
                    "progressCount" to progress.size
                ))
            } catch (e: Exception) {
                Timber.e(e, "$TAG: importData failed")
                tracker.error("importData failed: ${e.message}")

                invokeCallback(callbackId, mapOf(
                    "success" to false,
                    "error" to (e.message ?: "Import failed")
                ))
            }
        }
    }

    // ─────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────

    private suspend fun invokeCallback(callbackId: String, result: Any) {
        val json = gson.toJson(result)
        val escaped = json.replace("\\", "\\\\").replace("'", "\\'")
        withContext(Dispatchers.Main) {
            webView.evaluateJavascript(
                "NativeCallback.resolve('$callbackId', '$escaped')",
                null
            )
        }
    }
}
