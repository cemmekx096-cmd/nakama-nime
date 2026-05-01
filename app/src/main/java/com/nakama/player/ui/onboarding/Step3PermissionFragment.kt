package com.nakama.player.ui.onboarding

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.nakama.player.R
import com.nakama.player.databinding.FragmentOnboardingStep3Binding
import timber.log.Timber

class Step3PermissionFragment : Fragment() {

    private var _binding: FragmentOnboardingStep3Binding? = null
    private val binding get() = _binding!!

    private val notifPermLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        Timber.d("Step3: Notification permission → $granted")
        updatePermissionUI()
    }

    private val storagePermLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        Timber.d("Step3: Storage permissions → $results")
        updatePermissionUI()
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentOnboardingStep3Binding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupPermissionItems()
        updatePermissionUI()
    }

    private fun setupPermissionItems() {
        // Storage
        binding.permStorage.findViewById<TextView>(R.id.tvPermTitle).text = "Izin penyimpanan"
        binding.permStorage.findViewById<TextView>(R.id.tvPermDesc).text =
            "Untuk menyimpan unduhan video."
        binding.permStorage.findViewById<Button>(R.id.btnGrant).setOnClickListener {
            requestStoragePermission()
        }

        // Notifikasi
        binding.permNotification.findViewById<TextView>(R.id.tvPermTitle).text = "Izin notifikasi"
        binding.permNotification.findViewById<TextView>(R.id.tvPermDesc).text =
            "Untuk notifikasi pembaruan extension."
        binding.permNotification.findViewById<Button>(R.id.btnGrant).setOnClickListener {
            requestNotificationPermission()
        }

        // Battery
        binding.permBattery.findViewById<TextView>(R.id.tvPermTitle).text =
            "Penggunaan baterai di latar belakang"
        binding.permBattery.findViewById<TextView>(R.id.tvPermDesc).text =
            "Hindari gangguan saat unduh berlangsung lama."
        binding.permBattery.findViewById<Button>(R.id.btnGrant).setOnClickListener {
            requestBatteryOptimization()
        }
    }

    private fun requestStoragePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            Timber.d("Step3: Android 13+ — storage perm not needed")
        } else {
            storagePermLauncher.launch(arrayOf(
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            ))
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notifPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun requestBatteryOptimization() {
        val pm = requireContext().getSystemService(PowerManager::class.java)
        if (!pm.isIgnoringBatteryOptimizations(requireContext().packageName)) {
            startActivity(Intent(
                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:${requireContext().packageName}")
            ))
        }
    }

    private fun updatePermissionUI() {
        // Storage
        val storageGranted = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(
                requireContext(),
                Manifest.permission.READ_EXTERNAL_STORAGE
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

        binding.permStorage.findViewById<Button>(R.id.btnGrant).apply {
            isEnabled = !storageGranted
            text = if (storageGranted) "✓ Diizinkan" else "Izinkan"
        }

        // Notifikasi
        val notifGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(
                requireContext(),
                Manifest.permission.POST_NOTIFICATIONS
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

        binding.permNotification.findViewById<Button>(R.id.btnGrant).apply {
            isEnabled = !notifGranted
            text = if (notifGranted) "✓ Diizinkan" else "Izinkan"
        }

        // Battery
        val pm = requireContext().getSystemService(PowerManager::class.java)
        val batteryIgnored = pm.isIgnoringBatteryOptimizations(requireContext().packageName)

        binding.permBattery.findViewById<Button>(R.id.btnGrant).apply {
            isEnabled = !batteryIgnored
            text = if (batteryIgnored) "✓ Diizinkan" else "Izinkan"
        }
    }

    override fun onResume() {
        super.onResume()
        updatePermissionUI()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
