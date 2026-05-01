// ── Core — entry point Nakama ──────────────────
const TAG = 'Core';

Log.i(TAG, `Nakama ${Config.version} starting...`);

// Setup bottom nav
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        Router.navigate(page);
    });
});

// Sembunyikan loading, tampil app
function onAppReady() {
    document.getElementById('app-loading').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    Router.navigate('home');
    Log.i(TAG, 'App ready');
}

// Cek bridge tersedia
function checkBridges() {
    const bridges = ['NativeNetwork','NativeStorage','NativeExtension','NativeImage','NativePlayer'];
    const missing = bridges.filter(b => typeof window[b] === 'undefined');
    if (missing.length > 0) {
        Log.w(TAG, `Missing bridges: ${missing.join(', ')}`);
    } else {
        Log.i(TAG, 'All bridges ready');
    }
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    checkBridges();
    onAppReady();
});