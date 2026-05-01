package com.nakama.player.ui

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.viewpager2.widget.ViewPager2
import com.nakama.player.MainActivity
import com.nakama.player.R
import com.nakama.player.databinding.ActivityOnboardingBinding
import com.nakama.player.logger.NakamaLogger
import com.nakama.player.ui.onboarding.OnboardingAdapter
import com.nakama.player.ui.onboarding.Step1ThemeFragment
import com.nakama.player.ui.onboarding.Step2StorageFragment
import com.nakama.player.ui.onboarding.Step3PermissionFragment
import com.nakama.player.ui.onboarding.Step4FinishFragment
import timber.log.Timber

/**
 * Onboarding — muncul hanya sekali saat pertama install.
 * 4 step via ViewPager2:
 * Step 1 → Pilih tema & warna aksen
 * Step 2 → Pilih lokasi download
 * Step 3 → Request permissions
 * Step 4 → Mulai / Pulihkan backup
 */
class OnboardingActivity : AppCompatActivity() {

    companion object {
        const val TAG = "OnboardingActivity"
        private const val PREF_NAME           = "nakama_settings"
        private const val KEY_ONBOARDING_DONE = "onboarding_done"
    }

    private lateinit var binding: ActivityOnboardingBinding
    private lateinit var adapter: OnboardingAdapter
    private val tracker = NakamaLogger.feature(TAG)

    // Total step
    private val totalSteps = 4

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tracker.start()

        WindowCompat.setDecorFitsSystemWindows(window, false)

        binding = ActivityOnboardingBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupViewPager()
        setupButton()

        tracker.success("OnboardingActivity ready")
    }

    // ─────────────────────────────────────────
    // VIEWPAGER
    // ─────────────────────────────────────────

    private fun setupViewPager() {
        val fragments = listOf(
            Step1ThemeFragment(),
            Step2StorageFragment(),
            Step3PermissionFragment(),
            Step4FinishFragment { finishOnboarding() }
        )

        adapter = OnboardingAdapter(this, fragments)
        binding.viewPager.adapter = adapter

        // Disable swipe manual — hanya via tombol
        binding.viewPager.isUserInputEnabled = false

        // Update teks tombol saat halaman berubah
        binding.viewPager.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                updateButton(position)
                Timber.d("$TAG: Step ${position + 1}/$totalSteps")
                tracker.debug("Onboarding step ${position + 1}")
            }
        })
    }

    // ─────────────────────────────────────────
    // BUTTON
    // ─────────────────────────────────────────

    private fun setupButton() {
        binding.btnNext.setOnClickListener {
            val current = binding.viewPager.currentItem

            if (current < totalSteps - 1) {
                // Lanjut ke step berikutnya
                binding.viewPager.currentItem = current + 1
            }
            // Step terakhir — tombol dihandle Step4FinishFragment
        }

        // Initial state
        updateButton(0)
    }

    /**
     * Update teks & state tombol sesuai step aktif.
     */
    private fun updateButton(position: Int) {
        when (position) {
            totalSteps - 1 -> {
                // Step terakhir — sembunyikan tombol
                // Step4Fragment punya tombol sendiri
                binding.btnNext.text = getString(R.string.ok)
                binding.btnNext.isEnabled = false
                binding.btnNext.alpha = 0f
            }
            else -> {
                binding.btnNext.text = getString(R.string.ok).let { "Selanjutnya" }
                binding.btnNext.isEnabled = true
                binding.btnNext.alpha = 1f
            }
        }
    }

    // ─────────────────────────────────────────
    // FINISH ONBOARDING
    // ─────────────────────────────────────────

    /**
     * Tandai onboarding selesai → navigate ke MainActivity.
     * Dipanggil dari Step4FinishFragment.
     */
    fun finishOnboarding() {
        // Simpan flag onboarding done
        getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_ONBOARDING_DONE, true)
            .apply()

        Timber.d("$TAG: Onboarding complete")
        tracker.success("Onboarding complete")

        startActivity(Intent(this, MainActivity::class.java))
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        finish()
    }

    // Back button — tidak bisa back saat onboarding
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        val current = binding.viewPager.currentItem
        if (current > 0) {
            // Kalau bukan step pertama → balik ke step sebelumnya
            binding.viewPager.currentItem = current - 1
        }
        // Step pertama → tidak ada aksi (tidak bisa keluar)
    }
}
