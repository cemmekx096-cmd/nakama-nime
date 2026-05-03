// ── HISTORY ────────────────────────────────────

let _historyItems    = [];
let _historyFiltered = [];
let _historySearch   = false;

Pages.history = (container) => {
    _historyItems    = _loadHistory();
    _historyFiltered = [..._historyItems];

    container.innerHTML = `
        <div class="page-header" style="position:sticky;
            top:0;background:var(--color-bg);z-index:50">
            <span class="page-title">Riwayat</span>
            <button class="header-btn"
                onclick="toggleHistorySearch()">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            </button>
            <button class="header-btn"
                onclick="showHistoryMenu()">
                <svg viewBox="0 0 24 24"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/></svg>
            </button>
        </div>

        <!-- Search bar -->
        <div id="history-search-wrap"
            style="display:none;padding:0 16px 8px">
            <div class="search-bar">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input type="text"
                    id="history-search-input"
                    placeholder="Cari riwayat..."
                    oninput="searchHistory(this.value)">
                <button onclick="toggleHistorySearch()"
                    style="background:none;border:none;
                        color:var(--color-text-sub);
                        cursor:pointer;font-size:20px">✕</button>
            </div>
        </div>

        <!-- Content -->
        <div id="history-content">
            ${_historyItems.length === 0
                ? _emptyHistory()
                : _renderHistoryList(_historyItems)
            }
        </div>
    `;
};

// ── RENDER ─────────────────────────────────────

function _renderHistoryList(items) {
    if (items.length === 0) {
        return `<div class="empty-state">
            <div class="empty-icon">( ·Д·。)</div>
            <div class="empty-title">Tidak ada hasil</div>
        </div>`;
    }

    // Group by tanggal
    const grouped = _groupByDate(items);

    return Object.entries(grouped).map(([date, animes]) => `
        <div class="list-section-header">${date}</div>
        ${animes.map(anime => _historyItem(anime)).join('')}
    `).join('');
}

function _historyItem(anime) {
    const params = encodeURIComponent(JSON.stringify({
        animeId: anime.animeId,
        pkg:     anime.pkg
    }));

    const thumbId = `hthumb-${anime.animeId}-${anime.pkg}`
        .replace(/[^a-z0-9-]/gi, '-');

    // Ambil last episode progress
    let lastEpInfo = '';
    try {
        if (typeof NativeStorage !== 'undefined') {
            const last = JSON.parse(
                NativeStorage.getLastWatched(anime.animeId, anime.pkg) || '{}'
            );
            if (last.episodeId) {
                const pct = last.duration > 0
                    ? Math.round(last.position / last.duration * 100)
                    : 0;
                lastEpInfo = `Ep ${last.episodeId.split('-').pop() || ''} · ${pct}%`;
            }
        }
    } catch(e) {}

    return `
        <div style="display:flex;align-items:center;
            gap:12px;padding:10px 16px;cursor:pointer;
            transition:background 0.15s"
            onclick="Router.navigate('anime-detail',
                JSON.parse(decodeURIComponent('${params}')))"
            oncontextmenu="showHistoryItemMenu(
                event,'${anime.animeId}','${anime.pkg}')">

            <!-- Thumbnail -->
            <div style="position:relative;flex-shrink:0">
                <img id="${thumbId}"
                    src="" data-url="${anime.thumbnailUrl || ''}"
                    style="width:56px;height:72px;
                        border-radius:var(--radius-sm);
                        object-fit:cover;
                        background:var(--color-card)"
                    onerror="this.src=''">
            </div>

            <!-- Info -->
            <div style="flex:1;min-width:0">
                <div style="font-size:14px;font-weight:600;
                    color:var(--color-text);
                    white-space:nowrap;overflow:hidden;
                    text-overflow:ellipsis;margin-bottom:4px">
                    ${anime.title}
                </div>

                ${lastEpInfo ? `
                    <div style="font-size:12px;
                        color:var(--color-primary);
                        margin-bottom:2px">
                        ${lastEpInfo}
                    </div>` : ''}

                <div style="font-size:12px;
                    color:var(--color-text-sub)">
                    ${_extNameFromPkg(anime.pkg)}
                    ${anime.status
                        ? ` · ${anime.status}` : ''}
                </div>
            </div>

            <!-- Remove button -->
            <button onclick="event.stopPropagation();
                removeFromHistory('${anime.animeId}','${anime.pkg}')"
                style="width:32px;height:32px;
                    display:flex;align-items:center;
                    justify-content:center;
                    background:none;border:none;
                    color:var(--color-text-sub);
                    cursor:pointer;flex-shrink:0">
                <svg width="18" height="18"
                    viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        </div>`;
}

