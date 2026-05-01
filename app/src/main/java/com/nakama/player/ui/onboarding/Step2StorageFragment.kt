package com.nakama.player.ui.onboarding

import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import com.nakama.player.databinding.FragmentOnboardingStep2Binding
import timber.log.Timber

/**
 * Step 2 — Pilih lokasi download.
 */
class Step2StorageFragment : Fragment() {

    private var _binding: FragmentOnboardingStep2Binding? = null
    private val binding get() = _binding!!

    private val prefs by lazy {
        requireContext().getSharedPreferences("nakama_settings", Context.MODE_PRIVATE)
    }

    // Launcher untuk SAF directory picker
    private val dirPickerLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocumentTree()
    ) { uri: Uri? ->
        if (uri != null) {
            handleDirectorySelected(uri)
        } else {
            Timber.d("Step2: Directory picker cancelled")
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentOnboardingStep2Binding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Tampil direktori yang sudah dipilih (kalau ada)
        val savedUri = prefs.getString("download_uri", null)
        if (savedUri != null) {
            binding.tvSelectedDir.text = "Direktori: ${uriToReadablePath(savedUri)}"
        }

        binding.btnPickDir.setOnClickListener {
            dirPickerLauncher.launch(null)
        }
    }

    private fun handleDirectorySelected(uri: Uri) {
        // Persist permission agar bisa akses folder ini di sesi berikutnya
        requireContext().contentResolver.takePersistableUriPermission(
            uri,
            android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION or
            android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        )

        // Simpan URI
        prefs.edit().putString("download_uri", uri.toString()).apply()

        // Update UI
        binding.tvSelectedDir.text = "Direktori: ${uriToReadablePath(uri.toString())}"

        Timber.d("Step2: Download dir set to $uri")
    }

    private fun uriToReadablePath(uriStr: String): String {
        return try {
            val uri = Uri.parse(uriStr)
            // Ambil path terakhir dari URI
            uri.lastPathSegment
                ?.replace("primary:", "/storage/emulated/0/")
                ?: uriStr
        } catch (e: Exception) {
            uriStr
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
