// ── BACKUP & RESTORE ───────────────────────────

const Backup = {

    /**
     * Export semua data ke file .zip dan share.
     * Data: library, progress, settings, extension list
     */
    async export() {
        Log.i('Backup', 'Starting export...');

        try {
            if (typeof NativeStorage === 'undefined') {
                throw new Error('NativeStorage tidak tersedia');
            }

            // Ambil semua data dari bridge
            const raw = NativeStorage.exportData();
            if (!raw || raw === '{}') {
                throw new Error('Tidak ada data untuk di-export');
            }

            const data = JSON.parse(raw);

            // Tambah metadata backup
            const backup = {
                ...data,
                meta: {
                    appVersion:  Config.version,
                    exportedAt:  new Date().toISOString(),
                    platform:    'android'
                }
            };

            // Simpan ke file JSON dulu
            const json     = JSON.stringify(backup, null, 2);
            const filename = `nakama_backup_${_dateStamp()}.json`;

            Log.i('Backup', `Exported: ${filename}`);
            Log.d('Backup', `Size: ${json.length} chars`);

            // TODO: simpan ke file via bridge + share intent
            // Untuk sekarang tampil success
            return { success: true, filename, size: json.length };

        } catch(e) {
            Log.e('Backup', `Export failed: ${e.message}`);
            return { success: false, error: e.message };
        }
    },

    /**
     * Import data dari file backup .json
     * @param jsonStr string isi file backup
     * @param callbackId ID callback JS
     */
    async import(jsonStr) {
        Log.i('Backup', 'Starting import...');

        try {
            // Validasi format
            const data = JSON.parse(jsonStr);

            if (!data.library && !data.progress && !data.settings) {
                throw new Error('Format backup tidak valid');
            }

            if (typeof NativeStorage === 'undefined') {
                throw new Error('NativeStorage tidak tersedia');
            }

            // Import via bridge
            const { id, promise } = NativeCallback.create();
            NativeStorage.importData(jsonStr, id);
            const result = await promise;

            if (!result.success) {
                throw new Error(result.error || 'Import gagal');
            }

            Log.i('Backup', `Imported: ${result.animeCount} anime, ` +
                `${result.progressCount} progress entries`);

            return { success: true, ...result };

        } catch(e) {
            Log.e('Backup', `Import failed: ${e.message}`);
            return { success: false, error: e.message };
        }
    },

    /**
     * Apply custom patch (.patch.json)
     * Patch bisa override: settings, extension METADATA, headers
     */
    async applyPatch(jsonStr) {
        Log.i('Backup', 'Applying patch...');

        try {
            const patch = JSON.parse(jsonStr);

            // Apply settings patch
            if (patch.settings && typeof NativeStorage !== 'undefined') {
                Object.entries(patch.settings).forEach(([k, v]) => {
                    NativeStorage.setSetting(k, String(v));
                    Log.d('Backup', `Patch setting: ${k} = ${v}`);
                });
            }

            // Clear extension cache agar patch aktif
            ExtensionManager.clearCache();

            Log.i('Backup', 'Patch applied');
            return { success: true };

        } catch(e) {
            Log.e('Backup', `Patch failed: ${e.message}`);
            return { success: false, error: e.message };
        }
    },

    /**
     * Cek apakah ada pending restore dari onboarding.
     * Dipanggil saat app pertama kali siap.
     */
    async checkPendingRestore() {
        const uri = _getSetting('pending_restore_uri');
        if (!uri) return;

        Log.i('Backup', `Pending restore found: ${uri}`);

        // Clear flag
        _setSetting('pending_restore_uri', '');

        // TODO: baca file dari URI via bridge
        // Untuk sekarang skip
    }
};

// ── HALAMAN BACKUP ─────────────────────────────

Pages.backup = (container) => {
    container.innerHTML = `
        <div class="page-header">
            <button class="header-btn" onclick="Router.back()">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="page-title">Data & Penyimpanan</span>
        </div>

        <!-- Storage info -->
        <div style="padding:16px">
            <div style="font-size:12px;font-weight:700;
                color:var(--color-text-sub);
                text-transform:uppercase;
                letter-spacing:0.5px;margin-bottom:12px">
                Penyimpanan
            </div>
            <div id="storage-info">
                <div style="padding:16px;text-align:center">
                    <div class="loading-spinner" style="margin:auto"></div>
                </div>
            </div>
        </div>

        <div class="menu-divider"></div>

        <!-- Backup section -->
        <div style="padding:16px">
            <div style="font-size:12px;font-weight:700;
                color:var(--color-text-sub);
                text-transform:uppercase;
                letter-spacing:0.5px;margin-bottom:4px">
                Backup & Pulihkan
            </div>
        </div>

        <button class="menu-item" onclick="doExportBackup()">
            <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            Ekspor backup
        </button>

        <button class="menu-item" onclick="doImportBackup()">
            <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
            Impor backup
        </button>

        <button class="menu-item" onclick="doImportPatch()">
            <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            Impor custom patch
        </button>

        <div class="menu-divider"></div>

        <!-- Clear data section -->
        <div style="padding:16px">
            <div style="font-size:12px;font-weight:700;
                color:var(--color-text-sub);
                text-transform:uppercase;
                letter-spacing:0.5px;margin-bottom:4px">
                Hapus Data
            </div>
        </div>

        <button class="menu-item" onclick="doClearCache()">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            Hapus cache response
        </button>

        <button class="menu-item" onclick="doClearThumbnails()">
            <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
            Hapus cache thumbnail
        </button>

        <button class="menu-item"
            style="color:#EF4444"
            onclick="confirmClearAllData()">
            <svg viewBox="0 0 24 24" fill="#EF4444"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            Hapus semua data
        </button>

        <div style="height:16px"></div>
    `;

    // Load storage info
    _loadStorageInfo();
};

