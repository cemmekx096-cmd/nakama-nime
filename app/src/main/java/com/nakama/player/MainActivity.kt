package com.nakama.player

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import com.nakama.player.bridge.ExtensionBridge
import com.nakama.player.bridge.ImageBridge
import com.nakama.player.bridge.NetworkBridge
import com.nakama.player.bridge.PlayerBridge
import com.nakama.player.bridge.StorageBridge
import com.nakama.player.logger.NakamaLogger
import com.nakama.player.network.NakamaCookieManager
import com.nakama.player.ui.CustomWebChromeClient
import com.nakama.player.ui.CustomWebViewClient
import timber.log.Timber

class MainActivity : AppCompatActivity() {

    companion object {
        const val TAG = "MainActivity"
    }

    private val tracker = NakamaLogger.feature(TAG)
    private lateinit var webView: WebView
    private lateinit var cookieManager: NakamaCookieManager
    private lateinit var networkBridge: NetworkBridge
    private lateinit var chromeClient: CustomWebChromeClient

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tracker.start()

        // Edge to edge — WebView isi penuh layar
        WindowCompat.setDecorFitsSystemWindows(window, false)

        setContentView(R.layout.activity_main)
        webView = findViewById(R.id.webView)

        cookieManager = NakamaCookieManager(this)

        setupWebView()
        registerBridges()

        // Load UI utama dari assets
        webView.loadUrl("file:///android_asset/index.html")

        tracker.success("MainActivity ready")
        Timber.d("$TAG: WebView loaded")
    }

    // ─────────────────────────────────────────
    // SETUP WEBVIEW
    // ─────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false  // autoplay video
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            databaseEnabled = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            loadWithOverviewMode = true
            useWideViewPort = true
        }

        // WebViewClient — intercept request, bypass CORS
        webView.webViewClient = CustomWebViewClient(
            context = this,
            cookieManager = cookieManager,
            onPageStarted = { url ->
                Timber.d("$TAG: Page started → $url")
                // Notify JS bahwa halaman mulai load
                webView.evaluateJavascript(
                    "if(window.onNativePageStarted) onNativePageStarted('$url')",
                    null
                )
            },
            onPageFinished = { url ->
                Timber.d("$TAG: Page finished → $url")
                webView.evaluateJavascript(
                    "if(window.onNativePageFinished) onNativePageFinished('$url')",
                    null
                )
            },
            onError = { error ->
                Timber.e("$TAG: Page error → $error")
                val escaped = error.replace("'", "\\'")
                webView.evaluateJavascript(
                    "if(window.onNativePageError) onNativePageError('$escaped')",
                    null
                )
            }
        )

        // ChromeClient — fullscreen, console log, permissions
        chromeClient = CustomWebChromeClient(
            activity = this,
            onFullscreenChanged = { isFullscreen ->
                Timber.d("$TAG: Fullscreen changed → $isFullscreen")
                webView.evaluateJavascript(
                    "if(window.onFullscreenChanged) onFullscreenChanged($isFullscreen)",
                    null
                )
            }
        )
        webView.webChromeClient = chromeClient

        // Enable WebView debugging di debug build
        if (BuildConfig.DEBUG_MODE) {
            WebView.setWebContentsDebuggingEnabled(true)
            Timber.d("$TAG: WebView debugging enabled")
        }
    }

    // ─────────────────────────────────────────
    // REGISTER BRIDGES
    // ─────────────────────────────────────────

    private fun registerBridges() {
        // Network — fetch, cookie, DNS, UA
        networkBridge = NetworkBridge(this, webView)
        webView.addJavascriptInterface(networkBridge, "NativeNetwork")

        // Storage — Room DB, SharedPreferences, backup
        webView.addJavascriptInterface(
            StorageBridge(this, webView),
            "NativeStorage"
        )

        // Extension — install, update, uninstall, load .js
        webView.addJavascriptInterface(
            ExtensionBridge(this, webView),
            "NativeExtension"
        )

        // Image — Coil thumbnail cache
        webView.addJavascriptInterface(
            ImageBridge(this, webView),
            "NativeImage"
        )

        // Player — ExoPlayer offline playback
        webView.addJavascriptInterface(
            PlayerBridge(this, webView),
            "NativePlayer"
        )

        // Logger — JS bisa log ke Timber + file
        webView.addJavascriptInterface(
            LoggerBridge(),
            "NativeLogger"
        )

        Timber.d("$TAG: All bridges registered")
    }

    // ─────────────────────────────────────────
    // BACK BUTTON
    // ─────────────────────────────────────────

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        when {
            // 1. Kalau sedang fullscreen → keluar fullscreen dulu
            chromeClient.isFullscreen() -> {
                chromeClient.onHideCustomView()
            }

            // 2. Tanya JS dulu — mungkin ada modal/overlay yang perlu ditutup
            else -> {
                webView.evaluateJavascript("handleBackButton()") { result ->
                    // JS return "true" → JS yang handle (tutup modal, dll)
                    // JS return "false" → tidak ada yang di-handle, keluar app
                    if (result == "\"false\"" || result == "false") {
                        super.onBackPressed()
                    }
                }
            }
        }
    }

    // ─────────────────────────────────────────
    // LIFECYCLE
    // ─────────────────────────────────────────

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.evaluateJavascript(
            "if(window.onAppResume) onAppResume()",
            null
        )
        Timber.d("$TAG: onResume")
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
        webView.evaluateJavascript(
            "if(window.onAppPause) onAppPause()",
            null
        )
        Timber.d("$TAG: onPause")
    }

    override fun onDestroy() {
        super.onDestroy()
        webView.apply {
            stopLoading()
            clearHistory()
            destroy()
        }
        Timber.d("$TAG: onDestroy — WebView destroyed")
        tracker.success("MainActivity destroyed cleanly")
    }

    // ─────────────────────────────────────────
    // LOGGER BRIDGE — inner class simpel
    // ─────────────────────────────────────────

    /**
     * Bridge untuk JS logging ke Timber + file log.
     * Dipanggil dari JS:
     * NativeLogger.log("DEBUG", "core.js", "Extension loaded")
     * NativeLogger.log("ERROR", "parser", "Failed to parse")
     */
    inner class LoggerBridge {

        @android.webkit.JavascriptInterface
        fun log(level: String, tag: String, message: String) {
            val fullTag = "JS:$tag"
            when (level.uppercase()) {
                "INFO"    -> Timber.tag(fullTag).i(message)
                "ERROR"   -> Timber.tag(fullTag).e(message)
                "DEBUG"   -> Timber.tag(fullTag).d(message)
                "WARN"    -> Timber.tag(fullTag).w(message)
                else      -> Timber.tag(fullTag).d(message)
            }
        }

        @android.webkit.JavascriptInterface
        fun error(tag: String, message: String) = log("ERROR", tag, message)

        @android.webkit.JavascriptInterface
        fun debug(tag: String, message: String) = log("DEBUG", tag, message)

        @android.webkit.JavascriptInterface
        fun warn(tag: String, message: String) = log("WARN", tag, message)

        @android.webkit.JavascriptInterface
        fun info(tag: String, message: String) = log("INFO", tag, message)
    }
}
