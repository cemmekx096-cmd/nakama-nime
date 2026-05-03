// ── SOURCE BROWSE ──────────────────────────────
// Halaman browse anime dari extension tertentu
// Tab: Popular | Terbaru | (Search)

let _browseState = {
    pkg:        null,
    ext:        null,
    tab:        'popular',  // 'popular' | 'latest'
    page:       1,
    loading:    false,
    hasMore:    true,
    items:      [],
    filters:    null,
    activeFilters: {}
};

Pages.sourceBrowse = async (container, params) => {
    const { pkg, tab } = params;
    if (!pkg) {
        container.innerHTML = _errorState('Package tidak valid');
        return;
    }

    // Reset state
    _browseState = {
        pkg,
        ext:          null,
        tab:          tab || 'popular',
        page:         1,
        loading:      false,
        hasMore:      true,
        items:        [],
        filters:      null,
        activeFilters: {}
    };

    // Render layout dulu
    container.innerHTML = _browseLayout(pkg);

    // Load extension
    const ext = await _loadExtension(pkg);
    if (!ext) {
        container.innerHTML = _errorState(`Extension ${pkg} tidak bisa dimuat`);
        return;
    }
    _browseState.ext = ext;

    // Load filters kalau ada
    if (typeof ext.getFilters === 'function') {
        try {
            _browseState.filters = await ext.getFilters();
        } catch(e) {
            Log.w('Browse', `getFilters error: ${e.message}`);
        }
    }

    // Update filter button visibility
    const filterBtn = document.getElementById('browse-filter-btn');
    if (filterBtn && _browseState.filters) {
        filterBtn.style.display = 'flex';
    }

    // Set tab aktif
    _switchBrowseTab(_browseState.tab);
};

// ── LAYOUT ─────────────────────────────────────

function _browseLayout(pkg) {
    const ext = _getInstalledExts().find(e => e.pkg === pkg);
    const name = ext?.name || pkg;

    return `
        <!-- Header -->
        <div class="page-header" style="position:sticky;top:0;
            background:var(--color-bg);z-index:50">
            <button class="header-btn" onclick="Router.back()">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="page-title">${name}</span>
            <button class="header-btn" onclick="toggleBrowseSearch()">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            </button>
            <button id="browse-filter-btn" class="header-btn"
                style="display:none" onclick="showBrowseFilter()">
                <svg viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
            </button>
        </div>

        <!-- Search bar (hidden) -->
        <div id="browse-search-wrap"
            style="display:none;padding:0 16px 8px">
            <div class="search-bar">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input type="text" id="browse-search-input"
                    placeholder="Cari anime..."
                    onkeydown="if(event.key==='Enter') doSearch(this.value)">
                <button onclick="doSearch(
                        document.getElementById(
                            'browse-search-input').value)"
                    style="background:none;border:none;
                        color:var(--color-primary);
                        cursor:pointer;font-weight:600;
                        font-size:13px">
                    Cari
                </button>
            </div>

            <!-- Search history -->
            <div id="search-history-wrap"></div>
        </div>

        <!-- Tab Popular | Terbaru -->
        <div id="browse-tabs" class="sub-tabs">
            <button class="sub-tab active"
                onclick="_switchBrowseTab('popular')">
                Populer
            </button>
            <button class="sub-tab"
                onclick="_switchBrowseTab('latest')">
                Terbaru
            </button>
        </div>

        <!-- Filter chips (hidden until filter applied) -->
        <div id="browse-filter-chips"
            style="display:none;padding:6px 12px;
                overflow-x:auto;scrollbar-width:none;
                white-space:nowrap">
        </div>

        <!-- Grid content -->
        <div id="browse-grid" style="min-height:200px">
            <div style="padding:48px;text-align:center">
                <div class="loading-spinner" style="margin:auto"></div>
            </div>
        </div>

        <!-- Load more -->
        <div id="load-more-wrap" style="
            display:none;padding:16px;text-align:center">
            <button onclick="loadMoreBrowse()"
                style="padding:10px 32px;
                    background:var(--color-card);
                    border:none;border-radius:50px;
                    color:var(--color-text);
                    font-size:14px;cursor:pointer">
                Muat lebih banyak
            </button>
        </div>

        <div style="height:8px"></div>
    `;
}

