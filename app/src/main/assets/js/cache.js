// ── Cache Manager ──────────────────────────────
const Cache = {
    _mem: {},  // memory cache

    /**
     * Set cache dengan TTL.
     * @param key   cache key
     * @param data  data yang disimpan
     * @param ttl   time-to-live dalam ms
     */
    set(key, data, ttl) {
        this._mem[key] = {
            data,
            expiredAt: Date.now() + ttl
        };
        Log.d('Cache', `Set: ${key} (TTL: ${ttl}ms)`);
    },

    /**
     * Ambil cache kalau masih valid.
     * @returns data atau null kalau expired/tidak ada
     */
    get(key) {
        const entry = this._mem[key];
        if (!entry) return null;
        if (Date.now() > entry.expiredAt) {
            delete this._mem[key];
            return null;
        }
        Log.d('Cache', `Hit: ${key}`);
        return entry.data;
    },

    /**
     * Hapus satu cache entry.
     */
    delete(key) {
        delete this._mem[key];
    },

    /**
     * Hapus semua cache.
     */
    clear() {
        this._mem = {};
        Log.d('Cache', 'Cleared all');
    },

    /**
     * Hapus cache yang sudah expired.
     */
    cleanup() {
        const now = Date.now();
        let count = 0;
        Object.keys(this._mem).forEach(key => {
            if (now > this._mem[key].expiredAt) {
                delete this._mem[key];
                count++;
            }
        });
        if (count > 0) Log.d('Cache', `Cleanup: removed ${count} expired entries`);
    }
};

// Cleanup setiap 5 menit
setInterval(() => Cache.cleanup(), 5 * 60 * 1000);