const TAG = 'Core';

Log.i(TAG, `Nakama ${Config.version} starting...`);

// ── Tema ──────────────────────────────────────

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Log.d(TAG, `Theme applied: ${theme}`);
}

function applyAccent(hex) {
    document.documentElement.style.setProperty('--color-primary', hex);
    Log.d(TAG, `Accent applied: ${hex}`);
}

// ── Bottom Nav ────────────────────────────────

document.querySelectorAll('.nav-item:not(#btn-more)').forEach(btn => {
    btn.addEventListener('click', () => {
        Router.navigate(btn.dataset.page);
    });
});

// ── More Menu ─────────────────────────────────

const moreMenu  = document.getElementById('more-menu');
const menuScrim = document.getElementById('menu-scrim');
const btnMore   = document.getElementById('btn-more');

function openMoreMenu() {
    moreMenu.classList.add('open');
    menuScrim.classList.add('open');
    btnMore.classList.add('active');
}

function closeMoreMenu() {
    moreMenu.classList.remove('open');
    menuScrim.classList.remove('open');
    btnMore.classList.remove('active');
}

btnMore.addEventListener('click', () => {
    if (moreMenu.classList.contains('open')) {
        closeMoreMenu();
    } else {
        openMoreMenu();
    }
});

menuScrim.addEventListener('click', closeMoreMenu);

document.querySelectorAll('.more-menu-item').forEach(item => {
    item.addEventListener('click', () => {
        closeMoreMenu();
        const action = item.dataset.action;
        switch (action) {
            case 'settings': Router.navigate('settings'); break;
            case 'download': Router.navigate('downloads'); break;
            case 'backup':   Router.navigate('backup'); break;
            case 'log':      sendLog(); break;
            case 'about':    Router.navigate('about'); break;
        }
    });
});

// ── Send Log ──────────────────────────────────

function sendLog() {
    if (typeof NativeLogger !== 'undefined') {
        Log.i(TAG, 'User requested log share');
        // TODO: implement via LoggerBridge
    }
}

// ── Lifecycle callbacks dari Kotlin ──────────

function onAppResume() {
    Log.d(TAG, 'App resumed');
}

function onAppPause() {
    Log.d(TAG, 'App paused');
}

function onFullscreenChanged(isFullscreen) {
    document.body.classList.toggle('fullscreen', isFullscreen);
    Log.d(TAG, `Fullscreen: ${isFullscreen}`);
}

function onNativePageFinished(url) {
    Log.d(TAG, `Page finished: ${url}`);
}

// ── App Ready ─────────────────────────────────

function onAppReady() {
    document.getElementById('app-loading').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    // Load tema dari prefs via Kotlin (inject setelah page load)
    // applyTheme dipanggil dari MainActivity.injectTheme()

    Router.navigate('home');
    Log.i(TAG, 'App ready');
}

function checkBridges() {
    const bridges = ['NativeNetwork','NativeStorage','NativeExtension','NativeImage','NativePlayer'];
    const missing = bridges.filter(b => typeof window[b] === 'undefined');
    if (missing.length > 0) {
        Log.w(TAG, `Missing bridges: ${missing.join(', ')}`);
    } else {
        Log.i(TAG, 'All bridges ready');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    checkBridges();
    onAppReady();
});