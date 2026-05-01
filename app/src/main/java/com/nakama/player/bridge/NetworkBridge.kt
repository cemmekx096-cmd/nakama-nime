package com.nakama.player.bridge

import android.content.Context
import android.webkit.JavascriptInterface
import com.nakama.player.network.CloudflareKiller
import com.nakama.player.network.DdosGuardKiller
import com.nakama.player.network.NakamaCookieManager
import com.nakama.player.network.NAKAMA_USER_AGENT
import com.nakama.player.network.NAKAMA_DESKTOP_USER_AGENT
import com.nakama.player.network.app
import com.nakama.player.network.baseClient
import com.nakama.player.network.getHeaders
import com.nakama.player.network.parseCookieMap
import com.nakama.player.network.rebuildNakamaClient
import com.nakama.player.logger.NakamaLogger
import com.nakama.player.logger.PerformanceTracker
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import timber.log.Timber

/**
 * Bridge antara JS (core.js/extension) dan network layer Kotlin.
 * Semua fetch dari JS lewat sini — bebas CORS, support CF/DDG bypass.
 *
 * Dipanggil dari JS:
 * NativeNetwork.fetch(url, headersJson, method, body, callback)
 * NativeNetwork.getCookies(url)
 * NativeNetwork.setCookie(host, key, value)
 * NativeNetwork.clearCookies(host)
 * NativeNetwork.setUserAgent(ua)
 * NativeNetwork.setDnsProvider(id)
 * NativeNetwork.rebuildClient()
 */