function _emptyHistory() {
    return `
        <div class="empty-state">
            <div class="empty-icon">( ·Д·。)</div>
            <div class="empty-title">Belum ada riwayat</div>
            <div class="empty-desc">
                Anime yang kamu tonton akan muncul di sini
            </div>
            <button onclick="Router.navigate('explore')"
                style="margin-top:16px;padding:10px 24px;
                    background:var(--color-primary);
                    color:white;border:none;
                    border-radius:50px;font-size:14px;
                    font-weight:600;cursor:pointer">
                Mulai Jelajahi
            </button>
        </div>`;
}

// ── SEARCH ─────────────────────────────────────

function toggleHistorySearch() {
    _historySearch = !_historySearch;
    const wrap = document.getElementById('history-search-wrap');
    if (wrap) {
        wrap.style.display = _historySearch ? 'block' : 'none';
        if (_historySearch) {
            setTimeout(() => {
                document.getElementById('history-search-input')?.focus();
            }, 100);
        } else {
            // Reset
            _historyFiltered = [..._historyItems];
            _updateHistoryContent(_historyFiltered);
        }
    }
}

function searchHistory(query) {
    const q = query.toLowerCase().trim();
    _historyFiltered = q
        ? _historyItems.filter(a =>
            a.title.toLowerCase().includes(q))
        : [..._historyItems];

    _updateHistoryContent(_historyFiltered);
}

function _updateHistoryContent(items) {
    const content = document.getElementById('history-content');
    if (content) {
        content.innerHTML = items.length === 0
            ? _emptyHistory()
            : _renderHistoryList(items);
        _loadHistoryThumbnails();
    }
}

// ── ACTIONS ────────────────────────────────────

function removeFromHistory(animeId, pkg) {
    if (typeof NativeStorage !== 'undefined') {
        NativeStorage.removeFromHistory(animeId, pkg);
    }

    // Update local state
    _historyItems    = _historyItems.filter(
        a => !(a.animeId === animeId && a.pkg === pkg)
    );
    _historyFiltered = _historyFiltered.filter(
        a => !(a.animeId === animeId && a.pkg === pkg)
    );

    _updateHistoryContent(_historyFiltered);
    Log.d('History', `Removed: ${animeId}`);
}

function showHistoryMenu() {
    _showBottomSheet([
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`,
            label: 'Hapus semua riwayat',
            action: () => confirmClearHistory()
        }
    ], 'Riwayat');
}

function showHistoryItemMenu(event, animeId, pkg) {
    event.preventDefault();
    _showBottomSheet([
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
            label: 'Hapus dari riwayat',
            action: () => removeFromHistory(animeId, pkg)
        },
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
            label: 'Tandai semua episode ditonton',
            action: () => Log.d('History', `Mark all watched: ${animeId}`)
        }
    ]);
}

function confirmClearHistory() {
    const ok = confirm('Hapus semua riwayat tonton?');
    if (!ok) return;

    if (typeof NativeStorage !== 'undefined') {
        NativeStorage.clearHistory();
    }

    _historyItems    = [];
    _historyFiltered = [];
    _updateHistoryContent([]);
    Log.i('History', 'History cleared');
}

// ── THUMBNAIL LOADER ───────────────────────────

function _loadHistoryThumbnails() {
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
        if (!url) return;

        // Derive animeId dari img id
        // Format: hthumb-{animeId}-{pkg}
        const parts   = img.id.replace('hthumb-', '').split('-');
        const animeId = parts[0] || '';

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

// ── HELPERS ────────────────────────────────────

function _loadHistory() {
    try {
        if (typeof NativeStorage === 'undefined') return [];
        return JSON.parse(NativeStorage.getHistory() || '[]');
    } catch(e) {
        Log.e('History', `loadHistory: ${e.message}`);
        return [];
    }
}

function _groupByDate(items) {
    const groups = {};
    const now    = new Date();

    items.forEach(anime => {
        const ts    = anime.lastWatchedAt || 0;
        const date  = new Date(ts);
        const diff  = Math.floor((now - date) / 86400000);

        let label;
        if (diff === 0)      label = 'Hari ini';
        else if (diff === 1) label = 'Kemarin';
        else if (diff < 7)   label = `${diff} hari lalu`;
        else if (diff < 30)  label = `${Math.floor(diff/7)} minggu lalu`;
        else                 label = `${Math.floor(diff/30)} bulan lalu`;

        if (!groups[label]) groups[label] = [];
        groups[label].push(anime);
    });

    return groups;
}

function _extNameFromPkg(pkg) {
    const exts = ExtensionManager.getInstalled();
    const ext  = exts.find(e => e.pkg === pkg);
    return ext?.name || pkg.split('.').pop() || pkg;
}