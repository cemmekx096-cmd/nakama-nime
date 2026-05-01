package com.nakama.player.ui.onboarding

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.google.android.material.button.MaterialButtonToggleGroup
import com.nakama.player.R
import com.nakama.player.databinding.FragmentOnboardingStep1Binding
import timber.log.Timber

/**
 * Step 1 — Pilih tema (Sistem/Terang/Gelap) dan warna aksen.
 */
class Step1ThemeFragment : Fragment() {

    private var _binding: FragmentOnboardingStep1Binding? = null
    private val binding get() = _binding!!

    private val prefs by lazy {
        requireContext().getSharedPreferences("nakama_settings", Context.MODE_PRIVATE)
    }

    // Daftar pilihan warna aksen
    private val accentColors = listOf(
        AccentOption("Bawaan",    "#6750A4"),
        AccentOption("Dinamis",   "#888888"), // ikut wallpaper Android 12+
        AccentOption("Hijau Apel","#22C55E"),
        AccentOption("Ocean",     "#0EA5E9"),
        AccentOption("Cloudflare","#F97316"),
        AccentOption("Permen",    "#EC4899")
    )

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentOnboardingStep1Binding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupThemeToggle()
        setupAccentColors()
    }

    // ─────────────────────────────────────────
    // TEMA
    // ─────────────────────────────────────────

    private fun setupThemeToggle() {
        // Set pilihan awal sesuai setting tersimpan
        val savedTheme = prefs.getInt("theme_mode", AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
        when (savedTheme) {
            AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM -> binding.toggleTheme.check(R.id.btnSystem)
            AppCompatDelegate.MODE_NIGHT_NO            -> binding.toggleTheme.check(R.id.btnLight)
            AppCompatDelegate.MODE_NIGHT_YES           -> binding.toggleTheme.check(R.id.btnDark)
        }

        binding.toggleTheme.addOnButtonCheckedListener { _, checkedId, isChecked ->
            if (!isChecked) return@addOnButtonCheckedListener

            val mode = when (checkedId) {
                R.id.btnSystem -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
                R.id.btnLight  -> AppCompatDelegate.MODE_NIGHT_NO
                R.id.btnDark   -> AppCompatDelegate.MODE_NIGHT_YES
                else           -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
            }

            // Apply tema langsung
            AppCompatDelegate.setDefaultNightMode(mode)

            // Simpan ke prefs
            prefs.edit().putInt("theme_mode", mode).apply()

            Timber.d("Step1: Theme set to mode=$mode")
        }
    }

    // ─────────────────────────────────────────
    // WARNA AKSEN
    // ─────────────────────────────────────────

    private fun setupAccentColors() {
        val savedAccent = prefs.getString("accent_color", "#6750A4")

        accentColors.forEach { option ->
            val itemView = layoutInflater.inflate(
                R.layout.item_accent_color,
                binding.llAccentColors,
                false
            )

            // Circle warna
            val colorCircle = itemView.findViewById<View>(R.id.viewColor)
            val label       = itemView.findViewById<TextView>(R.id.tvLabel)

            label.text = option.name

            // Set background warna
            val drawable = ContextCompat.getDrawable(
                requireContext(),
                R.drawable.bg_accent_circle
            )?.mutate()
            drawable?.setTint(android.graphics.Color.parseColor(option.hex))
            colorCircle.background = drawable

            // Tandai yang terpilih
            if (option.hex == savedAccent) {
                colorCircle.scaleX = 1.2f
                colorCircle.scaleY = 1.2f
            }

            colorCircle.setOnClickListener {
                // Reset scale semua
                resetAllAccentScale()

                // Scale up yang dipilih
                colorCircle.animate().scaleX(1.2f).scaleY(1.2f).setDuration(150).start()

                // Simpan pilihan
                prefs.edit().putString("accent_color", option.hex).apply()

                Timber.d("Step1: Accent color set to ${option.name} (${option.hex})")
            }

            binding.llAccentColors.addView(itemView)
        }
    }

    private fun resetAllAccentScale() {
        for (i in 0 until binding.llAccentColors.childCount) {
            val child = binding.llAccentColors.getChildAt(i)
            child.findViewById<View>(R.id.viewColor)
                ?.animate()?.scaleX(1f)?.scaleY(1f)?.setDuration(150)?.start()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    data class AccentOption(val name: String, val hex: String)
}
