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

    // Views dari include — di-cache saat onViewCreated
    private lateinit var btnGrantStorage: Button
    private lateinit var btnGrantNotif: Button
    private lateinit var btnGrantBattery: Button

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

        // Ambil view dari include langsung via root view
        val permStorageView   = view.findViewById<View>(R.id.permStorage)
        val permNotifView     = view.findViewById<View>(R.id.permNotification)
        val permBatteryView   = view.findViewById<View>(R.id.permBattery)

        // Setup text
        permStorageView.findViewById<TextView>(R.id.tvPermTitle).text = "Izin penyimpanan"
        permStorageView.findViewById<TextView>(R.id.tvPermDesc).text =
            "Untuk menyimpan unduhan video."

        permNotifView.findViewById<TextView>(R.id.tvPermTitle).text = "Izin notifikasi"
        permNotifView.findViewById<TextView>(R.id.tvPermDesc).text =
            "Untuk notifikasi pembaruan extension."

        permBatteryView.findViewById<TextView>(R.id.tvPermTitle).text =
            "Penggunaan baterai di latar belakang"
        permBatteryView.findViewById<TextView>(R.id.tvPermDesc).text =
            "Hindari gangguan saat unduh berlangsung lama."

        // Cache tombol
        btnGrantStorage = permStorageView.findViewById(R.id.btnGrant)
        btnGrantNotif   = permNotifView.findViewById(R.id.btnGrant)
        btnGrantBattery = permBatteryView.findViewById(R.id.btnGrant)

        // Setup click
        btnGrantStorage.setOnClickListener { requestStoragePermission() }
        btnGrantNotif.setOnClickListener   { requestNotificationPermission() }
        btnGrantBattery.setOnClickListener { requestBatteryOptimization() }

        updatePermissionUI()
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

        btnGrantStorage.isEnabled = !storageGranted
        btnGrantStorage.text = if (storageGranted) "✓ Diizinkan" else "Izinkan"

        // Notifikasi
        val notifGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(
                requireContext(),
                Manifest.permission.POST_NOTIFICATIONS
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

        btnGrantNotif.isEnabled = !notifGranted
        btnGrantNotif.text = if (notifGranted) "✓ Diizinkan" else "Izinkan"

        // Battery
        val pm = requireContext().getSystemService(PowerManager::class.java)
        val batteryIgnored = pm.isIgnoringBatteryOptimizations(requireContext().packageName)

        btnGrantBattery.isEnabled = !batteryIgnored
        btnGrantBattery.text = if (batteryIgnored) "✓ Diizinkan" else "Izinkan"
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