class NetworkBridge(
    private val context: Context,
    private val webView: android.webkit.WebView
) {
    companion object {
        const val TAG = "NetworkBridge"
    }

    private val tracker = NakamaLogger.feature(TAG)
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO)
    private val prefs = context.getSharedPreferences("nakama_settings", Context.MODE_PRIVATE)

    // Killers — satu instance, di-share
    private val cfKiller = CloudflareKiller(context)
    private val ddgKiller = DdosGuardKiller(alwaysBypass = false)
    val cookieManager = NakamaCookieManager(context)

    // ─────────────────────────────────────────
    // FETCH — dipanggil dari JS
    // ─────────────────────────────────────────

    /**
     * Fetch URL dari JS.
     * Karena JS Interface tidak support suspend/async,
     * kita pakai callback — hasilnya di-inject balik ke JS via evaluateJavascript.
     *
     * @param url        URL target
     * @param headersJson JSON string headers tambahan (dari METADATA extension)
     * @param method     "GET" atau "POST"
     * @param body       request body (untuk POST)
     * @param callbackId ID callback JS — hasil dikembalikan via JS callback
     */
    @JavascriptInterface
    fun fetch(
        url: String,
        headersJson: String = "{}",
        method: String = "GET",
        body: String = "",
        callbackId: String
    ) {
        val perf = PerformanceTracker("fetch:$url")
        perf.start()

        scope.launch {
            try {
                Timber.d("$TAG: $method $url")
                tracker.debug("Fetch → $method $url")

                // Parse headers dari JS
                val extraHeaders = try {
                    @Suppress("UNCHECKED_CAST")
                    gson.fromJson(headersJson, Map::class.java) as Map<String, String>
                } catch (e: Exception) {
                    emptyMap()
                }

                // Ambil cookie untuk host ini
                val host = extractHost(url)
                val cookies = cookieManager.getCookies(host)

                // Ambil UA — cek settings dulu
                val ua = prefs.getString("user_agent", NAKAMA_USER_AGENT) ?: NAKAMA_USER_AGENT

                // Build headers
                val headers = getHeaders(
                    headers = extraHeaders,
                    cookie = cookies,
                    userAgent = ua
                )

                // Build request
                val request = Request.Builder()
                    .url(url)
                    .headers(headers)
                    .apply {
                        if (method.uppercase() == "POST") {
                            val mediaType = "application/x-www-form-urlencoded".toMediaType()
                            post(body.toRequestBody(mediaType))
                        }
                    }
                    .build()

                // Cek apakah perlu CF/DDG bypass
                val response = when {
                    cookieManager.hasCfClearance(host) -> {
                        // Sudah punya CF cookie — langsung request
                        Timber.d("$TAG: CF cookie available for $host")
                        baseClient.newCall(request).execute()
                    }
                    cookieManager.hasDdgCookies(host) -> {
                        // Sudah punya DDG cookie — langsung request
                        Timber.d("$TAG: DDG cookie available for $host")
                        baseClient.newCall(request).execute()
                    }
                    else -> {
                        // Tidak ada cookie — coba request biasa dulu
                        // CF/DDG killer akan intercept kalau perlu
                        app.baseClient.newCall(request).execute()
                    }
                }

                val responseBody = response.body?.string() ?: ""
                val statusCode = response.code
                val responseHeaders = response.headers.toMap()

                // Sync cookie baru ke manager
                cookieManager.syncFromWebView(url)
                cookieManager.syncFromCfKiller(cfKiller)
                cookieManager.syncFromDdgKiller(ddgKiller)

                perf.end()
                tracker.success("Fetch OK $statusCode → $url")

                // Kembalikan hasil ke JS via callback
                val result = FetchResult(
                    success = true,
                    status = statusCode,
                    body = responseBody,
                    headers = responseHeaders,
                    error = null
                )
                invokeCallback(callbackId, result)

            } catch (e: Exception) {
                perf.end()
                tracker.error("Fetch failed → $url: ${e.message}")
                Timber.e(e, "$TAG: Fetch failed → $url")

                val result = FetchResult(
                    success = false,
                    status = -1,
                    body = "",
                    headers = emptyMap(),
                    error = e.message ?: "Unknown error"
                )
                invokeCallback(callbackId, result)
            }
        }
    }

    /**
     * Fetch khusus untuk bypass Cloudflare.
     * Dipanggil JS kalau fetch biasa gagal dan extension punya flag CF.
     */
    @JavascriptInterface
    fun fetchWithCF(
        url: String,
        headersJson: String = "{}",
        callbackId: String
    ) {
        scope.launch {
            try {
                Timber.d("$TAG: fetchWithCF → $url")
                tracker.debug("fetchWithCF → $url")

                // Tambahkan CF interceptor ke client khusus
                val cfClient = baseClient.newBuilder()
                    .addInterceptor(cfKiller)
                    .build()

                val extraHeaders = try {
                    @Suppress("UNCHECKED_CAST")
                    gson.fromJson(headersJson, Map::class.java) as Map<String, String>
                } catch (e: Exception) { emptyMap() }

                val host = extractHost(url)
                val cookies = cookieManager.getCookies(host)
                val ua = prefs.getString("user_agent", NAKAMA_USER_AGENT) ?: NAKAMA_USER_AGENT

                val request = Request.Builder()
                    .url(url)
                    .headers(getHeaders(extraHeaders, cookies, ua))
                    .build()

                val response = cfClient.newCall(request).execute()
                val body = response.body?.string() ?: ""

                // Sync cookie CF ke manager
                cookieManager.syncFromCfKiller(cfKiller)

                invokeCallback(callbackId, FetchResult(
                    success = true,
                    status = response.code,
                    body = body,
                    headers = response.headers.toMap(),
                    error = null
                ))
            } catch (e: Exception) {
                Timber.e(e, "$TAG: fetchWithCF failed → $url")
                invokeCallback(callbackId, FetchResult(
                    success = false,
                    status = -1,
                    body = "",
                    headers = emptyMap(),
                    error = e.message ?: "CF fetch failed"
                ))
            }
        }
    }

    /**
     * Fetch khusus untuk bypass DDoS-Guard.
     */
    @JavascriptInterface
    fun fetchWithDDG(
        url: String,
        headersJson: String = "{}",
        callbackId: String
    ) {
        scope.launch {
            try {
                Timber.d("$TAG: fetchWithDDG → $url")

                val ddgClient = baseClient.newBuilder()
                    .addInterceptor(ddgKiller)
                    .build()

                val extraHeaders = try {
                    @Suppress("UNCHECKED_CAST")
                    gson.fromJson(headersJson, Map::class.java) as Map<String, String>
                } catch (e: Exception) { emptyMap() }

                val host = extractHost(url)
                val cookies = cookieManager.getCookies(host)
                val ua = prefs.getString("user_agent", NAKAMA_USER_AGENT) ?: NAKAMA_USER_AGENT

                val request = Request.Builder()
                    .url(url)
                    .headers(getHeaders(extraHeaders, cookies, ua))
                    .build()

                val response = ddgClient.newCall(request).execute()
                val body = response.body?.string() ?: ""

                cookieManager.syncFromDdgKiller(ddgKiller)

                invokeCallback(callbackId, FetchResult(
                    success = true,
                    status = response.code,
                    body = body,
                    headers = response.headers.toMap(),
                    error = null
                ))
            } catch (e: Exception) {
                Timber.e(e, "$TAG: fetchWithDDG failed → $url")
                invokeCallback(callbackId, FetchResult(
                    success = false,
                    status = -1,
                    body = "",
                    headers = emptyMap(),
                    error = e.message ?: "DDG fetch failed"
                ))
            }
        }
    }

    // ─────────────────────────────────────────
    // COOKIE — dipanggil dari JS
    // ─────────────────────────────────────────

    @JavascriptInterface
    fun getCookies(url: String): String {
        val host = extractHost(url)
        val cookies = cookieManager.getCookies(host)
        return gson.toJson(cookies)
    }

    @JavascriptInterface
    fun getCookieHeader(url: String): String {
        val host = extractHost(url)
        return cookieManager.getCookieHeader(host)
    }

    @JavascriptInterface
    fun setCookie(host: String, key: String, value: String) {
        cookieManager.setCookie(host, key, value)
        Timber.d("$TAG: JS set cookie → $host: $key")
    }

    @JavascriptInterface
    fun clearCookies(host: String) {
        cookieManager.clearCookies(host)
        Timber.d("$TAG: JS cleared cookies for $host")
    }

    @JavascriptInterface
    fun clearAllCookies() {
        cookieManager.clearAllCookies()
        Timber.d("$TAG: JS cleared all cookies")
    }

    // ─────────────────────────────────────────
    // SETTINGS — dipanggil dari JS (settings page)
    // ─────────────────────────────────────────

    /**
     * Set User Agent — dipanggil dari settings JS.
     * @param type "mobile" | "desktop" | "custom"
     * @param custom UA string jika type = "custom"
     */
    @JavascriptInterface
    fun setUserAgent(type: String, custom: String = "") {
        val ua = when (type) {
            "mobile"  -> NAKAMA_USER_AGENT
            "desktop" -> NAKAMA_DESKTOP_USER_AGENT
            "custom"  -> custom.ifBlank { NAKAMA_USER_AGENT }
            else      -> NAKAMA_USER_AGENT
        }
        prefs.edit().putString("user_agent", ua).apply()
        Timber.d("$TAG: UA set to type=$type")
        tracker.debug("UA changed → $type")
    }

    /**
     * Set DNS provider — dipanggil dari settings JS.
     * @param id DnsProvider.id (0=System, 1=Google, 2=CF, 3=AdGuard, dst)
     */
    @JavascriptInterface
    fun setDnsProvider(id: Int) {
        prefs.edit().putInt("dns_provider", id).apply()
        Timber.d("$TAG: DNS provider set to id=$id")
        tracker.debug("DNS changed → id=$id")
    }

    /**
     * Set rate limit delay — dipanggil dari settings JS.
     * @param ms delay dalam milliseconds
     */
    @JavascriptInterface
    fun setRateLimit(ms: Long) {
        prefs.edit().putLong("rate_limit_ms", ms).apply()
        Timber.d("$TAG: Rate limit set to ${ms}ms")
    }

    /**
     * Rebuild OkHttpClient dengan settings terbaru.
     * Dipanggil JS setelah user save settings network.
     */
    @JavascriptInterface
    fun rebuildClient() {
        scope.launch {
            rebuildNakamaClient(context)
            Timber.d("$TAG: Client rebuilt with new settings")
            tracker.success("Client rebuilt")
        }
    }

    /**
     * Get current network settings — untuk display di settings page JS.
     */
    @JavascriptInterface
    fun getNetworkSettings(): String {
        val settings = mapOf(
            "userAgent"   to (prefs.getString("user_agent", NAKAMA_USER_AGENT) ?: NAKAMA_USER_AGENT),
            "dnsProvider" to prefs.getInt("dns_provider", 0),
            "rateLimitMs" to prefs.getLong("rate_limit_ms", 1500L)
        )
        return gson.toJson(settings)
    }

    // ─────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────

    /**
     * Inject hasil fetch ke JS via callback.
     * JS sudah punya callback registry dengan callbackId.
     * Format: NativeCallback.resolve(callbackId, jsonResult)
     */
    private suspend fun invokeCallback(callbackId: String, result: FetchResult) {
        val json = gson.toJson(result)
        val escaped = json.replace("\\", "\\\\").replace("'", "\\'")
        withContext(Dispatchers.Main) {
            webView.evaluateJavascript(
                "NativeCallback.resolve('$callbackId', '$escaped')",
                null
            )
        }
    }

    private fun extractHost(url: String): String {
        return try {
            java.net.URI(url).host ?: url
        } catch (e: Exception) {
            url
        }
    }

    // ─────────────────────────────────────────
    // DATA CLASS
    // ─────────────────────────────────────────

    data class FetchResult(
        val success: Boolean,
        val status: Int,
        val body: String,
        val headers: Map<String, String>,
        val error: String?
    )
}
