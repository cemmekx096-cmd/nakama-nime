package com.nakama.player.bridge

import android.content.Context
import android.webkit.JavascriptInterface
import com.google.gson.Gson
import com.nakama.player.logger.NakamaLogger
import com.nakama.player.logger.PerformanceTracker
import com.nakama.player.network.app
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.io.File
import java.security.MessageDigest

/**
 * Bridge antara JS dan sistem extension Nakama.
 * Handle: install, update, uninstall, load, validasi hash, trust system.
 *
 * Dipanggil dari JS:
 * NativeExtension.fetchIndex(repoUrl, callbackId)
 * NativeExtension.install(pkg, fileUrl, sha256, trusted, callbackId)
 * NativeExtension.uninstall(pkg, callbackId)
 * NativeExtension.readExtension(pkg) → return JS code
 * NativeExtension.getInstalled() → return JSON list
 * NativeExtension.isInstalled(pkg) → boolean
 * NativeExtension.getVersion(pkg) → version string
 */
class ExtensionBridge(
    private val context: Context,
    private val webView: android.webkit.WebView
) {
    companion object {
        const val TAG = "ExtensionBridge"
        private const val EXT_DIR = "extensions"
        private const val META_DIR = "extensions_meta"
    }

    private val tracker = NakamaLogger.feature(TAG)
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO)

    // Dir untuk simpan file .js extension
    private val extDir = File(context.filesDir, EXT_DIR).also { it.mkdirs() }

    // Dir untuk simpan metadata extension (versi, trust status, dll)
    private val metaDir = File(context.filesDir, META_DIR).also { it.mkdirs() }

    // ─────────────────────────────────────────
    // INDEX — fetch daftar extension dari repo
    // ─────────────────────────────────────────

    /**
     * Fetch index.json dari repo URL.
     * Dipanggil saat user buka halaman extension manager.
     * @param repoUrl URL index.json (default atau custom repo)
     * @param callbackId ID callback JS
     */
    @JavascriptInterface
    fun fetchIndex(repoUrl: String, callbackId: String) {
        val perf = PerformanceTracker("fetchIndex")
        perf.start()

        scope.launch {
            try {
                Timber.d("$TAG: Fetching index from $repoUrl")
                tracker.debug("Fetching index → $repoUrl")

                val response = app.get(repoUrl)
                val json = response.text

                perf.end()
                tracker.success("Index fetched from $repoUrl")

                invokeCallback(callbackId, IndexResult(
                    success = true,
                    data = json,
                    error = null
                ))
            } catch (e: Exception) {
                perf.end()
                tracker.error("fetchIndex failed: ${e.message}")
                Timber.e(e, "$TAG: fetchIndex failed → $repoUrl")

                invokeCallback(callbackId, IndexResult(
                    success = false,
                    data = "",
                    error = e.message ?: "Failed to fetch index"
                ))
            }
        }
    }

    // ─────────────────────────────────────────
    // INSTALL
    // ─────────────────────────────────────────

    /**
     * Download dan install extension dari URL.
     * Flow:
     * 1. Download .js dari fileUrl
     * 2. Verifikasi SHA256
     * 3. Simpan ke internal storage
     * 4. Simpan metadata (versi, trust, repo)
     *
     * @param pkg      package ID (contoh: id.oploverz)
     * @param fileUrl  URL raw .js dari GitHub
     * @param sha256   hash expected dari index.json
     * @param trusted  true = repo default, false = repo custom
     * @param callbackId ID callback JS
     */
    @JavascriptInterface
    fun install(
        pkg: String,
        fileUrl: String,
        sha256: String,
        trusted: Boolean,
        callbackId: String
    ) {
        val perf = PerformanceTracker("install:$pkg")
        perf.start()

        scope.launch {
            try {
                Timber.d("$TAG: Installing $pkg from $fileUrl")
                tracker.debug("Installing $pkg — trusted=$trusted")

                // Step 1 — Download .js
                val jsCode = app.get(fileUrl).text
                if (jsCode.isBlank()) {
                    throw Exception("Downloaded file is empty")
                }

                // Step 2 — Verifikasi SHA256
                val actualHash = sha256(jsCode)
                if (!sha256.equals(actualHash, ignoreCase = true)) {
                    throw SecurityException(
                        "Hash mismatch for $pkg\n" +
                        "Expected : $sha256\n" +
                        "Actual   : $actualHash"
                    )
                }
                Timber.d("$TAG: Hash OK for $pkg")

                // Step 3 — Simpan file .js
                val jsFile = File(extDir, "$pkg.js")
                jsFile.writeText(jsCode)
                Timber.d("$TAG: Saved $pkg.js to ${jsFile.absolutePath}")

                // Step 4 — Simpan metadata
                val meta = ExtensionMeta(
                    pkg = pkg,
                    fileUrl = fileUrl,
                    sha256 = sha256,
                    trusted = trusted,
                    installedAt = System.currentTimeMillis(),
                    version = extractVersion(jsCode)
                )
                saveMeta(pkg, meta)

                perf.end()
                tracker.success("$pkg installed successfully")

                invokeCallback(callbackId, InstallResult(
                    success = true,
                    pkg = pkg,
                    error = null
                ))

            } catch (e: SecurityException) {
                // Hash mismatch — ini serius
                perf.end()
                tracker.error("Hash mismatch for $pkg: ${e.message}")
                Timber.e(e, "$TAG: SECURITY — Hash mismatch for $pkg")

                // Hapus file kalau sudah terlanjur tersimpan
                File(extDir, "$pkg.js").delete()

                invokeCallback(callbackId, InstallResult(
                    success = false,
                    pkg = pkg,
                    error = "HASH_MISMATCH: ${e.message}"
                ))

            } catch (e: Exception) {
                perf.end()
                tracker.error("Install failed for $pkg: ${e.message}")
                Timber.e(e, "$TAG: Install failed → $pkg")

                invokeCallback(callbackId, InstallResult(
                    success = false,
                    pkg = pkg,
                    error = e.message ?: "Install failed"
                ))
            }
        }
    }

    /**
     * Update extension — download ulang dengan verifikasi hash baru.
     * Sama dengan install tapi replace file yang sudah ada.
     */
    @JavascriptInterface
    fun update(
        pkg: String,
        fileUrl: String,
        sha256: String,
        callbackId: String
    ) {
        // Ambil trust status dari meta yang sudah ada
        val existingMeta = loadMeta(pkg)
        val trusted = existingMeta?.trusted ?: false

        Timber.d("$TAG: Updating $pkg — trusted=$trusted")
        tracker.debug("Updating $pkg")

        // Reuse install — akan replace file yang ada
        install(pkg, fileUrl, sha256, trusted, callbackId)
    }

    // ─────────────────────────────────────────
    // UNINSTALL
    // ─────────────────────────────────────────

    /**
     * Hapus extension — delete file .js dan metadata.
     */
    @JavascriptInterface
    fun uninstall(pkg: String, callbackId: String) {
        scope.launch {
            try {
                Timber.d("$TAG: Uninstalling $pkg")
                tracker.debug("Uninstalling $pkg")

                // Hapus file .js
                val jsFile = File(extDir, "$pkg.js")
                val deleted = jsFile.delete()

                // Hapus metadata
                File(metaDir, "$pkg.json").delete()

                tracker.success("$pkg uninstalled — fileDeleted=$deleted")
                Timber.d("$TAG: $pkg uninstalled — fileDeleted=$deleted")

                invokeCallback(callbackId, InstallResult(
                    success = true,
                    pkg = pkg,
                    error = null
                ))
            } catch (e: Exception) {
                tracker.error("Uninstall failed for $pkg: ${e.message}")
                Timber.e(e, "$TAG: Uninstall failed → $pkg")

                invokeCallback(callbackId, InstallResult(
                    success = false,
                    pkg = pkg,
                    error = e.message ?: "Uninstall failed"
                ))
            }
        }
    }

    // ─────────────────────────────────────────
    // READ — load JS code untuk di-eval di core.js
    // ─────────────────────────────────────────

    /**
     * Baca isi file .js extension dari internal storage.
     * Dipanggil core.js saat load extension untuk di-eval.
     * @return JS code string, atau "" kalau tidak ada
     */
    @JavascriptInterface
    fun readExtension(pkg: String): String {
        return try {
            val file = File(extDir, "$pkg.js")
            if (!file.exists()) {
                Timber.w("$TAG: Extension file not found — $pkg")
                return ""
            }
            val code = file.readText()
            Timber.d("$TAG: Read ${code.length} chars for $pkg")
            code
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Failed to read extension — $pkg")
            ""
        }
    }

    // ─────────────────────────────────────────
    // QUERY — dipanggil JS untuk cek status
    // ─────────────────────────────────────────

    /**
     * Ambil list semua extension yang terinstall beserta metadatanya.
     * @return JSON array of ExtensionMeta
     */
    @JavascriptInterface
    fun getInstalled(): String {
        return try {
            val metas = metaDir.listFiles()
                ?.filter { it.extension == "json" }
                ?.mapNotNull { file ->
                    try {
                        gson.fromJson(file.readText(), ExtensionMeta::class.java)
                    } catch (e: Exception) {
                        Timber.w("$TAG: Failed to parse meta for ${file.name}")
                        null
                    }
                } ?: emptyList()

            Timber.d("$TAG: getInstalled → ${metas.size} extensions")
            gson.toJson(metas)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: getInstalled failed")
            "[]"
        }
    }

    /**
     * Cek apakah extension sudah terinstall.
     */
    @JavascriptInterface
    fun isInstalled(pkg: String): Boolean {
        return File(extDir, "$pkg.js").exists()
    }

    /**
     * Ambil versi extension yang terinstall.
     * @return version string, atau "0.0" kalau tidak ada
     */
    @JavascriptInterface
    fun getVersion(pkg: String): String {
        return loadMeta(pkg)?.version ?: "0.0"
    }

    /**
     * Cek apakah extension dari trusted repo.
     */
    @JavascriptInterface
    fun isTrusted(pkg: String): Boolean {
        return loadMeta(pkg)?.trusted ?: false
    }

    /**
     * Ambil semua metadata extension sebagai JSON.
     */
    @JavascriptInterface
    fun getMeta(pkg: String): String {
        return try {
            gson.toJson(loadMeta(pkg) ?: "")
        } catch (e: Exception) {
            "{}"
        }
    }

    // ─────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────

    /**
     * Hitung SHA256 dari string content.
     */
    private fun sha256(content: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val bytes = digest.digest(content.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    /**
     * Extract versi dari METADATA block di .js extension.
     * Cari: version: "1.0"
     */
    private fun extractVersion(jsCode: String): String {
        return try {
            Regex("""version\s*:\s*["']([^"']+)["']""")
                .find(jsCode)
                ?.groupValues
                ?.get(1)
                ?: "0.0"
        } catch (e: Exception) {
            "0.0"
        }
    }

    /**
     * Simpan metadata extension ke file JSON.
     */
    private fun saveMeta(pkg: String, meta: ExtensionMeta) {
        try {
            val file = File(metaDir, "$pkg.json")
            file.writeText(gson.toJson(meta))
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Failed to save meta for $pkg")
        }
    }

    /**
     * Load metadata extension dari file JSON.
     */
    private fun loadMeta(pkg: String): ExtensionMeta? {
        return try {
            val file = File(metaDir, "$pkg.json")
            if (!file.exists()) return null
            gson.fromJson(file.readText(), ExtensionMeta::class.java)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Failed to load meta for $pkg")
            null
        }
    }

    /**
     * Inject hasil ke JS via callback.
     */
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

    // ─────────────────────────────────────────
    // DATA CLASSES
    // ─────────────────────────────────────────

    data class ExtensionMeta(
        val pkg: String,
        val fileUrl: String,
        val sha256: String,
        val trusted: Boolean,
        val installedAt: Long,
        val version: String
    )

    data class InstallResult(
        val success: Boolean,
        val pkg: String,
        val error: String?
    )

    data class IndexResult(
        val success: Boolean,
        val data: String,
        val error: String?
    )
}
