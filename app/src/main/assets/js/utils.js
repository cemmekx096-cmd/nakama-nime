// ── Utility Functions ──────────────────────────

/**
 * Log ke Timber via NativeLogger bridge.
 * Fallback ke console kalau bridge belum ready.
 */
const Log = {
    d: (tag, msg) => {
        if (typeof NativeLogger !== 'undefined') NativeLogger.debug(tag, msg);
        else console.log(`[${tag}] ${msg}`);
    },
    e: (tag, msg) => {
        if (typeof NativeLogger !== 'undefined') NativeLogger.error(tag, msg);
        else console.error(`[${tag}] ${msg}`);
    },
    w: (tag, msg) => {
        if (typeof NativeLogger !== 'undefined') NativeLogger.warn(tag, msg);
        else console.warn(`[${tag}] ${msg}`);
    },
    i: (tag, msg) => {
        if (typeof NativeLogger !== 'undefined') NativeLogger.info(tag, msg);
        else console.info(`[${tag}] ${msg}`);
    }
};

/**
 * Callback registry untuk async bridge calls.
 * JS buat promise → Kotlin resolve via NativeCallback.resolve()
 */
const NativeCallback = {
    _callbacks: {},

    /**
     * Buat promise yang menunggu Kotlin callback.
     * @returns { callbackId, promise }
     */
    create() {
        const id = `cb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const promise = new Promise((resolve, reject) => {
            this._callbacks[id] = { resolve, reject };
            // Timeout 30 detik — biar tidak hang selamanya
            setTimeout(() => {
                if (this._callbacks[id]) {
                    delete this._callbacks[id];
                    reject(new Error(`Callback timeout: ${id}`));
                }
            }, 30000);
        });
        return { id, promise };
    },

    /**
     * Dipanggil Kotlin saat selesai.
     * evaluateJavascript("NativeCallback.resolve('id', 'json')")
     */
    resolve(id, jsonStr) {
        const cb = this._callbacks[id];
        if (!cb) return;
        delete this._callbacks[id];
        try {
            const data = JSON.parse(jsonStr);
            cb.resolve(data);
        } catch (e) {
            cb.resolve(jsonStr);
        }
    },

    reject(id, error) {
        const cb = this._callbacks[id];
        if (!cb) return;
        delete this._callbacks[id];
        cb.reject(new Error(error));
    }
};

/**
 * Helper fetch via NativeNetwork bridge.
 * Return promise dengan result { success, status, body, headers, error }
 */
async function nativeFetch(url, options = {}) {
    const { id, promise } = NativeCallback.create();
    NativeNetwork.fetch(
        url,
        JSON.stringify(options.headers || {}),
        options.method || 'GET',
        options.body || '',
        id
    );
    return promise;
}

/**
 * Format durasi detik → "12:34" atau "1:23:45"
 */
function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
}

/**
 * Format timestamp → "29 Apr 2025"
 */
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

/**
 * Debounce — untuk search input
 */
function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}