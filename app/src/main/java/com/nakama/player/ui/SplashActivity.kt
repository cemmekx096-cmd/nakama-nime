package com.nakama.player.ui

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.lifecycle.lifecycleScope
import com.nakama.player.BuildConfig
import com.nakama.player.MainActivity
import com.nakama.player.R
import com.nakama.player.databinding.ActivitySplashBinding
import com.nakama.player.logger.NakamaLogger
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import timber.log.Timber

/**
 * Splash screen — tampil saat app pertama dibuka.
 * Tugas:
 * 1. Tampil logo + versi
 * 2. Cek apakah onboarding sudah selesai
 * 3. Route ke OnboardingActivity (pertama kali) atau MainActivity
 *
 * Minimum splash duration: 1.2 detik
 * Agar tidak terlalu cepat (berkedip) atau terlalu lama (membosankan)
 */
@SuppressLint("CustomSplashScreen")
class SplashActivity : AppCompatActivity() {

    companion object {
        const val TAG = "SplashActivity"
        private const val PREF_NAME           = "nakama_settings"
        private const val KEY_ONBOARDING_DONE = "onboarding_done"
        private const val MIN_SPLASH_MS       = 1200L
    }

    private lateinit var binding: ActivitySplashBinding
    private val tracker = NakamaLogger.feature(TAG)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tracker.start()

        // Edge to edge
        WindowCompat.setDecorFitsSystemWindows(window, false)

        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Tampil versi app
        binding.tvVersion.text = BuildConfig.VERSION_NAME

        lifecycleScope.launch {
            val startTime = System.currentTimeMillis()

            // Jalankan init check bersamaan dengan splash
            val onboardingDone = isOnboardingDone()

            // Pastikan splash minimal 1.2 detik
            val elapsed = System.currentTimeMillis() - startTime
            val remaining = MIN_SPLASH_MS - elapsed
            if (remaining > 0) delay(remaining)

            // Route ke halaman yang sesuai
            navigate(onboardingDone)
        }
    }

    // ─────────────────────────────────────────
    // CHECK
    // ─────────────────────────────────────────

    /**
     * Cek apakah user sudah selesai onboarding.
     * Simpan di SharedPreferences — persistent antar sesi.
     */
    private fun isOnboardingDone(): Boolean {
        val prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val done = prefs.getBoolean(KEY_ONBOARDING_DONE, false)
        Timber.d("$TAG: onboarding_done = $done")
        return done
    }

    // ─────────────────────────────────────────
    // NAVIGATE
    // ─────────────────────────────────────────

    private fun navigate(onboardingDone: Boolean) {
        val destination = if (onboardingDone) {
            Timber.d("$TAG: Routing to MainActivity")
            tracker.success("Routing to MainActivity")
            Intent(this, MainActivity::class.java)
        } else {
            Timber.d("$TAG: Routing to OnboardingActivity (first launch)")
            tracker.success("Routing to OnboardingActivity")
            Intent(this, OnboardingActivity::class.java)
        }

        startActivity(destination)

        // Animasi transisi — fade in
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)

        finish() // Hapus splash dari back stack
    }

    // ─────────────────────────────────────────
    // LIFECYCLE
    // ─────────────────────────────────────────

    override fun onDestroy() {
        super.onDestroy()
        Timber.d("$TAG: onDestroy")
    }
}
