package com.nakama.player

import android.app.Application
import android.content.Context
import coil.Coil
import coil.ImageLoader
import coil.disk.DiskCache
import coil.memory.MemoryCache
import com.nakama.player.logger.NakamaLogger
import com.nakama.player.network.initNakamaClient
import timber.log.Timber
import java.io.File

/**
 * Entry point aplikasi Nakama.
 * Init semua komponen saat app pertama kali launch:
 * 1. Timber (logger)
 * 2. NakamaLogger (file logger)
 * 3. OkHttpClient / NiceHttp (network)
 * 4. Coil (image loader)
 * 5. Room DB (lazy — init saat pertama dipakai)
 */
class App : Application() {

    companion object {
        // Global app context — untuk akses context di luar Activity
        lateinit var appContext: Context
            private set
    }

    override fun onCreate() {
        super.onCreate()
        appContext = applicationContext

        // Urutan init penting:
        // Logger dulu → baru yang lain agar semua log tertangkap
        initLogger()
        initNetwork()
        initImageLoader()

        Timber.i("Nakama started — v${BuildConfig.VERSION_NAME}")
    }

    // ─────────────────────────────────────────
    // 1. LOGGER
    // ─────────────────────────────────────────

    private fun initLogger() {
        NakamaLogger.init(
            context = this,
            isDebug = BuildConfig.DEBUG_MODE
        )
        Timber.d("Logger initialized — debug=${BuildConfig.DEBUG_MODE}")
    }

    // ─────────────────────────────────────────
    // 2. NETWORK
    // ─────────────────────────────────────────

    private fun initNetwork() {
        try {
            initNakamaClient(this)
            Timber.d("Network initialized")
        } catch (e: Exception) {
            Timber.e(e, "Failed to initialize network client")
        }
    }

    // ─────────────────────────────────────────
    // 3. IMAGE LOADER (Coil)
    // ─────────────────────────────────────────

    private fun initImageLoader() {
        val imageLoader = ImageLoader.Builder(this)
            // Memory cache — RAM, hilang saat app tutup
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.20) // 20% dari RAM app
                    .build()
            }
            // Disk cache — persistent di tmp/thumbnails
            .diskCache {
                DiskCache.Builder()
                    .directory(File(cacheDir, "tmp/thumbnails"))
                    .maxSizeBytes(150L * 1024L * 1024L) // 150MB
                    .build()
            }
            // Pakai OkHttpClient kita (sudah ada CF/DDG support)
            .okHttpClient {
                com.nakama.player.network.baseClient
            }
            .crossfade(true)          // animasi fade saat gambar load
            .crossfade(300)           // 300ms fade duration
            .respectCacheHeaders(false) // ignore cache-control server
                                        // agar thumbnail persist lebih lama
            .build()

        Coil.setImageLoader(imageLoader)
        Timber.d("Coil initialized — diskCache: tmp/thumbnails, maxSize: 150MB")
    }
}
