// ── Router — navigasi antar halaman ───────────
const Router = {
    _current: 'home',
    _stack:   [],      // history navigasi untuk back button

    /**
     * Navigasi ke halaman.
     * @param page   nama halaman (home/explore/history/settings/anime-detail/episode-list)
     * @param params parameter tambahan (animeId, pkg, dll)
     */
    navigate(page, params = {}) {
        Log.d('Router', `Navigate → ${page}`);

        // Simpan ke stack untuk back button
        this._stack.push({ page: this._current, params: {} });

        this._current = page;
        this._render(page, params);
        this._updateNav(page);
    },

    /**
     * Kembali ke halaman sebelumnya.
     * @returns true kalau berhasil back, false kalau sudah di root
     */
    back() {
        if (this._stack.length === 0) return false;
        const prev = this._stack.pop();
        this._current = prev.page;
        this._render(prev.page, prev.params);
        this._updateNav(prev.page);
        return true;
    },

    _render(page, params) {
        const container = document.getElementById('page-container');
        if (!container) return;

        switch (page) {
            case 'home':         container.innerHTML = Pages.home();         break;
            case 'explore':      container.innerHTML = Pages.explore();      break;
            case 'history':      container.innerHTML = Pages.history();      break;
            case 'settings':     container.innerHTML = Pages.settings();     break;
            case 'anime-detail': Pages.animeDetail(container, params);       break;
            case 'episode-list': Pages.episodeList(container, params);       break;
            default:             container.innerHTML = Pages.home();
        }

        // Scroll ke atas saat ganti halaman
        container.scrollTop = 0;
    },

    _updateNav(page) {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });
    }
};

/**
 * Handle back button dari Kotlin (MainActivity.onBackPressed)
 * Return "true" kalau JS yang handle, "false" kalau tidak
 */
function handleBackButton() {
    const handled = Router.back();
    Log.d('Router', `handleBackButton → handled=${handled}`);
    return handled;
}

/**
 * Lifecycle callbacks dari Kotlin
 */
function onAppResume() {
    Log.d('App', 'Resume');
}

function onAppPause() {
    Log.d('App', 'Pause');
}

function onFullscreenChanged(isFullscreen) {
    Log.d('App', `Fullscreen: ${isFullscreen}`);
    document.body.classList.toggle('fullscreen', isFullscreen);
}