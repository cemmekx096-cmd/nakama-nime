package com.nakama.player.network

import android.content.Context
import android.webkit.CookieManager
import com.nakama.player.logger.NakamaLogger
import timber.log.Timber

/**
 * Manager cookie terpusat untuk Nakama.
 * Handle cookie dari 3 sumber:
 * 1. WebView (CookieManager Android)
 * 2. CloudflareKiller (savedCookies)
 * 3. DdosGuardKiller (savedCookiesMap)
 */
class NakamaCookieManager(private val context: Context) {

    companion object {
        const val TAG = "CookieManager"
        private const val PREFS_NAME = "nakama_cookies"
    }

    private val tracker = NakamaLogger.feature(TAG)
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // In-memory store — Map<host, Map<key, value>>
    private val cookieStore: MutableMap<String, MutableMap<String, String>> = mutableMapOf()

    init {
        // Load cookie yang disimpan dari sesi sebelumnya
        loadPersistedCookies()
    }

    // ─────────────────────────────────────────
    // GET
    // ─────────────────────────────────────────

    /**
     * Ambil semua cookie untuk host tertentu.
     * Cek urutan: memory store → WebView CookieManager
     */
    fun getCookies(host: String): Map<String, String> {
        // Cek memory dulu
        cookieStore[host]?.let {
            Timber.d("$TAG: Cookie from memory for $host → ${it.keys}")
            return it
        }

        // Fallback ke WebView CookieManager
        val webViewCookie = getWebViewCookie("https://$host")
        if (!webViewCookie.isNullOrBlank()) {
            val parsed = parseCookieMap(webViewCookie)
            cookieStore[host] = parsed.toMutableMap()
            Timber.d("$TAG: Cookie from WebView for $host → ${parsed.keys}")
            return parsed
        }

        Timber.d("$TAG: No cookie found for $host")
        return emptyMap()
    }

    /**
     * Ambil cookie sebagai string header.
     * Format: "key1=value1; key2=value2"
     */
    fun getCookieHeader(host: String): String {
        return getCookies(host).entries.joinToString("; ") { "${it.key}=${it.value}" }
    }

    /**
     * Cek apakah host punya cookie CF clearance
     */
    fun hasCfClearance(host: String): Boolean {
        return getCookies(host).containsKey("cf_clearance")
    }

    /**
     * Cek apakah host punya cookie DDG
     */
    fun hasDdgCookies(host: String): Boolean {
        return getCookies(host).keys.any { "__ddg" in it }
    }

    // ─────────────────────────────────────────
    // SET
    // ─────────────────────────────────────────

    /**
     * Simpan cookie untuk host.
     * Merge dengan cookie yang sudah ada (tidak replace semua).
     */
    fun setCookies(host: String, cookies: Map<String, String>) {
        if (cookies.isEmpty()) return

        val existing = cookieStore.getOrPut(host) { mutableMapOf() }
        existing.putAll(cookies)

        Timber.d("$TAG: Saved cookies for $host → ${cookies.keys}")
        persistCookies(host, existing)
        tracker.debug("Cookies saved for $host")
    }

    /**
     * Simpan satu cookie untuk host.
     */
    fun setCookie(host: String, key: String, value: String) {
        setCookies(host, mapOf(key to value))
    }

    /**
     * Sync cookie dari WebView CookieManager ke store kita.
     * Dipanggil setelah CloudflareKiller selesai.
     */
    fun syncFromWebView(url: String) {
        val host = extractHost(url)
        val webViewCookie = getWebViewCookie(url) ?: return

        val parsed = parseCookieMap(webViewCookie)
        if (parsed.isNotEmpty()) {
            setCookies(host, parsed)
            Timber.d("$TAG: Synced ${parsed.size} cookies from WebView for $host")
        }
    }

    /**
     * Sync cookie dari CloudflareKiller ke store kita.
     */
    fun syncFromCfKiller(cfKiller: CloudflareKiller) {
        cfKiller.savedCookies.forEach { (host, cookies) ->
            setCookies(host, cookies)
        }
        Timber.d("$TAG: Synced CF cookies for ${cfKiller.savedCookies.size} hosts")
    }

    /**
     * Sync cookie dari DdosGuardKiller ke store kita.
     */
    fun syncFromDdgKiller(ddgKiller: DdosGuardKiller) {
        ddgKiller.savedCookiesMap.forEach { (host, cookies) ->
            setCookies(host, cookies)
        }
        Timber.d("$TAG: Synced DDG cookies for ${ddgKiller.savedCookiesMap.size} hosts")
    }

    // ─────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────

    /**
     * Hapus semua cookie untuk host tertentu.
     */
    fun clearCookies(host: String) {
        cookieStore.remove(host)
        prefs.edit().remove(host).apply()
        Timber.d("$TAG: Cleared cookies for $host")
    }

    /**
     * Hapus semua cookie dari semua host.
     */
    fun clearAllCookies() {
        cookieStore.clear()
        prefs.edit().clear().apply()

        // Clear WebView cookies juga
        try {
            CookieManager.getInstance().removeAllCookies(null)
        } catch (e: Exception) {
            Timber.w("$TAG: Failed to clear WebView cookies — ${e.message}")
        }

        tracker.debug("All cookies cleared")
        Timber.d("$TAG: All cookies cleared")
    }

    // ─────────────────────────────────────────
    // PERSIST — simpan/load dari SharedPreferences
    // ─────────────────────────────────────────

    /**
     * Simpan cookie host ke SharedPreferences.
     * Format: key = host, value = "k1=v1;k2=v2"
     */
    private fun persistCookies(host: String, cookies: Map<String, String>) {
        val serialized = cookies.entries.joinToString(";") { "${it.key}=${it.value}" }
        prefs.edit().putString(host, serialized).apply()
    }

    /**
     * Load semua cookie yang pernah disimpan ke memory store.
     * Dipanggil saat init.
     */
    private fun loadPersistedCookies() {
        try {
            prefs.all.forEach { (host, value) ->
                if (value is String && value.isNotBlank()) {
                    cookieStore[host] = parseCookieMap(value).toMutableMap()
                }
            }
            Timber.d("$TAG: Loaded cookies for ${cookieStore.size} hosts from prefs")
        } catch (e: Exception) {
            Timber.w("$TAG: Failed to load persisted cookies — ${e.message}")
        }
    }

    // ─────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────

    private fun getWebViewCookie(url: String): String? {
        return try {
            CookieManager.getInstance()?.getCookie(url)
        } catch (e: Exception) {
            Timber.w("$TAG: Error getting WebView cookie — ${e.message}")
            null
        }
    }

    private fun extractHost(url: String): String {
        return try {
            java.net.URI(url).host ?: url
        } catch (e: Exception) {
            url
        }
    }
}
