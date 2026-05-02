const Router = {
    _current: 'home',
    _currentTab: 'home',   // track tab aktif
    _detailStack: [],      // stack HANYA untuk halaman detail (anime-detail, episode-list)

    navigate(page, params = {}) {
        const tabPages = ['home', 'explore', 'history', 'settings'];
        const isTab = tabPages.includes(page);

        if (isTab) {
            // Pindah tab → reset detail stack, tidak push ke history
            this._detailStack = [];
            this._current = page;
            this._currentTab = page;
        } else {
            // Halaman detail → push ke detail stack
            this._detailStack.push({
                page: this._current,
                params: {}
            });
            this._current = page;
        }

        this._render(page, params);
        this._updateNav(page);
        Log.d('Router', `Navigate → ${page} (tab: ${this._currentTab})`);
    },

    back() {
        // 1. Ada detail stack → kembali ke halaman detail sebelumnya
        if (this._detailStack.length > 0) {
            const prev = this._detailStack.pop();
            this._current = prev.page;
            this._render(prev.page, prev.params);
            this._updateNav(prev.page);
            Log.d('Router', `Back → ${prev.page} (detail stack)`);
            return true;
        }

        // 2. Bukan di home → kembali ke home
        if (this._current !== 'home') {
            this._current = 'home';
            this._currentTab = 'home';
            this._render('home', {});
            this._updateNav('home');
            Log.d('Router', 'Back → home');
            return true;
        }

        // 3. Sudah di home → keluar app
        Log.d('Router', 'Back → exit app');
        return false;
    },

    _render(page, params) {
        const container = document.getElementById('page-container');
        if (!container) return;

        switch (page) {
            case 'home':         container.innerHTML = Pages.home();      break;
            case 'explore':      container.innerHTML = Pages.explore();   break;
            case 'history':      container.innerHTML = Pages.history();   break;
            case 'settings':     container.innerHTML = Pages.settings();  break;
            case 'anime-detail': Pages.animeDetail(container, params);    break;
            case 'episode-list': Pages.episodeList(container, params);    break;
            default:             container.innerHTML = Pages.home();
        }
        container.scrollTop = 0;
    },

    _updateNav(page) {
        const tabMap = {
            'home': 'home',
            'explore': 'explore',
            'history': 'history',
            'settings': 'settings',
            'anime-detail': this._currentTab,
            'episode-list': this._currentTab
        };

        const activeTab = tabMap[page] || this._currentTab;

        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === activeTab);
        });
    },

    // Tambah di bagian bawah router.js, sebelum baris terakhir
    function handleBackButton() {
        const handled = Router.back();
        Log.d('Router', `handleBackButton → handled=${handled}`);
        return handled;
    }
};
