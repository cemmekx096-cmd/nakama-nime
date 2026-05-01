// ── Nakama Config ──────────────────────────────
const Config = {
    version:        "0.1.1.1",
    defaultRepoUrl: "https://raw.githubusercontent.com/user/nakama-extensions/main/index.json",
    progressIntervalMs: 5000,  // simpan progress setiap 5 detik
    cacheTTL: {
        popular:  60 * 60 * 1000,       // 1 jam
        latest:   30 * 60 * 1000,       // 30 menit
        search:   10 * 60 * 1000,       // 10 menit
        episodes: 6  * 60 * 60 * 1000   // 6 jam
    }
};

// Freeze agar tidak bisa diubah
Object.freeze(Config);
Object.freeze(Config.cacheTTL);