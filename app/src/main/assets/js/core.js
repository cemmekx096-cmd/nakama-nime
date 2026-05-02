const TAG = 'Core';
Log.i(TAG, `Nakama ${Config.version} starting...`);

// ── Tema ──────────────────────────────────────
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Log.d(TAG, `Theme: ${theme}`);
}

function applyAccent(hex) {
    document.documentElement.style.setProperty('--color-primary', hex);
    Log.d(TAG, `Accent: ${hex}`);
}

// ── Bottom Nav ────────────────────────────────
function initNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            Router.navigate(btn.dataset.page);
        });
    });
}

// ── App Ready ─────────────────────────────────
function onAppReady() {
    document.getElementById('app-loading').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    initNav();
    Router.navigate('home');
    Log.i(TAG, 'Ready');
}

function checkBridges() {
    const needed = ['NativeNetwork','NativeStorage','NativeExtension','NativeImage','NativePlayer'];
    const missing = needed.filter(b => typeof window[b] === 'undefined');
    if (missing.length > 0) Log.w(TAG, `Missing bridges: ${missing.join(', ')}`);
    else Log.i(TAG, 'All bridges OK');
}

function onAppResume()  { Log.d(TAG, 'resume'); }
function onAppPause()   { Log.d(TAG, 'pause'); }
function onFullscreenChanged(v) {
    document.body.classList.toggle('fullscreen', v);
}
function onNativePageFinished(url) { Log.d(TAG, `loaded: ${url}`); }
function sendLog() { Log.i(TAG, 'sendLog — todo'); }

window.addEventListener('DOMContentLoaded', () => {
    checkBridges();
    onAppReady();
});