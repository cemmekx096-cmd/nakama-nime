package com.nakama.player.network

import androidx.annotation.AnyThread
import com.lagradost.nicehttp.Requests
import com.lagradost.nicehttp.cookies
import com.nakama.player.logger.NakamaLogger
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response
import timber.log.Timber

/**
 * Bypass DDoS-Guard protection.
 * Ported dari Cloudstream3, dimodifikasi untuk Nakama.
 *
 * @param alwaysBypass → true: pre-fetch cookie DDG sebelum request
 *                       false: coba dulu, bypass hanya jika dapat 403
 *
 * Cara kerja DDG bypass:
 * 1. Fetch script check.js dari DDG untuk dapat path bypass
 * 2. Hit endpoint bypass → dapat cookie __ddg1, __ddg2
 * 3. Inject cookie ke request selanjutnya
 */
@AnyThread
class DdosGuardKiller(
    private val alwaysBypass: Boolean = false
) : Interceptor {

    companion object {
        const val TAG = "DdosGuardKiller"
        private const val DDG_CHECK_URL = "https://check.ddos-guard.net/check.js"
        private val DDG_COOKIE_KEYS = listOf("__ddg1", "__ddg2", "__ddg1_")
    }

    private val tracker = NakamaLogger.feature(TAG)

    // Cookie per host — persist selama app hidup
    val savedCookiesMap: MutableMap<String, Map<String, String>> = mutableMapOf()

    // Path bypass dari check.js — di-cache agar tidak fetch ulang
    private var ddosBypassPath: String? = null

    override fun intercept(chain: Interceptor.Chain): Response = runBlocking {
        val request = chain.request()
        tracker.start()

        // Mode alwaysBypass → langsung bypass tanpa coba dulu
        if (alwaysBypass) {
            Timber.d("$TAG: alwaysBypass=true for ${request.url.host}")
            return@runBlocking bypassDdosGuard(request)
        }

        // Cek dulu apakah host ini sudah punya cookie DDG
        val existingCookies = savedCookiesMap[request.url.host]
        if (existingCookies != null) {
            Timber.d("$TAG: Using saved DDG cookies for ${request.url.host}")
            return@runBlocking proceedWithCookies(request, existingCookies)
        }

        // Coba request biasa dulu
        val response = chain.proceed(request)

        // Kalau 403 → kemungkinan DDG protection
        return@runBlocking if (response.code == 403) {
            Timber.d("$TAG: 403 detected — attempting DDG bypass for ${request.url.host}")
            tracker.debug("403 detected at ${request.url.host}")
            response.close()
            bypassDdosGuard(request)
        } else {
            tracker.success("No DDG detected for ${request.url.host}")
            response
        }
    }

    /**
     * Proses bypass DDG:
     * 1. Ambil bypass path dari check.js (di-cache)
     * 2. Hit endpoint bypass → dapat cookie
     * 3. Simpan cookie → proceed request dengan cookie
     */
    private suspend fun bypassDdosGuard(request: Request): Response {
        return try {
            // Step 1 — Ambil bypass path dari check.js (sekali saja, di-cache)
            if (ddosBypassPath == null) {
                Timber.d("$TAG: Fetching DDG bypass path from check.js")
                val checkJs = Requests().get(DDG_CHECK_URL).text
                ddosBypassPath = Regex("'(.*?)'").find(checkJs)?.groupValues?.get(1)
                Timber.d("$TAG: DDG bypass path → $ddosBypassPath")
            }

            // Step 2 — Ambil cookie dari endpoint bypass
            val cookies = savedCookiesMap[request.url.host]
                ?: fetchDdgCookies(request)

            // Step 3 — Proceed dengan cookie
            tracker.success("DDG bypassed for ${request.url.host}")
            proceedWithCookies(request, cookies)

        } catch (e: Exception) {
            tracker.error("DDG bypass failed for ${request.url.host}: ${e.message}")
            Timber.e(e, "$TAG: Bypass failed for ${request.url.host}")

            // Fallback — proceed tanpa cookie daripada crash
            val headers = getHeaders(request.headers.toMap())
            baseClient.newCall(
                request.newBuilder().headers(headers).build()
            ).execute()
        }
    }

    /**
     * Fetch cookie DDG dari endpoint bypass.
     * URL = scheme + host + bypassPath
     * Contoh: https://site.com/__ddg_check__
     */
    private suspend fun fetchDdgCookies(request: Request): Map<String, String> {
        val bypassUrl = buildString {
            append(request.url.scheme)
            append("://")
            append(request.url.host)
            append(ddosBypassPath ?: "")
        }

        Timber.d("$TAG: Fetching DDG cookies from $bypassUrl")

        val cookies = Requests().get(bypassUrl).cookies
        savedCookiesMap[request.url.host] = cookies

        val ddgKeys = cookies.keys.filter { key ->
            DDG_COOKIE_KEYS.any { it in key }
        }
        Timber.d("$TAG: Got DDG cookies → $ddgKeys")

        return cookies
    }

    /**
     * Proceed request dengan cookie DDG yang sudah didapat
     */
    private fun proceedWithCookies(
        request: Request,
        cookies: Map<String, String>
    ): Response {
        val headers = getHeaders(
            headers = request.headers.toMap(),
            cookie = cookies + request.cookies
        )
        return baseClient.newCall(
            request.newBuilder().headers(headers).build()
        ).execute()
    }

    /**
     * Clear cookie untuk host tertentu.
     * Dipanggil kalau cookie expired dan perlu refresh.
     */
    fun clearCookies(host: String) {
        savedCookiesMap.remove(host)
        Timber.d("$TAG: Cleared cookies for $host")
    }

    /**
     * Clear semua cookie DDG yang tersimpan.
     */
    fun clearAllCookies() {
        savedCookiesMap.clear()
        ddosBypassPath = null
        Timber.d("$TAG: Cleared all DDG cookies")
    }
}