// ── TAB SWITCH ─────────────────────────────────

function _switchBrowseTab(tab) {
    _browseState.tab   = tab;
    _browseState.page  = 1;
    _browseState.items = [];
    _browseState.hasMore = true;

    // Update tab UI
    document.querySelectorAll('#browse-tabs .sub-tab')
        .forEach((btn, i) => {
            btn.classList.toggle('active',
                (i === 0 && tab === 'popular') ||
                (i === 1 && tab === 'latest')
            );
        });

    // Sembunyikan search
    const searchWrap = document.getElementById('browse-search-wrap');
    if (searchWrap) searchWrap.style.display = 'none';

    _fetchBrowse();
}

// ── FETCH ──────────────────────────────────────

async function _fetchBrowse() {
    if (_browseState.loading || !_browseState.ext) return;

    _browseState.loading = true;

    const grid = document.getElementById('browse-grid');

    // Loading state
    if (_browseState.page === 1 && grid) {
        grid.innerHTML = `
            <div style="padding:48px;text-align:center">
                <div class="loading-spinner" style="margin:auto"></div>
            </div>`;
    }

    try {
        const ext    = _browseState.ext;
        const page   = _browseState.page;
        const filters = _browseState.activeFilters;

        let results = [];

        if (_browseState.tab === 'search' && _browseState.searchQuery) {
            results = await ext.searchAnime(
                _browseState.searchQuery,
                page,
                filters
            );
        } else if (_browseState.tab === 'latest') {
            results = await ext.getLatest(page);
        } else {
            results = await ext.getPopular(page);
        }

        if (!Array.isArray(results)) results = [];

        // Append ke items
        _browseState.items = page === 1
            ? results
            : [..._browseState.items, ...results];

        _browseState.hasMore = results.length > 0;

        _renderBrowseGrid(_browseState.items, page === 1);

    } catch(e) {
        Log.e('Browse', `fetch error: ${e.message}`);
        if (grid && _browseState.page === 1) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <div class="empty-title">Gagal memuat</div>
                    <div class="empty-desc">${e.message}</div>
                    <button onclick="_fetchBrowse()"
                        style="margin-top:12px;padding:8px 20px;
                            background:var(--color-primary);
                            color:white;border:none;
                            border-radius:50px;cursor:pointer">
                        Coba lagi
                    </button>
                </div>`;
        }
    } finally {
        _browseState.loading = false;
    }
}

function _renderBrowseGrid(items, replace = true) {
    const grid    = document.getElementById('browse-grid');
    const loadBtn = document.getElementById('load-more-wrap');
    if (!grid) return;

    const cardMode = _getSetting('card_mode') || 'compact';
    const gridClass = {
        'compact':     'grid-compact',
        'comfortable': 'grid-comfortable',
        'list':        'grid-list'
    }[cardMode] || 'grid-compact';

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">( ·O·;)</div>
                <div class="empty-title">Tidak ada hasil</div>
            </div>`;
        if (loadBtn) loadBtn.style.display = 'none';
        return;
    }

    const html = `
        <div class="${gridClass}">
            ${items.map(anime => _browseCard(anime, cardMode)).join('')}
        </div>`;

    if (replace) {
        grid.innerHTML = html;
    } else {
        // Append — ganti grid lama
        const existing = grid.querySelector(`.${gridClass}`);
        if (existing) {
            existing.innerHTML += items
                .slice(-_browseState.items.length)
                .map(a => _browseCard(a, cardMode))
                .join('');
        } else {
            grid.innerHTML = html;
        }
    }

    // Load more button
    if (loadBtn) {
        loadBtn.style.display = _browseState.hasMore ? 'block' : 'none';
    }

    // Load thumbnails
    _loadBrowseThumbnails();
}

