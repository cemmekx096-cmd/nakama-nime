package com.nakama.player.ui

import android.content.Context
import android.graphics.Bitmap
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import com.nakama.player.logger.NakamaLogger
import com.nakama.player.network.NAKAMA_USER_AGENT
import com.nakama.player.network.baseClient
import com.nakama.player.network.getHeaders
import com.nakama.player.network.NakamaCookieManager
import timber.log.Timber
import java.io.ByteArrayInputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Custom WebViewClient Nakama.
 * Tugas utama:
 * 1. Intercept semua request dari WebView → bypass CORS
 * 2. Inject headers (UA, Referer, Cookie) per request
 * 3. Handle error & redirect
 * 4. Block request yang tidak perlu (tracker, ads)
 */
class CustomWebViewClient(
    private val context: Context,
    private val cookieManager: NakamaCookieManager,
    private val onPageStarted: ((url: String) -> Unit)? = null,
    private val onPageFinished: ((url: String) -> Unit)? = null,
    private val onError: ((error: String) -> Unit)? = null
) : WebViewClient() {

    companion object {
        const val TAG = "WebViewClient"

        // Domain yang di-block — tracker & ads
        // Hemat bandwidth + lebih cepat load
        private val BLOCKED_DOMAINS = setOf(
            "google-analytics.com",
            "googletagmanager.com",
            "doubleclick.net",
            "facebook.com",
            "facebook.net",
            "adservice.google.com",
            "googlesyndication.com",
            "ads.twitter.com",
            "hotjar.com",
            "clarity.ms"
        )

        // Extension yang di-block — tidak perlu di-load
        private val BLOCKED_EXTENSIONS = setOf(
            ".woff", ".woff2", ".ttf", ".otf",  // font
            ".map"                                // source map
        )
    }

    private val tracker = NakamaLogger.feature(TAG)
    private val prefs = context.getSharedPreferences("nakama_settings", Context.MODE_PRIVATE)

    // Simpan referer per host — di-set oleh extension via PlayerBridge
    var currentReferer: String = ""
    var currentExtensionHeaders: Map<String, String> = emptyMap()

    // ─────────────────────────────────────────
    // INTERCEPT REQUEST — inti CORS bypass
    // ─────────────────────────────────────────

    /**
     * Intercept semua request dari WebView.
     * Kalau request ini untuk halaman anime/episode → fetch via OkHttp (bypass CORS).
     * Kalau request ini untuk embed player → biarkan WebView handle sendiri.
     */
    override fun shouldInterceptRequest(
        view: WebView,
        request: WebResourceRequest
    ): WebResourceResponse? {
        val url = request.url.toString()
        val host = request.url.host ?: ""

        // 1. Block tracker & ads
        if (shouldBlock(url, host)) {
            Timber.d("$TAG: Blocked → $url")
            return emptyResponse()
        }

        // 2. Biarkan file lokal lewat (assets/)
        if (url.startsWith("file:///android_asset/")) {
            return null
        }

        // 3. Biarkan embed player WebView handle sendiri
        // (filedon, streamtape, dll — mereka butuh JS environment penuh)
        if (isEmbedPlayer(url)) {
            Timber.d("$TAG: Embed player — passing through: $url")
            return null
        }

        // 4. Intercept request lain → fetch via OkHttp (bebas CORS)
        return try {
            fetchViaOkHttp(url, request, host)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Intercept failed → $url")
            null // fallback ke WebView default
        }
    }

    /**
     * Fetch URL via OkHttp — bebas CORS, inject headers + cookie.
     */
    private fun fetchViaOkHttp(
        url: String,
        request: WebResourceRequest,
        host: String
    ): WebResourceResponse? {
        return try {
            val ua = prefs.getString("user_agent", NAKAMA_USER_AGENT) ?: NAKAMA_USER_AGENT
            val cookies = cookieManager.getCookies(host)

            // Merge headers: default + extension headers + referer + cookie
            val headers = getHeaders(
                headers = currentExtensionHeaders + mapOf(
                    "Referer" to currentReferer.ifBlank { "https://$host" }
                ),
                cookie = cookies,
                userAgent = ua
            )

            val okRequest = okhttp3.Request.Builder()
                .url(url)
                .headers(headers)
                .build()

            val response = baseClient.newCall(okRequest).execute()
            val body = response.body ?: return null
            val contentType = response.header("Content-Type", "text/html") ?: "text/html"
            val mimeType = contentType.split(";").first().trim()
            val encoding = contentType.split("charset=").getOrNull(1)?.trim() ?: "UTF-8"

            // Sync cookie baru dari response
            val setCookie = response.header("Set-Cookie")
            if (!setCookie.isNullOrBlank()) {
                cookieManager.setCookies(host, parseCookieFromHeader(setCookie))
            }

            Timber.d("$TAG: OkHttp OK ${response.code} → $url")

            WebResourceResponse(
                mimeType,
                encoding,
                response.code,
                response.message.ifBlank { "OK" },
                response.headers.toMap(),
                body.byteStream()
            )
        } catch (e: Exception) {
            Timber.w("$TAG: OkHttp fetch failed → $url: ${e.message}")
            null
        }
    }

    // ─────────────────────────────────────────
    // PAGE LIFECYCLE
    // ─────────────────────────────────────────

    override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)
        Timber.d("$TAG: Page started → $url")
        onPageStarted?.invoke(url)
    }

    override fun onPageFinished(view: WebView, url: String) {
        super.onPageFinished(view, url)
        Timber.d("$TAG: Page finished → $url")

        // Sync cookie dari WebView ke manager kita
        val host = try { java.net.URI(url).host ?: "" } catch (e: Exception) { "" }
        if (host.isNotBlank()) {
            cookieManager.syncFromWebView(url)
        }

        onPageFinished?.invoke(url)
        tracker.success("Page loaded → $url")
    }

    override fun onReceivedError(
        view: WebView,
        request: WebResourceRequest,
        error: WebResourceError
    ) {
        super.onReceivedError(view, request, error)
        val msg = "Error ${error.errorCode} → ${request.url}: ${error.description}"
        Timber.e("$TAG: $msg")

        // Hanya report error untuk main frame (bukan sub-resource)
        if (request.isForMainFrame) {
            onError?.invoke(msg)
            tracker.error(msg)
        }
    }

    // ─────────────────────────────────────────
    // REDIRECT
    // ─────────────────────────────────────────

    /**
     * Handle redirect — update referer saat URL berubah.
     */
    override fun shouldOverrideUrlLoading(
        view: WebView,
        request: WebResourceRequest
    ): Boolean {
        val url = request.url.toString()

        // Biarkan semua URL dihandle WebView sendiri
        // Kecuali deep link / intent URL
        if (url.startsWith("intent://") || url.startsWith("market://")) {
            Timber.d("$TAG: Blocked intent URL → $url")
            return true
        }

        Timber.d("$TAG: URL loading → $url")
        return false
    }

    // ─────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────

    /**
     * Cek apakah URL perlu di-block (tracker/ads).
     */
    private fun shouldBlock(url: String, host: String): Boolean {
        // Cek blocked domain
        if (BLOCKED_DOMAINS.any { host.contains(it) }) return true

        // Cek blocked extension
        val path = url.split("?").first().lowercase()
        if (BLOCKED_EXTENSIONS.any { path.endsWith(it) }) return true

        return false
    }

    /**
     * Cek apakah URL adalah embed player.
     * Embed player dibiarkan WebView handle sendiri
     * agar JS player-nya bisa jalan normal.
     */
    private fun isEmbedPlayer(url: String): Boolean {
        val embedDomains = listOf(
            "filedon.co",
            "streamtape.com",
            "doodstream.com",
            "mp4upload.com",
            "fembed.com",
            "yourupload.com",
            "letsupload.cc",
            "pixeldrain.com"
        )
        return embedDomains.any { url.contains(it) }
    }

    /**
     * Parse Set-Cookie header → Map
     * Contoh: "cf_clearance=abc; Path=/; HttpOnly" → {"cf_clearance": "abc"}
     */
    private fun parseCookieFromHeader(setCookie: String): Map<String, String> {
        return setCookie.split(";")
            .first() // ambil hanya key=value, abaikan Path/HttpOnly/dll
            .split("=")
            .let { parts ->
                val key = parts.getOrNull(0)?.trim() ?: return emptyMap()
                val value = parts.getOrNull(1)?.trim() ?: ""
                mapOf(key to value)
            }
    }

    /**
     * Return empty response untuk request yang di-block.
     * Lebih baik dari null karena tidak trigger error di WebView.
     */
    private fun emptyResponse(): WebResourceResponse {
        return WebResourceResponse(
            "text/plain",
            "UTF-8",
            200,
            "OK",
            emptyMap(),
            ByteArrayInputStream(ByteArray(0))
        )
    }
}
