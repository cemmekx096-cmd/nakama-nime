// ── Router ─────────────────────────────────────
const Router = {
    _current:    'home',
    _currentTab: 'home',
    _detailStack: [],

    navigate(page, params = {}) {
        const TAB_PAGES = ['home', 'history', 'explore', 'more'];
        const isTab = TAB_PAGES.includes(page);

        if (isTab) {
            this._detailStack = [];
            this._current     = page;
            this._currentTab  = page;
        } else {
            this._detailStack.push({ page: this._current, params: {} });
            this._current = page;
        }

        this._render(page, params);
        this._updateNav(page);
        Log.d('Router', `→ ${page}`);
    },

    back() {
        // 1. Ada detail stack → pop
        if (this._detailStack.length > 0) {
            const prev = this._detailStack.pop();
            this._current = prev.page;
            this._render(prev.page, prev.params);
            this._updateNav(prev.page);
            return true;
        }

        // 2. Bukan home → ke home
        if (this._current !== 'home') {
            this._current    = 'home';
            this._currentTab = 'home';
            this._render('home', {});
            this._updateNav('home');
            return true;
        }

        // 3. Sudah di home → keluar
        return false;
    },

    _render(page, params = {}) {
        const c = document.getElementById('page-container');
        if (!c) return;

        try {
            switch (page) {
                case 'home':            Pages.home(c);                    break;
                case 'history':         Pages.history(c);                 break;
                case 'explore':         Pages.explore(c);                 break;
                case 'more':            Pages.more(c);                    break;
                case 'anime-detail':    Pages.animeDetail(c, params);     break;
                case 'episode-list':    Pages.episodeList(c, params);     break;
                case 'ext-detail':      Pages.extDetail(c, params);       break;
                case 'settings':        Pages.settings(c);                break;
                case 'downloads':       Pages.downloads(c);               break;
                case 'backup':          Pages.backup(c);                  break;
                case 'about':           Pages.about(c);                   break;
                case 'episode-player':  Pages.episodePlayer(c, params);  break;
                case 'source-browse':   Pages.sourceBrowse(c, params);   break;
                case 'source-browse': Pages.sourceBrowse(c, params); break;

                default:                Pages.home(c);
            }
        } catch(e) {
            Log.e('Router', `Render error on ${page}: ${e.message}`);
        }

        c.scrollTop = 0;
    },

    _updateNav(page) {
        const TAB_MAP = {
            'home': 'home', 'history': 'history',
            'explore': 'explore', 'more': 'more',
            'anime-detail': this._currentTab,
            'episode-list': this._currentTab,
            'ext-detail':   'explore',
            'episode-player': this._currentTab,  // ✅ tambah
            'source-browse':  'explore',         // ✅ tambah
            'settings':     'more',
            'downloads':    'more',
            'backup':       'more',
            'about':        'more'
        };

        const active = TAB_MAP[page] || this._currentTab;
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === active);
        });
    }
};

function handleBackButton() {
    const handled = Router.back();
    Log.d('Router', `back → ${handled}`);
    return handled;
}

// Lifecycle dari Kotlin
function onAppResume()  { Log.d('App', 'resume'); }
function onAppPause()   { Log.d('App', 'pause'); }
function onFullscreenChanged(v) {
    document.body.classList.toggle('fullscreen', v);
}
function onNativePageFinished(url) { Log.d('App', `loaded: ${url}`); }