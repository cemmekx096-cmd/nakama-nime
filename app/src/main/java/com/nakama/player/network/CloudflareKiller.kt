package com.nakama.player.network

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.annotation.AnyThread
import com.lagradost.nicehttp.Requests.Companion.await
import com.lagradost.nicehttp.cookies
import com.nakama.player.logger.NakamaLogger
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import okhttp3.Headers
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response
import timber.log.Timber
import java.net.URI
import kotlin.coroutines.resume

@AnyThread
class CloudflareKiller(private val context: Context) : Interceptor {

    companion object {
        const val TAG = "CloudflareKiller"
        private val ERROR_CODES = listOf(403, 503)
        private val CLOUDFLARE_SERVERS = listOf("cloudflare-nginx", "cloudflare")
        private const val TIMEOUT_MS = 15_000L  // 15 detik timeout solve CF
    }

    private val tracker = NakamaLogger.feature(TAG)

    // Simpan cookie per host — persist selama app hidup
    val savedCookies: MutableMap<String, Map<String, String>> = mutableMapOf()

    init {
        // Clear cookie lama saat init agar CF generate cookie baru
        try {
            CookieManager.getInstance().removeAllCookies(null)
            Timber.d("$TAG: Cleared old cookies")
        } catch (e: Exception) {
            Timber.w("$TAG: Failed to clear cookies — ${e.message}")
        }
    }

    /**
     * Ambil headers lengkap dengan cookie CF + UA WebView.
     * Dipakai oleh extension yang butuh CF headers untuk request manual.
     */
    fun getCookieHeaders(url: String): Headers {
        val host = try { URI(url).host } catch (e: Exception) { "" }
        return getHeaders(
            headers = mapOf("user-agent" to getWebViewUserAgent()),
            cookie = savedCookies[host] ?: emptyMap()
        )
    }

    override fun intercept(chain: Interceptor.Chain): Response = runBlocking {
        val request = chain.request()
        tracker.start()

        // Kalau sudah punya cookie untuk host ini, langsung pakai
        val existingCookies = savedCookies[request.url.host]
        if (existingCookies != null) {
            Timber.d("$TAG: Using saved cookies for ${request.url.host}")
            return@runBlocking proceedWithCookies(request, existingCookies)
        }

        // Belum ada cookie — coba request dulu
        val response = chain.proceed(request)

        // Cek apakah response adalah CF challenge
        val isCloudflare = response.header("Server") in CLOUDFLARE_SERVERS
                && response.code in ERROR_CODES

        if (!isCloudflare) {
            tracker.success("No CF detected for ${request.url.host}")
            return@runBlocking response
        }

        // CF terdeteksi — close response lama, bypass
        response.close()
        Timber.d("$TAG: CF detected at ${request.url} — attempting bypass")
        tracker.debug("CF challenge detected at ${request.url}")

        val bypassed = bypassCloudflare(request)
        if (bypassed != null) {
            tracker.success("CF bypassed for ${request.url.host}")
            return@runBlocking bypassed
        }

        // Bypass gagal — fallback ke request biasa
        tracker.error("CF bypass failed for ${request.url}")
        Timber.w("$TAG: CF bypass failed — falling back: ${request.url}")
        return@runBlocking chain.proceed(request)
    }

    /**
     * Cek cookie WebView — kalau sudah ada cf_clearance, simpan dan return true
     */
    private fun trySolveWithSavedCookies(request: Request): Boolean {
        return try {
            val cookie = CookieManager.getInstance()?.getCookie(request.url.toString())
                ?: return false
            val hasClearance = cookie.contains("cf_clearance")
            if (hasClearance) {
                savedCookies[request.url.host] = parseCookieMap(cookie)
                Timber.d("$TAG: cf_clearance found in CookieManager for ${request.url.host}")
            }
            hasClearance
        } catch (e: Exception) {
            Timber.w("$TAG: Error checking saved cookies — ${e.message}")
            false
        }
    }

    /**
     * Proceed request dengan cookie CF yang sudah didapat
     */
    private suspend fun proceedWithCookies(
        request: Request,
        cookies: Map<String, String>
    ): Response {
        val headers = getHeaders(
            headers = request.headers.toMap() + mapOf("user-agent" to getWebViewUserAgent()),
            cookie = cookies + request.cookies
        )
        return baseClient.newCall(
            request.newBuilder().headers(headers).build()
        ).await()
    }

    /**
     * Bypass CF menggunakan hidden WebView.
     * WebView load URL target → CF challenge dijalankan → ambil cookie cf_clearance.
     */
    private suspend fun bypassCloudflare(request: Request): Response? {
        val url = request.url.toString()

        // Kalau cookie sudah ada dari WebView sebelumnya, langsung pakai
        if (trySolveWithSavedCookies(request)) {
            Timber.d("$TAG: Reusing existing WebView cookies")
            val cookies = savedCookies[request.url.host] ?: return null
            return proceedWithCookies(request, cookies)
        }

        Timber.d("$TAG: Launching hidden WebView for $url")
        tracker.debug("Launching hidden WebView for ${request.url.host}")

        // Solve CF di hidden WebView — tunggu sampai dapat cf_clearance atau timeout
        solveWithHiddenWebView(url)

        val cookies = savedCookies[request.url.host] ?: return null
        return proceedWithCookies(request, cookies)
    }

    /**
     * Hidden WebView — load URL target di background.
     * WebView otomatis run JS challenge Cloudflare.
     * Setelah selesai ambil cookie dari CookieManager.
     */
    @SuppressLint("SetJavaScriptEnabled")
    private suspend fun solveWithHiddenWebView(url: String) {
        return suspendCancellableCoroutine { continuation ->
            // WebView harus dibuat di main thread
            Handler(Looper.getMainLooper()).post {
                val webView = WebView(context)

                webView.settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    // Pakai UA default WebView — CF butuh ini
                    userAgentString = null
                }

                webView.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView, url: String) {
                        // Cek cookie setelah halaman load
                        val cookie = CookieManager.getInstance().getCookie(url)
                        if (cookie?.contains("cf_clearance") == true) {
                            try {
                                val host = URI(url).host
                                savedCookies[host] = parseCookieMap(cookie)
                                Timber.d("$TAG: cf_clearance acquired for $host")
                            } catch (e: Exception) {
                                Timber.w("$TAG: Error parsing cookie — ${e.message}")
                            }

                            // Cleanup WebView
                            webView.destroy()

                            if (continuation.isActive) continuation.resume(Unit)
                        }
                    }

                    override fun shouldOverrideUrlLoading(
                        view: WebView,
                        request: WebResourceRequest
                    ): Boolean {
                        // Biarkan WebView handle redirect CF sendiri
                        return false
                    }
                }

                webView.loadUrl(url)

                // Timeout — kalau 15 detik belum dapat cookie, resume anyway
                Handler(Looper.getMainLooper()).postDelayed({
                    if (continuation.isActive) {
                        Timber.w("$TAG: WebView timeout for $url")
                        webView.destroy()
                        continuation.resume(Unit)
                    }
                }, TIMEOUT_MS)
            }
        }
    }

    /**
     * Ambil UA yang dipakai WebView saat ini
     */
    private fun getWebViewUserAgent(): String {
        return try {
            android.webkit.WebSettings.getDefaultUserAgent(context)
        } catch (e: Exception) {
            NAKAMA_USER_AGENT
        }
    }
}
