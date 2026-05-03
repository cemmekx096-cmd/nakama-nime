// ── EXTENSION MANAGER ──────────────────────────
// Wrapper terpusat untuk operasi extension.
// Logic utama ada di explore.js & ext-detail.js.
// File ini handle: load, cache, validasi extension.

const ExtensionManager = {

    // Cache extension yang sudah di-eval
    _cache: {},

    /**
     * Load dan eval extension JS dari storage.
     * @param pkg package ID extension
     * @returns object extension atau null
     */
    async load(pkg) {
        // Return dari cache kalau ada
        if (this._cache[pkg]) {
            Log.d('ExtMgr', `Cache hit: ${pkg}`);
            return this._cache[pkg];
        }

        if (typeof NativeExtension === 'undefined') {
            Log.e('ExtMgr', 'NativeExtension bridge tidak tersedia');
            return null;
        }

        // Baca file .js dari internal storage
        const code = NativeExtension.readExtension(pkg);
        if (!code) {
            Log.w('ExtMgr', `Extension tidak ditemukan: ${pkg}`);
            return null;
        }

        try {
            // Eval extension code
            const mod = {};
            new Function('module', 'exports', code)(mod, mod.exports = {});
            const ext = mod.exports?.default || mod.exports;

            // Validasi fungsi wajib
            if (!this._validate(ext, pkg)) return null;

            this._cache[pkg] = ext;
            Log.i('ExtMgr', `Loaded: ${pkg}`);
            return ext;

        } catch(e) {
            Log.e('ExtMgr', `Eval error ${pkg}: ${e.message}`);
            return null;
        }
    },

    /**
     * Validasi extension punya semua fungsi wajib.
     */
    _validate(ext, pkg) {
        const required = ['getPopular','getLatest','getEpisodes','getVideos'];
        const missing  = required.filter(fn => typeof ext[fn] !== 'function');

        if (missing.length > 0) {
            Log.w('ExtMgr', `${pkg} missing: ${missing.join(', ')}`);
            return false;
        }
        return true;
    },

    /**
     * Hapus cache extension tertentu.
     * Dipanggil setelah update extension.
     */
    clearCache(pkg) {
        if (pkg) {
            delete this._cache[pkg];
            Log.d('ExtMgr', `Cache cleared: ${pkg}`);
        } else {
            this._cache = {};
            Log.d('ExtMgr', 'All cache cleared');
        }
    },

    /**
     * Ambil semua extension terinstall.
     */
    getInstalled() {
        try {
            if (typeof NativeExtension === 'undefined') return [];
            return JSON.parse(NativeExtension.getInstalled() || '[]');
        } catch(e) {
            Log.e('ExtMgr', `getInstalled: ${e.message}`);
            return [];
        }
    },

    /**
     * Cek apakah extension terinstall.
     */
    isInstalled(pkg) {
        if (typeof NativeExtension === 'undefined') return false;
        return NativeExtension.isInstalled(pkg);
    },

    /**
     * Cek mode penyamaran — global atau per extension.
     */
    isIncognito(pkg) {
        const global = _getSetting('incognito_global') === 'true';
        if (global) return true;
        return _getSetting(`incognito_${pkg}`) === 'true';
    }
};

// Alias global — dipakai oleh anime-detail.js & player.js
async function _loadExtension(pkg) {
    return await ExtensionManager.load(pkg);
}