function _browseCard(anime, mode) {
    const params = encodeURIComponent(JSON.stringify({
        animeId: anime.animeId || anime.id,
        pkg:     _browseState.pkg
    }));

    const thumbId = `bthumb-${(anime.animeId || anime.id || '')
        .replace(/[^a-z0-9]/gi, '-')}`;

    if (mode === 'list') {
        return `
            <div class="anime-card"
                onclick="Router.navigate('anime-detail',
                    JSON.parse(decodeURIComponent('${params}')))">
                <img id="${thumbId}" class="anime-thumb"
                    src="" data-url="${anime.thumbnailUrl || ''}"
                    onerror="this.src=''" loading="lazy">
                <div class="anime-info">
                    <div class="anime-title">${anime.title}</div>
                    <div class="anime-sub">${anime.status || ''}</div>
                </div>
            </div>`;
    }

    return `
        <div class="anime-card"
            onclick="Router.navigate('anime-detail',
                JSON.parse(decodeURIComponent('${params}')))">
            <img id="${thumbId}"
                src="" data-url="${anime.thumbnailUrl || ''}"
                onerror="this.src=''" loading="lazy">
            <div class="anime-title">${anime.title}</div>
        </div>`;
}

// ── LOAD MORE ──────────────────────────────────

async function loadMoreBrowse() {
    if (_browseState.loading || !_browseState.hasMore) return;
    _browseState.page++;
    await _fetchBrowse();
}

// ── SEARCH ─────────────────────────────────────

let _browseSearchVisible = false;

function toggleBrowseSearch() {
    _browseSearchVisible = !_browseSearchVisible;
    const wrap = document.getElementById('browse-search-wrap');
    const tabs = document.getElementById('browse-tabs');

    if (wrap) {
        wrap.style.display = _browseSearchVisible ? 'block' : 'none';
    }
    if (tabs) {
        tabs.style.display = _browseSearchVisible ? 'none' : 'flex';
    }

    if (_browseSearchVisible) {
        _renderSearchHistory();
        setTimeout(() => {
            document.getElementById('browse-search-input')?.focus();
        }, 100);
    } else {
        // Kembali ke tab sebelumnya
        if (_browseState.tab === 'search') {
            _switchBrowseTab('popular');
        }
    }
}

async function doSearch(query) {
    if (!query.trim()) return;

    // Simpan ke search history
    _saveSearchHistory(query);

    // Update state
    _browseState.tab         = 'search';
    _browseState.searchQuery = query;
    _browseState.page        = 1;
    _browseState.items       = [];

    // Sembunyikan search history
    const historyWrap = document.getElementById('search-history-wrap');
    if (historyWrap) historyWrap.style.display = 'none';

    // Update header
    const tabs = document.getElementById('browse-tabs');
    if (tabs) {
        tabs.innerHTML = `
            <button class="sub-tab active"
                style="flex:none;padding-right:24px">
                Hasil: "${query}"
            </button>`;
    }

    await _fetchBrowse();
}

// ── SEARCH HISTORY ─────────────────────────────

function _renderSearchHistory() {
    const wrap = document.getElementById('search-history-wrap');
    if (!wrap) return;

    const history = _getSearchHistory();
    if (history.length === 0) {
        wrap.innerHTML = '';
        return;
    }

    wrap.style.display = 'block';
    wrap.innerHTML = `
        <div style="padding:8px 0 4px">
            ${history.map(q => `
                <div style="display:flex;align-items:center;
                    padding:10px 4px;cursor:pointer;
                    border-bottom:1px solid var(--color-border)"
                    onclick="document.getElementById(
                        'browse-search-input').value='${q}';
                        doSearch('${q}')">
                    <svg width="16" height="16"
                        viewBox="0 0 24 24"
                        fill="var(--color-text-sub)"
                        style="margin-right:12px;flex-shrink:0">
                        <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                    </svg>
                    <span style="flex:1;font-size:14px;
                        color:var(--color-text)">${q}</span>
                    <button onclick="event.stopPropagation();
                        removeSearchHistory('${q}')"
                        style="background:none;border:none;
                            color:var(--color-text-sub);
                            cursor:pointer;padding:4px;
                            font-size:18px">
                        ✕
                    </button>
                </div>`).join('')}
        </div>`;
}

