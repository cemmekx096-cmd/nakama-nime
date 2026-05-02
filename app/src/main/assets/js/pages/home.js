// ── HOME / PUSTAKA ─────────────────────────────

Pages.home = (container) => {
    const library = _getLibrary();
    const cardMode = _getCardMode();

    container.innerHTML = `
        ${_homeHeader()}
        ${library.length === 0
            ? _emptyLibrary()
            : _renderGrid(library, cardMode)
        }
    `;

    // Load thumbnail via Coil
    _loadThumbnails();
};

// ── HEADER ─────────────────────────────────────

function _homeHeader() {
    return `
        <div class="page-header">
            <span class="page-title">Pustaka</span>
            <button class="header-btn" onclick="toggleHomeSearch()">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            </button>
            <button class="header-btn" onclick="showLibraryFilter()">
                <svg viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
            </button>
            <button class="header-btn" onclick="showLibraryMenu()">
                <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            </button>
        </div>

        <!-- Search bar (hidden by default) -->
        <div id="home-search" style="display:none;padding:0 16px 8px">
            <div class="search-bar">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input type="text" placeholder="Cari di pustaka..."
                    oninput="searchLibrary(this.value)"
                    id="home-search-input">
                <button onclick="toggleHomeSearch()" style="background:none;border:none;
                    color:var(--color-text-sub);cursor:pointer;font-size:20px">✕</button>
            </div>
        </div>

        <!-- Filter chips -->
        <div id="home-filters" style="display:none;
            padding:0 12px 8px;display:flex;gap:8px;overflow-x:auto;
            scrollbar-width:none">
            ${_filterChips()}
        </div>
    `;
}

function _filterChips() {
    const filters = ['Semua', 'Sedang ditonton', 'Sudah selesai', 'Diunduh'];
    return filters.map((f, i) => `
        <button class="filter-chip ${i === 0 ? 'active' : ''}"
            onclick="filterLibrary('${f}', this)">
            ${f}
        </button>`).join('');
}

// ── EMPTY STATE ────────────────────────────────

function _emptyLibrary() {
    return `
        <div class="empty-state">
            <div class="empty-icon">( ·O·;)</div>
            <div class="empty-title">Pustaka kamu kosong</div>
            <div class="empty-desc">
                Tambahkan anime dari tab Jelajahi
            </div>
            <button onclick="Router.navigate('explore')"
                style="margin-top:16px;padding:10px 24px;
                    background:var(--color-primary);color:white;
                    border:none;border-radius:50px;font-size:14px;
                    font-weight:600;cursor:pointer">
                Jelajahi
            </button>
        </div>`;
}

// ── GRID RENDER ────────────────────────────────

function _renderGrid(animes, mode) {
    const gridClass = {
        'compact':     'grid-compact',
        'comfortable': 'grid-comfortable',
        'list':        'grid-list'
    }[mode] || 'grid-compact';

    return `<div class="${gridClass}" id="anime-grid">
        ${animes.map(a => _animeCard(a, mode)).join('')}
    </div>`;
}

function _animeCard(anime, mode) {
    const id     = `thumb-${anime.animeId}-${anime.pkg}`.replace(/[^a-z0-9-]/gi, '-');
    const params = encodeURIComponent(JSON.stringify({
        animeId: anime.animeId,
        pkg:     anime.pkg
    }));

    if (mode === 'list') {
        return `
            <div class="anime-card"
                onclick="Router.navigate('anime-detail', JSON.parse(decodeURIComponent('${params}')))">
                <img id="${id}" class="anime-thumb"
                    src="" data-url="${anime.thumbnailUrl}"
                    onerror="this.src=''" loading="lazy">
                <div class="anime-info">
                    <div class="anime-title">${anime.title}</div>
                    <div class="anime-sub">${anime.status || ''} · ${anime.pkg.split('.')[1] || ''}</div>
                </div>
            </div>`;
    }

    return `
        <div class="anime-card"
            onclick="Router.navigate('anime-detail', JSON.parse(decodeURIComponent('${params}')))">
            <img id="${id}"
                src="" data-url="${anime.thumbnailUrl}"
                onerror="this.src=''" loading="lazy">
            <div class="anime-title">${anime.title}</div>
        </div>`;
}

// ── THUMBNAIL LOADER ───────────────────────────

function _loadThumbnails() {
    if (typeof NativeImage === 'undefined') return;

    document.querySelectorAll('img[data-url]').forEach(img => {
        const url     = img.getAttribute('data-url');
        const animeId = img.id.replace('thumb-', '').split('-')[0];
        if (!url) return;

        // Cek lokal dulu
        const localPath = NativeImage.getThumbnailPath(animeId);
        if (localPath) {
            img.src = `file://${localPath}`;
            return;
        }

        // Download via Coil
        const { id, promise } = NativeCallback.create();
        NativeImage.loadThumbnail(url, animeId, id);
        promise.then(result => {
            if (result.success) {
                img.src = `file://${result.path}`;
            } else {
                img.src = url; // fallback ke URL langsung
            }
        }).catch(() => {
            img.src = url;
        });
    });
}

// ── SEARCH ─────────────────────────────────────

let _homeSearchVisible = false;

function toggleHomeSearch() {
    _homeSearchVisible = !_homeSearchVisible;
    const bar = document.getElementById('home-search');
    if (bar) {
        bar.style.display = _homeSearchVisible ? 'block' : 'none';
        if (_homeSearchVisible) {
            setTimeout(() => {
                document.getElementById('home-search-input')?.focus();
            }, 100);
        }
    }
}