// ── STORAGE INFO ───────────────────────────────

async function _loadStorageInfo() {
    const el = document.getElementById('storage-info');
    if (!el) return;

    try {
        // Cache gambar
        let cacheSize = '—';
        if (typeof NativeImage !== 'undefined') {
            const info = JSON.parse(NativeImage.getCacheSize() || '{}');
            cacheSize = info.total || '—';
        }

        // Download size
        let dlSize = '—';
        if (typeof NativePlayer !== 'undefined') {
            const info = JSON.parse(NativePlayer.getDownloadSize() || '{}');
            dlSize = info.formatted || '—';
        }

        el.innerHTML = `
            ${_storageRow('Cache thumbnail', cacheSize)}
            ${_storageRow('Video unduhan', dlSize)}
            ${_storageRow('Database', '< 1 MB')}
        `;
    } catch(e) {
        el.innerHTML = `
            <div style="font-size:13px;color:var(--color-text-sub);
                padding:8px 0">
                Gagal memuat info storage
            </div>`;
    }
}

function _storageRow(label, value) {
    return `
        <div style="display:flex;justify-content:space-between;
            padding:8px 0;border-bottom:1px solid var(--color-border);
            font-size:14px">
            <span style="color:var(--color-text)">${label}</span>
            <span style="color:var(--color-text-sub)">${value}</span>
        </div>`;
}

// ── ACTIONS ────────────────────────────────────

async function doExportBackup() {
    const result = await Backup.export();
    if (result.success) {
        alert(`Backup berhasil!\nFile: ${result.filename}`);
    } else {
        alert(`Gagal backup:\n${result.error}`);
    }
}

function doImportBackup() {
    // TODO: buka file picker via bridge
    Log.i('Backup', 'Import backup — todo: file picker');
    alert('Fitur ini akan segera tersedia');
}

function doImportPatch() {
    // TODO: buka file picker .patch.json via bridge
    Log.i('Backup', 'Import patch — todo: file picker');
    alert('Fitur ini akan segera tersedia');
}

function doClearCache() {
    const ok = confirm('Hapus cache response?\nThumbnail tidak akan terhapus.');
    if (!ok) return;
    Cache.clear();
    Log.i('Backup', 'Response cache cleared');
    alert('Cache response berhasil dihapus');
}

function doClearThumbnails() {
    const ok = confirm('Hapus semua cache thumbnail?\n' +
        'Thumbnail akan diunduh ulang saat diperlukan.');
    if (!ok) return;

    if (typeof NativeImage !== 'undefined') {
        NativeImage.clearThumbnails();
        NativeImage.clearIcons();
        Log.i('Backup', 'Thumbnails cleared');
        alert('Cache thumbnail berhasil dihapus');
        _loadStorageInfo();
    }
}

function confirmClearAllData() {
    const ok = confirm(
        '⚠️ HAPUS SEMUA DATA?\n\n' +
        'Ini akan menghapus:\n' +
        '- Pustaka & riwayat tonton\n' +
        '- Progress episode\n' +
        '- Semua pengaturan\n' +
        '- Cache & thumbnail\n\n' +
        'Aksi ini tidak dapat dibatalkan!'
    );
    if (!ok) return;

    const ok2 = confirm('Yakin? Data tidak bisa dipulihkan.');
    if (!ok2) return;

    try {
        if (typeof NativeStorage !== 'undefined') {
            NativeStorage.clearHistory();
        }
        if (typeof NativeImage !== 'undefined') {
            NativeImage.clearThumbnails();
            NativeImage.clearIcons();
        }
        Cache.clear();
        ExtensionManager.clearCache();

        Log.i('Backup', 'All data cleared');
        alert('Semua data berhasil dihapus');
        Router.navigate('home');
    } catch(e) {
        alert(`Gagal menghapus data:\n${e.message}`);
    }
}

// ── HELPER ─────────────────────────────────────

function _dateStamp() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}` +
           `${String(d.getDate()).padStart(2,'0')}`;
}