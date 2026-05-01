package com.nakama.player.ui

import android.app.Activity
import android.content.pm.ActivityInfo
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.JsPromptResult
import android.webkit.JsResult
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.widget.FrameLayout
import com.nakama.player.logger.NakamaLogger
import timber.log.Timber

/**
 * Custom WebChromeClient Nakama.
 * Tugas utama:
 * 1. Handle fullscreen video (embed player expand)
 * 2. Forward console.log JS → Timber
 * 3. Handle permission request (kamera, mikrofon — untuk embed player)
 * 4. Handle JS dialog (alert, confirm, prompt)
 * 5. Handle orientasi layar saat player fullscreen
 */
class CustomWebChromeClient(
    private val activity: Activity,
    private val onFullscreenChanged: ((isFullscreen: Boolean) -> Unit)? = null
) : WebChromeClient() {

    companion object {
        const val TAG = "WebChromeClient"
    }

    private val tracker = NakamaLogger.feature(TAG)

    // View fullscreen yang ditampilkan saat video expand
    private var fullscreenView: View? = null
    private var fullscreenCallback: CustomViewCallback? = null

    // Container untuk fullscreen view
    private val rootView: FrameLayout
        get() = activity.window.decorView as FrameLayout

    // ─────────────────────────────────────────
    // FULLSCREEN VIDEO
    // ─────────────────────────────────────────

    /**
     * Dipanggil saat embed player minta fullscreen
     * (user tap tombol expand di player filedon/streamtape/dll)
     */
    override fun onShowCustomView(view: View, callback: CustomViewCallback) {
        // Kalau sudah ada fullscreen view — hide dulu yang lama
        if (fullscreenView != null) {
            onHideCustomView()
        }

        Timber.d("$TAG: Entering fullscreen")
        tracker.debug("Player entering fullscreen")

        fullscreenView = view
        fullscreenCallback = callback

        // Tambah view fullscreen ke root
        rootView.addView(
            view,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        // Sembunyikan system UI — immersive fullscreen
        hideSystemUI()

        // Rotate ke landscape
        activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE

        // Keep screen on saat player aktif
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        onFullscreenChanged?.invoke(true)
        tracker.success("Fullscreen active")
    }

    /**
     * Dipanggil saat user keluar dari fullscreen
     * (tap tombol minimize atau back)
     */
    override fun onHideCustomView() {
        Timber.d("$TAG: Exiting fullscreen")
        tracker.debug("Player exiting fullscreen")

        // Hapus fullscreen view dari root
        fullscreenView?.let { rootView.removeView(it) }
        fullscreenView = null

        // Notify callback bahwa fullscreen selesai
        fullscreenCallback?.onCustomViewHidden()
        fullscreenCallback = null

        // Restore system UI
        showSystemUI()

        // Kembali ke portrait
        activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT

        // Matikan keep screen on
        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        onFullscreenChanged?.invoke(false)
        tracker.success("Fullscreen exited")
    }

    /**
     * Cek apakah sedang fullscreen — dipakai MainActivity untuk handle back button
     */
    fun isFullscreen(): Boolean = fullscreenView != null

    // ─────────────────────────────────────────
    // SYSTEM UI — hide/show status & nav bar
    // ─────────────────────────────────────────

    private fun hideSystemUI() {
        activity.window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        )
    }

    private fun showSystemUI() {
        activity.window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        )
    }

    // ─────────────────────────────────────────
    // CONSOLE LOG — forward JS log ke Timber
    // ─────────────────────────────────────────

    /**
     * Forward semua console.log/warn/error dari JS ke Timber.
     * Sangat berguna untuk debug extension dan core.js.
     */
    override fun onConsoleMessage(message: ConsoleMessage): Boolean {
        val log = "[JS:${message.sourceId().substringAfterLast("/")}:" +
                  "${message.lineNumber()}] ${message.message()}"

        when (message.messageLevel()) {
            ConsoleMessage.MessageLevel.ERROR   -> Timber.e("$TAG: $log")
            ConsoleMessage.MessageLevel.WARNING -> Timber.w("$TAG: $log")
            ConsoleMessage.MessageLevel.DEBUG   -> Timber.d("$TAG: $log")
            ConsoleMessage.MessageLevel.TIP     -> Timber.i("$TAG: $log")
            else                                -> Timber.d("$TAG: $log")
        }

        return true
    }

    // ─────────────────────────────────────────
    // JS DIALOG — handle alert/confirm/prompt
    // ─────────────────────────────────────────

    /**
     * Handle window.alert() dari JS
     * Default WebView block ini — kita forward ke Timber saja
     */
    override fun onJsAlert(
        view: WebView,
        url: String,
        message: String,
        result: JsResult
    ): Boolean {
        Timber.d("$TAG: JS Alert → $message")
        result.confirm()
        return true
    }

    /**
     * Handle window.confirm() dari JS
     */
    override fun onJsConfirm(
        view: WebView,
        url: String,
        message: String,
        result: JsResult
    ): Boolean {
        Timber.d("$TAG: JS Confirm → $message")
        result.confirm()
        return true
    }

    /**
     * Handle window.prompt() dari JS
     */
    override fun onJsPrompt(
        view: WebView,
        url: String,
        message: String,
        defaultValue: String,
        result: JsPromptResult
    ): Boolean {
        Timber.d("$TAG: JS Prompt → $message (default: $defaultValue)")
        result.confirm(defaultValue)
        return true
    }

    // ─────────────────────────────────────────
    // PERMISSION — untuk embed player
    // ─────────────────────────────────────────

    /**
     * Handle permission request dari embed player
     * Contoh: beberapa player minta akses autoplay media
     */
    override fun onPermissionRequest(request: PermissionRequest) {
        val resources = request.resources
        Timber.d("$TAG: Permission request → ${resources.joinToString()}")

        // Grant hanya permission media — tolak yang lain
        val allowed = resources.filter { permission ->
            permission == PermissionRequest.RESOURCE_VIDEO_CAPTURE
            || permission == PermissionRequest.RESOURCE_AUDIO_CAPTURE
            || permission == PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID
        }

        if (allowed.isNotEmpty()) {
            Timber.d("$TAG: Granted permissions → ${allowed.joinToString()}")
            request.grant(allowed.toTypedArray())
        } else {
            Timber.d("$TAG: Denied all permissions")
            request.deny()
        }
    }

    // ─────────────────────────────────────────
    // PROGRESS
    // ─────────────────────────────────────────

    /**
     * Progress loading halaman WebView (0-100).
     * Bisa dipakai untuk update loading bar di JS via evaluateJavascript.
     */
    override fun onProgressChanged(view: WebView, newProgress: Int) {
        super.onProgressChanged(view, newProgress)
        if (newProgress == 100) {
            Timber.d("$TAG: Page load complete")
        }
    }
}