function searchLibrary(query) {
    const all    = _getLibrary();
    const q      = query.toLowerCase().trim();
    const result = q ? all.filter(a => a.title.toLowerCase().includes(q)) : all;
    const mode   = _getCardMode();

    const grid = document.getElementById('anime-grid');
    if (grid) {
        grid.outerHTML = _renderGrid(result, mode);
        _loadThumbnails();
    }
}

// ── FILTER ─────────────────────────────────────

function showLibraryFilter() {
    const filters = document.getElementById('home-filters');
    if (filters) {
        const isVisible = filters.style.display !== 'none';
        filters.style.display = isVisible ? 'none' : 'flex';
    }
}

function filterLibrary(filter, btn) {
    // Update chip aktif
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');

    let animes = _getLibrary();
    const downloadOnly = typeof NativeStorage !== 'undefined'
        ? NativeStorage.getSetting('download_only') === 'true'
        : false;

    switch(filter) {
        case 'Sedang ditonton':
            animes = animes.filter(a => a.lastWatchedAt > 0 && a.status !== 'Completed');
            break;
        case 'Sudah selesai':
            animes = animes.filter(a => a.status === 'Completed');
            break;
        case 'Diunduh':
            animes = animes.filter(a => a.downloaded);
            break;
    }

    const mode = _getCardMode();
    const grid = document.getElementById('anime-grid');
    if (grid) {
        grid.outerHTML = animes.length > 0
            ? _renderGrid(animes, mode)
            : _emptyLibrary();
        _loadThumbnails();
    }
}

// ── MENU ───────────────────────────────────────

function showLibraryMenu() {
    _showBottomSheet([
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/></svg>`,
            label: 'Grid Kompak',
            action: () => { _setCardMode('compact'); Router.navigate('home'); }
        },
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M3 3h8v8H3zm0 10h8v8H3zM13 3h8v8h-8zm0 10h8v8h-8z"/></svg>`,
            label: 'Grid Nyaman',
            action: () => { _setCardMode('comfortable'); Router.navigate('home'); }
        },
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>`,
            label: 'Daftar',
            action: () => { _setCardMode('list'); Router.navigate('home'); }
        }
    ], 'Tampilan');
}

// ── BOTTOM SHEET ───────────────────────────────

function _showBottomSheet(items, title = '') {
    // Hapus sheet lama
    document.getElementById('bottom-sheet')?.remove();
    document.getElementById('sheet-scrim')?.remove();

    const scrim = document.createElement('div');
    scrim.id = 'sheet-scrim';
    scrim.style.cssText = `
        position:fixed;inset:0;z-index:300;
        background:rgba(0,0,0,0.5)`;
    scrim.onclick = _closeBottomSheet;

    const sheet = document.createElement('div');
    sheet.id = 'bottom-sheet';
    sheet.style.cssText = `
        position:fixed;bottom:0;left:0;right:0;
        background:var(--color-surface);
        border-radius:16px 16px 0 0;
        z-index:301;padding-bottom:calc(
            var(--safe-bottom) + 64px)`;

    sheet.innerHTML = `
        ${title ? `<div style="padding:16px;font-size:13px;
            font-weight:700;color:var(--color-text-sub);
            text-transform:uppercase;letter-spacing:0.5px">
            ${title}</div>` : ''}
        ${items.map((item, i) => `
            <button id="sheet-item-${i}" class="menu-item">
                ${item.icon}
                ${item.label}
            </button>`).join('')}
    `;

    document.body.appendChild(scrim);
    document.body.appendChild(sheet);

    // Bind actions setelah DOM ready
    items.forEach((item, i) => {
        document.getElementById(`sheet-item-${i}`)
            ?.addEventListener('click', () => {
                _closeBottomSheet();
                item.action();
            });
    });
}

function _closeBottomSheet() {
    document.getElementById('bottom-sheet')?.remove();
    document.getElementById('sheet-scrim')?.remove();
}

// ── CSS TAMBAHAN ───────────────────────────────
// Inject ke head sekali saja
(function injectHomeStyles() {
    if (document.getElementById('home-styles')) return;
    const style = document.createElement('style');
    style.id = 'home-styles';
    style.textContent = `
        .filter-chip {
            white-space: nowrap;
            padding: 6px 14px;
            border-radius: 50px;
            border: 1.5px solid var(--color-border);
            background: none;
            color: var(--color-text-sub);
            font-size: 13px;
            cursor: pointer;
            transition: all 0.15s;
        }
        .filter-chip.active {
            background: var(--color-primary);
            border-color: var(--color-primary);
            color: white;
        }
    `;
    document.head.appendChild(style);
})();

// ── HELPERS ────────────────────────────────────

function _getLibrary() {
    try {
        if (typeof NativeStorage === 'undefined') return [];
        return JSON.parse(NativeStorage.getLibrary() || '[]');
    } catch(e) {
        Log.e('Home', `getLibrary error: ${e.message}`);
        return [];
    }
}

function _getCardMode() {
    if (typeof NativeStorage === 'undefined') return 'compact';
    return NativeStorage.getSetting('card_mode') || 'compact';
}

function _setCardMode(mode) {
    if (typeof NativeStorage !== 'undefined') {
        NativeStorage.setSetting('card_mode', mode);
    }
}