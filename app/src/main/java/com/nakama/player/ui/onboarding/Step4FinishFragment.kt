package com.nakama.player.ui.onboarding

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import com.nakama.player.databinding.FragmentOnboardingStep4Binding
import timber.log.Timber

/**
 * Step 4 — Finish onboarding.
 * Pilihan:
 * - Mulai dari awal → langsung ke MainActivity
 * - Pulihkan cadangan → import file backup .zip
 */
class Step4FinishFragment(
    private val onFinish: () -> Unit
) : Fragment() {

    private var _binding: FragmentOnboardingStep4Binding? = null
    private val binding get() = _binding!!

    // Launcher untuk pick file backup .zip
    private val backupPickerLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            handleBackupRestore(uri)
        } else {
            Timber.d("Step4: Backup picker cancelled")
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentOnboardingStep4Binding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Mulai dari awal
        binding.btnStartFresh.setOnClickListener {
            Timber.d("Step4: Start fresh")
            onFinish()
        }

        // Pulihkan backup
        binding.btnRestore.setOnClickListener {
            Timber.d("Step4: Opening backup picker")
            backupPickerLauncher.launch("application/zip")
        }
    }

    private fun handleBackupRestore(uri: android.net.Uri) {
        Timber.d("Step4: Restoring backup from $uri")

        // TODO: implement restore via StorageBridge
        // Untuk sekarang langsung finish — restore akan dihandle
        // setelah app launch via backup.js
        requireContext()
            .getSharedPreferences("nakama_settings", android.content.Context.MODE_PRIVATE)
            .edit()
            .putString("pending_restore_uri", uri.toString())
            .apply()

        Timber.d("Step4: Pending restore set → $uri")
        onFinish()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
