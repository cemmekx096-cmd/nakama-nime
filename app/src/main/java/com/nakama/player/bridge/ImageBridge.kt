package com.nakama.player.bridge

import android.content.Context
import android.webkit.JavascriptInterface
import coil.ImageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import com.nakama.player.logger.NakamaLogger
import com.nakama.player.logger.PerformanceTracker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.io.File
import java.io.FileOutputStream

/**
 * Bridge antara JS dan Coil image loader.
 * Handle download + cache thumbnail anime & icon extension.
 *
 * Dipanggil dari JS:
 * NativeImage.loadThumbnail(url, animeId, callbackId)
 * NativeImage.loadIcon(url, pkg, callbackId)
 * NativeImage.getThumbnailPath(animeId) → path | ""
 * NativeImage.getIconPath(pkg) → path | ""
 * NativeImage.clearThumbnails()
 * NativeImage.clearIcons()
 * NativeImage.getCacheSize() → JSON
 */
class ImageBridge(
    private val context: Context,
    private val webView: android.webkit.WebView
) {
    companion object {
        const val TAG = "ImageBridge"
        private const val THUMBNAIL_DIR = "tmp/thumbnails"
        private const val ICON_DIR      = "tmp/icons"
        private const val BANNER_DIR    = "tmp/banners"
    }

    private val tracker = NakamaLogger.feature(TAG)
    private val scope   = CoroutineScope(Dispatchers.IO)

    // Dir untuk tiap jenis gambar
    private val thumbnailDir = File(context.cacheDir, THUMBNAIL_DIR).also { it.mkdirs() }
    private val iconDir      = File(context.cacheDir, ICON_DIR).also { it.mkdirs() }
    private val bannerDir    = File(context.cacheDir, BANNER_DIR).also { it.mkdirs() }

    // Coil ImageLoader — pakai instance global yang sudah di-setup di App.kt
    private val imageLoader: ImageLoader
        get() = coil.Coil.imageLoader(context)

    // ─────────────────────────────────────────
    // THUMBNAIL — gambar anime
    // ─────────────────────────────────────────

    /**
     * Load thumbnail anime dari URL.
     * Cek lokal dulu — kalau sudah ada return path lokal.
     * Kalau belum → download via Coil → simpan → return path.
     *
     * @param url        URL thumbnail dari site anime
     * @param animeId    ID unik anime (dipakai sebagai nama file)
     * @param callbackId ID callback JS
     */
    @JavascriptInterface
    fun loadThumbnail(url: String, animeId: String, callbackId: String) {
        val perf = PerformanceTracker("loadThumbnail:$animeId")
        perf.start()

        scope.launch {
            try {
                // Sanitize animeId jadi nama file yang aman
                val safeId = sanitizeFilename(animeId)
                val file   = File(thumbnailDir, "$safeId.jpg")

                // Sudah ada di lokal? Langsung return
                if (file.exists() && file.length() > 0) {
                    Timber.d("$TAG: Thumbnail cache hit → $animeId")
                    perf.end()
                    invokeCallback(callbackId, ImageResult(
                        success  = true,
                        path     = file.absolutePath,
                        fromCache = true,
                        error    = null
                    ))
                    return@launch
                }

                // Belum ada → download via Coil
                Timber.d("$TAG: Downloading thumbnail → $url")
                val localPath = downloadImage(url, file)

                perf.end()

                if (localPath != null) {
                    tracker.success("Thumbnail downloaded → $animeId")
                    invokeCallback(callbackId, ImageResult(
                        success   = true,
                        path      = localPath,
                        fromCache = false,
                        error     = null
                    ))
                } else {
                    throw Exception("Download returned null")
                }

            } catch (e: Exception) {
                perf.end()
                tracker.error("loadThumbnail failed for $animeId: ${e.message}")
                Timber.e(e, "$TAG: loadThumbnail failed → $url")

                invokeCallback(callbackId, ImageResult(
                    success   = false,
                    path      = "",
                    fromCache = false,
                    error     = e.message ?: "Failed to load thumbnail"
                ))
            }
        }
    }

    // ─────────────────────────────────────────
    // ICON — icon extension
    // ─────────────────────────────────────────

    /**
     * Load icon extension dari URL.
     * Sama seperti thumbnail tapi disimpan di tmp/icons/.
     *
     * @param url  URL icon dari repo extension
     * @param pkg  package ID extension (id.oploverz)
     */
    @JavascriptInterface
    fun loadIcon(url: String, pkg: String, callbackId: String) {
        scope.launch {
            try {
                val safeId = sanitizeFilename(pkg)
                val file   = File(iconDir, "$safeId.png")

                if (file.exists() && file.length() > 0) {
                    Timber.d("$TAG: Icon cache hit → $pkg")
                    invokeCallback(callbackId, ImageResult(
                        success   = true,
                        path      = file.absolutePath,
                        fromCache = true,
                        error     = null
                    ))
                    return@launch
                }

                Timber.d("$TAG: Downloading icon → $url")
                val localPath = downloadImage(url, file)

                if (localPath != null) {
                    tracker.success("Icon downloaded → $pkg")
                    invokeCallback(callbackId, ImageResult(
                        success   = true,
                        path      = localPath,
                        fromCache = false,
                        error     = null
                    ))
                } else {
                    throw Exception("Download returned null")
                }

            } catch (e: Exception) {
                tracker.error("loadIcon failed for $pkg: ${e.message}")
                Timber.e(e, "$TAG: loadIcon failed → $url")

                invokeCallback(callbackId, ImageResult(
                    success   = false,
                    path      = "",
                    fromCache = false,
                    error     = e.message ?: "Failed to load icon"
                ))
            }
        }
    }

    // ─────────────────────────────────────────
    // BANNER — banner/header anime (opsional)
    // ─────────────────────────────────────────

    @JavascriptInterface
    fun loadBanner(url: String, animeId: String, callbackId: String) {
        scope.launch {
            try {
                val safeId = sanitizeFilename(animeId)
                val file   = File(bannerDir, "$safeId.jpg")

                if (file.exists() && file.length() > 0) {
                    invokeCallback(callbackId, ImageResult(
                        success = true, path = file.absolutePath,
                        fromCache = true, error = null
                    ))
                    return@launch
                }

                val localPath = downloadImage(url, file)
                invokeCallback(callbackId, ImageResult(
                    success   = localPath != null,
                    path      = localPath ?: "",
                    fromCache = false,
                    error     = if (localPath == null) "Download failed" else null
                ))
            } catch (e: Exception) {
                Timber.e(e, "$TAG: loadBanner failed → $url")
                invokeCallback(callbackId, ImageResult(
                    success = false, path = "",
                    fromCache = false, error = e.message
                ))
            }
        }
    }

    // ─────────────────────────────────────────
    // QUERY — cek path lokal
    // ─────────────────────────────────────────

    /**
     * Cek apakah thumbnail sudah ada di lokal.
     * @return absolute path kalau ada, "" kalau tidak
     */
    @JavascriptInterface
    fun getThumbnailPath(animeId: String): String {
        val file = File(thumbnailDir, "${sanitizeFilename(animeId)}.jpg")
        return if (file.exists() && file.length() > 0) file.absolutePath else ""
    }

    /**
     * Cek apakah icon extension sudah ada di lokal.
     */
    @JavascriptInterface
    fun getIconPath(pkg: String): String {
        val file = File(iconDir, "${sanitizeFilename(pkg)}.png")
        return if (file.exists() && file.length() > 0) file.absolutePath else ""
    }

    // ─────────────────────────────────────────
    // CACHE MANAGEMENT
    // ─────────────────────────────────────────

    /**
     * Hapus semua thumbnail.
     * Dipanggil dari Settings → Storage → Clear Cache.
     */
    @JavascriptInterface
    fun clearThumbnails(): Boolean {
        return try {
            thumbnailDir.listFiles()?.forEach { it.delete() }
            Timber.d("$TAG: Thumbnails cleared")
            tracker.success("Thumbnails cleared")
            true
        } catch (e: Exception) {
            Timber.e(e, "$TAG: clearThumbnails failed")
            false
        }
    }

    /**
     * Hapus semua icon extension.
     */
    @JavascriptInterface
    fun clearIcons(): Boolean {
        return try {
            iconDir.listFiles()?.forEach { it.delete() }
            Timber.d("$TAG: Icons cleared")
            true
        } catch (e: Exception) {
            Timber.e(e, "$TAG: clearIcons failed")
            false
        }
    }

    /**
     * Ambil ukuran total semua cache gambar.
     * @return JSON: { thumbnails, icons, banners, total }
     */
    @JavascriptInterface
    fun getCacheSize(): String {
        return try {
            val thumbnailSize = dirSize(thumbnailDir)
            val iconSize      = dirSize(iconDir)
            val bannerSize    = dirSize(bannerDir)
            val total         = thumbnailSize + iconSize + bannerSize

            val gson = com.google.gson.Gson()
            gson.toJson(mapOf(
                "thumbnails" to formatSize(thumbnailSize),
                "icons"      to formatSize(iconSize),
                "banners"    to formatSize(bannerSize),
                "total"      to formatSize(total),
                "totalBytes" to total
            ))
        } catch (e: Exception) {
            Timber.e(e, "$TAG: getCacheSize failed")
            "{}"
        }
    }

    // ─────────────────────────────────────────
    // DOWNLOAD VIA COIL
    // ─────────────────────────────────────────

    /**
     * Download gambar dari URL via Coil → simpan ke file lokal.
     * Coil handle: retry, timeout, memory cache otomatis.
     * @return absolute path file yang tersimpan, atau null kalau gagal
     */
    private suspend fun downloadImage(url: String, targetFile: File): String? {
        return try {
            val request = ImageRequest.Builder(context)
                .data(url)
                .allowHardware(false) // butuh software bitmap untuk disimpan ke file
                .build()

            val result = imageLoader.execute(request)

            if (result is SuccessResult) {
                // Simpan bitmap ke file
                val bitmap = (result.drawable as? android.graphics.drawable.BitmapDrawable)
                    ?.bitmap
                    ?: return null

                withContext(Dispatchers.IO) {
                    FileOutputStream(targetFile).use { out ->
                        bitmap.compress(
                            android.graphics.Bitmap.CompressFormat.JPEG,
                            85,      // quality 85% — balance antara ukuran & kualitas
                            out
                        )
                    }
                }

                Timber.d("$TAG: Saved image → ${targetFile.absolutePath} (${formatSize(targetFile.length())})")
                targetFile.absolutePath
            } else {
                Timber.w("$TAG: Coil returned non-success for $url")
                null
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: downloadImage failed → $url")
            null
        }
    }

    // ─────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────

    /**
     * Sanitize string jadi nama file yang aman.
     * Hapus karakter yang tidak valid untuk nama file.
     * Contoh: "one-piece/episode-1" → "one-piece_episode-1"
     */
    private fun sanitizeFilename(name: String): String {
        return name
            .replace(Regex("[/\\\\:*?\"<>|]"), "_")
            .replace(Regex("\\s+"), "_")
            .take(100) // max 100 char untuk nama file
    }

    /**
     * Hitung total ukuran folder.
     */
    private fun dirSize(dir: File): Long {
        return dir.walkTopDown()
            .filter { it.isFile }
            .sumOf { it.length() }
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

    private suspend fun invokeCallback(callbackId: String, result: ImageResult) {
        val json    = com.google.gson.Gson().toJson(result)
        val escaped = json.replace("\\", "\\\\").replace("'", "\\'")
        withContext(Dispatchers.Main) {
            webView.evaluateJavascript(
                "NativeCallback.resolve('$callbackId', '$escaped')",
                null
            )
        }
    }

    // ─────────────────────────────────────────
    // DATA CLASS
    // ─────────────────────────────────────────

    data class ImageResult(
        val success:   Boolean,
        val path:      String,
        val fromCache: Boolean,
        val error:     String?
    )
}
