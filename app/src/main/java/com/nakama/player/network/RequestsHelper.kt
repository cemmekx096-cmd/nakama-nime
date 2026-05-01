package com.nakama.player.network

import android.content.Context
import com.lagradost.nicehttp.Requests
import com.lagradost.nicehttp.ignoreAllSSLErrors
import com.nakama.player.logger.NakamaLogger
import okhttp3.Cache
import okhttp3.Headers
import okhttp3.Headers.Companion.toHeaders
import okhttp3.OkHttpClient
import timber.log.Timber
import java.io.File
import java.util.concurrent.TimeUnit

// Default UA — bisa di-override per extension via METADATA
const val NAKAMA_USER_AGENT =
    "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

const val NAKAMA_DESKTOP_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// Singleton OkHttpClient — dipakai oleh semua network request
lateinit var baseClient: OkHttpClient
lateinit var app: Requests

/**
 * Init semua network client.
 * Dipanggil sekali di App.kt saat app pertama kali launch.
 */
fun initNakamaClient(context: Context) {
    val tracker = NakamaLogger.feature("NetworkInit")
    tracker.start()

    try {
        baseClient = buildNakamaClient(context)
        app = Requests().apply {
            this.baseClient = buildNakamaClient(context)
        }
        tracker.success("OkHttpClient & NiceHttp ready")
    } catch (e: Exception) {
        tracker.error("Failed to init network client: ${e.message}")
        Timber.e(e, "NetworkInit failed")
    }
}

/**
 * Build OkHttpClient utama Nakama.
 * DNS provider diambil dari SharedPreferences (pilihan user di settings).
 */
fun buildNakamaClient(context: Context): OkHttpClient {
    val prefs = context.getSharedPreferences("nakama_settings", Context.MODE_PRIVATE)

    // Ambil pilihan DNS dari settings, default: SYSTEM (0)
    val dnsId = prefs.getInt("dns_provider", DnsProvider.SYSTEM.id)
    val dnsProvider = DnsProvider.fromId(dnsId)

    // Ambil custom UA dari settings, default: NAKAMA_USER_AGENT
    val userAgent = prefs.getString("user_agent", NAKAMA_USER_AGENT)
        ?: NAKAMA_USER_AGENT

    Timber.d("Building OkHttpClient — DNS: ${dnsProvider.displayName}, UA: $userAgent")

    return OkHttpClient.Builder()
        .followRedirects(true)
        .followSslRedirects(true)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        // HTTP response cache — 50MB
        .cache(
            Cache(
                directory = File(context.cacheDir, "http_cache"),
                maxSize = 50L * 1024L * 1024L
            )
        )
        // Interceptor rate limiting — jeda antar request
        .addInterceptor(RateLimitInterceptor(context))
        // Apply DNS provider sesuai pilihan user
        .apply {
            when (dnsProvider) {
                DnsProvider.GOOGLE     -> addGoogleDns()
                DnsProvider.CLOUDFLARE -> addCloudFlareDns()
                DnsProvider.ADGUARD    -> addAdGuardDns()
                DnsProvider.DNS_WATCH  -> addDNSWatchDns()
                DnsProvider.QUAD9      -> addQuad9Dns()
                DnsProvider.SYSTEM     -> { /* pakai DNS sistem, tidak perlu setup */ }
            }
        }
        .build()
}

/**
 * Rate limit interceptor — jeda antar request sesuai setting user.
 * Default: 1500ms. Bisa di-override per extension via METADATA.rateLimit
 */
class RateLimitInterceptor(context: Context) : okhttp3.Interceptor {
    private val prefs = context.getSharedPreferences("nakama_settings", Context.MODE_PRIVATE)
    private var lastRequestTime = 0L

    override fun intercept(chain: okhttp3.Interceptor.Chain): okhttp3.Response {
        val delayMs = prefs.getLong("rate_limit_ms", 1500L)
        val now = System.currentTimeMillis()
        val elapsed = now - lastRequestTime

        if (elapsed < delayMs) {
            val sleep = delayMs - elapsed
            Timber.d("RateLimit: sleeping ${sleep}ms")
            Thread.sleep(sleep)
        }

        lastRequestTime = System.currentTimeMillis()
        return chain.proceed(chain.request())
    }
}

/**
 * Build headers dari map + cookie map.
 * Priority: headers param > cookie param > default UA
 * Ported dari Cloudstream, disederhanakan untuk Nakama.
 */
fun getHeaders(
    headers: Map<String, String>,
    cookie: Map<String, String> = emptyMap(),
    userAgent: String = NAKAMA_USER_AGENT
): Headers {
    val defaultHeaders = mapOf("user-agent" to userAgent)

    val cookieHeader = if (cookie.isNotEmpty()) {
        mapOf("Cookie" to cookie.entries.joinToString(" ") { "${it.key}=${it.value};" })
    } else emptyMap()

    return (defaultHeaders + headers + cookieHeader).toHeaders()
}

/**
 * Parse string cookie menjadi Map<key, value>
 * Contoh: "cf_clearance=abc; _ga=xyz" → {"cf_clearance": "abc", "_ga": "xyz"}
 */
fun parseCookieMap(cookie: String): Map<String, String> {
    return cookie.split(";").associate {
        val split = it.split("=")
        (split.getOrNull(0)?.trim() ?: "") to (split.getOrNull(1)?.trim() ?: "")
    }.filter { it.key.isNotBlank() && it.value.isNotBlank() }
}

/**
 * Rebuild client dengan settings terbaru.
 * Dipanggil saat user ubah DNS/UA di settings.
 */
fun rebuildNakamaClient(context: Context) {
    Timber.d("Rebuilding OkHttpClient with new settings")
    baseClient = buildNakamaClient(context)
    app.baseClient = baseClient
}