function _getSearchHistory() {
    try {
        const data = _getSetting(`search_history_${_browseState.pkg}`);
        return data ? JSON.parse(data) : [];
    } catch(e) { return []; }
}

function _saveSearchHistory(query) {
    let history = _getSearchHistory();
    history     = [query, ...history.filter(q => q !== query)].slice(0, 10);
    _setSetting(
        `search_history_${_browseState.pkg}`,
        JSON.stringify(history)
    );
}

function removeSearchHistory(query) {
    let history = _getSearchHistory().filter(q => q !== query);
    _setSetting(
        `search_history_${_browseState.pkg}`,
        JSON.stringify(history)
    );
    _renderSearchHistory();
}

// ── FILTER ─────────────────────────────────────

function showBrowseFilter() {
    const filters = _browseState.filters;
    if (!filters) return;

    // Build filter options dari extension
    const items = [];

    if (filters.genres?.length > 0) {
        items.push({
            icon: `<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
            label: 'Genre',
            action: () => _showGenreFilter(filters.genres)
        });
    }

    if (filters.years?.length > 0) {
        items.push({
            icon: `<svg viewBox="0 0 24 24"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>`,
            label: 'Tahun',
            action: () => _showYearFilter(filters.years)
        });
    }

    if (items.length === 0) {
        alert('Extension ini tidak mendukung filter');
        return;
    }

    _showBottomSheet(items, 'Filter');
}

function _showGenreFilter(genres) {
    const current = _browseState.activeFilters.genre || '';

    _showBottomSheet(
        genres.map(g => ({
            icon: current === g.value
                ? `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
                : `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`,
            label: g.name || g.value,
            action: () => {
                _browseState.activeFilters.genre = g.value;
                _browseState.page  = 1;
                _browseState.items = [];
                _updateFilterChips();
                _fetchBrowse();
            }
        })),
        'Pilih Genre'
    );
}

function _showYearFilter(years) {
    _showBottomSheet(
        years.map(y => ({
            icon: `<svg viewBox="0 0 24 24"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>`,
            label: String(y.name || y.value),
            action: () => {
                _browseState.activeFilters.year = y.value;
                _browseState.page  = 1;
                _browseState.items = [];
                _updateFilterChips();
                _fetchBrowse();
            }
        })),
        'Pilih Tahun'
    );
}

function _updateFilterChips() {
    const wrap = document.getElementById('browse-filter-chips');
    if (!wrap) return;

    const chips = Object.entries(_browseState.activeFilters)
        .map(([key, val]) => `
            <span style="display:inline-flex;align-items:center;
                gap:6px;padding:5px 12px;margin-right:6px;
                background:var(--color-primary);
                color:white;border-radius:50px;
                font-size:12px;font-weight:600">
                ${val}
                <span onclick="removeFilter('${key}')"
                    style="cursor:pointer;font-size:16px;
                        line-height:1">✕</span>
            </span>`).join('');

    wrap.innerHTML = chips;
    wrap.style.display = chips ? 'block' : 'none';
}

function removeFilter(key) {
    delete _browseState.activeFilters[key];
    _browseState.page  = 1;
    _browseState.items = [];
    _updateFilterChips();
    _fetchBrowse();
}

// ── THUMBNAIL LOADER ───────────────────────────

function _loadBrowseThumbnails() {
    if (typeof NativeImage === 'undefined') {
        document.querySelectorAll('img[data-url]').forEach(img => {
            if (!img.src || img.src === window.location.href) {
                img.src = img.getAttribute('data-url') || '';
            }
        });
        return;
    }

    document.querySelectorAll('img[data-url]').forEach(img => {
        const url = img.getAttribute('data-url');
        if (!url || img.src) return;

        // Derive animeId dari img id
        const animeId = img.id.replace('bthumb-', '');

        const localPath = NativeImage.getThumbnailPath(animeId);
        if (localPath) {
            img.src = `file://${localPath}`;
            return;
        }

        const { id, promise } = NativeCallback.create();
        NativeImage.loadThumbnail(url, animeId, id);
        promise.then(result => {
            img.src = result.success
                ? `file://${result.path}`
                : url;
        }).catch(() => { img.src = url; });
    });
}