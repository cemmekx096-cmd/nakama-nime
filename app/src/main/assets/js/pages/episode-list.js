// ── EPISODE LIST ───────────────────────────────
// Halaman list episode lengkap (full page)
// Dipakai kalau episode terlalu banyak

Pages.episodeList = (container, params) => {
    const { animeId, pkg, episodes, title } = params;

    if (!episodes || episodes.length === 0) {
        container.innerHTML = `
            <div class="page-header">
                <button class="header-btn" onclick="Router.back()">
                    <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                </button>
                <span class="page-title">Episode</span>
            </div>
            <div class="empty-state">
                <div class="empty-title">Tidak ada episode</div>
            </div>`;
        return;
    }

    // Ambil data progress & watched
    const watchedIds = _getWatchedIdsForList(animeId, pkg);

    let _reversed = false;
    let _filtered = [...episodes];

    container.innerHTML = `
        <div class="page-header" style="position:sticky;
            top:0;background:var(--color-bg);z-index:50">
            <button class="header-btn" onclick="Router.back()">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="page-title" style="font-size:16px">
                ${title || 'Daftar Episode'}
            </span>
            <button class="header-btn"
                onclick="toggleEpListSearch()">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            </button>
            <button class="header-btn"
                onclick="toggleEpListSort()">
                <svg viewBox="0 0 24 24"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/></svg>
            </button>
        </div>

        <!-- Search bar -->
        <div id="eplist-search" style="display:none;
            padding:0 16px 8px">
            <div class="search-bar">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input type="text"
                    placeholder="Cari episode..."
                    id="eplist-search-input"
                    oninput="filterEpList(this.value,
                        ${JSON.stringify(JSON.stringify(episodes))})">
                <button onclick="toggleEpListSearch()"
                    style="background:none;border:none;
                        color:var(--color-text-sub);
                        cursor:pointer;font-size:20px">✕</button>
            </div>
        </div>

        <!-- Counter -->
        <div style="padding:4px 16px 8px;
            font-size:13px;color:var(--color-text-sub)">
            ${episodes.length} episode ·
            ${watchedIds.length} ditonton
        </div>

        <!-- Episode list -->
        <div id="eplist-container">
            ${_renderEpItems(episodes, watchedIds, animeId, pkg)}
        </div>

        <div style="height:16px"></div>
    `;
};

// ── RENDER ITEMS ───────────────────────────────

function _renderEpItems(episodes, watchedIds, animeId, pkg) {
    if (episodes.length === 0) {
        return `<div class="empty-state">
            <div class="empty-title">Tidak ada hasil</div>
        </div>`;
    }

    return episodes.map(ep => {
        const isWatched = watchedIds.includes(ep.episodeId);

        let progress = {};
        try {
            if (typeof NativeStorage !== 'undefined') {
                progress = JSON.parse(
                    NativeStorage.getProgress(ep.episodeId) || '{}'
                );
            }
        } catch(e) {}

        const hasProgress = progress.position > 0 && !isWatched;
        const progressPct = hasProgress && progress.duration > 0
            ? Math.min(100, Math.round(
                progress.position / progress.duration * 100))
            : 0;

        return `
            <div class="episode-item ${isWatched ? 'watched' : ''}"
                onclick="playEpFromList(
                    '${ep.episodeId}',
                    ${progress.position || 0},
                    '${animeId}','${pkg}')">

                <div style="flex:1;min-width:0">
                    <!-- Nomor + judul -->
                    <div style="font-size:14px;font-weight:600;
                        color:${isWatched
                            ? 'var(--color-text-sub)'
                            : 'var(--color-text)'};
                        margin-bottom:2px">
                        Ep ${ep.number}
                        ${ep.title
                            ? `<span style="font-weight:400;
                                color:var(--color-text-sub)">
                                — ${ep.title}</span>`
                            : ''}
                    </div>

                    <!-- Meta -->
                    <div style="font-size:12px;
                        color:var(--color-text-sub);
                        display:flex;gap:8px;
                        align-items:center">
                        ${ep.uploadedAt
                            ? `<span>${ep.uploadedAt}</span>` : ''}
                        ${ep.duration
                            ? `<span>${formatDuration(ep.duration)}</span>`
                            : ''}
                        ${isWatched
                            ? `<span style="color:var(--color-primary)">
                                ✓ Ditonton</span>`
                            : ''}
                        ${hasProgress
                            ? `<span style="color:var(--color-primary)">
                                ${formatDuration(progress.position)}
                               </span>`
                            : ''}
                    </div>

                    <!-- Progress bar -->
                    ${hasProgress ? `
                        <div style="height:2px;
                            background:var(--color-border);
                            border-radius:1px;margin-top:6px">
                            <div style="height:100%;width:${progressPct}%;
                                background:var(--color-primary);
                                border-radius:1px"></div>
                        </div>` : ''}
                </div>

                <!-- Download badge -->
                ${ep.downloaded ? `
                    <svg width="16" height="16"
                        viewBox="0 0 24 24"
                        fill="var(--color-primary)"
                        style="flex-shrink:0">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>` : ''}

                <!-- Play icon -->
                <svg width="20" height="20"
                    viewBox="0 0 24 24"
                    fill="var(--color-text-sub)"
                    style="flex-shrink:0">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </div>`;
    }).join('');
}

// ── ACTIONS ────────────────────────────────────

function playEpFromList(episodeId, resumeMs, animeId, pkg) {
    Router.navigate('episode-player', {
        episodeId,
        resumeMs: resumeMs * 1000, // detik → ms
        animeId,
        pkg,
        episodes: _currentEpisodes || []
    });
}

// ── SEARCH ─────────────────────────────────────

let _epListSearchVisible = false;

function toggleEpListSearch() {
    _epListSearchVisible = !_epListSearchVisible;
    const bar = document.getElementById('eplist-search');
    if (bar) {
        bar.style.display = _epListSearchVisible ? 'block' : 'none';
        if (_epListSearchVisible) {
            setTimeout(() => {
                document.getElementById('eplist-search-input')?.focus();
            }, 100);
        }
    }
}

function filterEpList(query, episodesJson) {
    try {
        const episodes  = JSON.parse(episodesJson);
        const q         = query.toLowerCase().trim();
        const filtered  = q
            ? episodes.filter(ep =>
                String(ep.number).includes(q) ||
                (ep.title || '').toLowerCase().includes(q))
            : episodes;

        const watchedIds = [];
        const container  = document.getElementById('eplist-container');
        if (container) {
            container.innerHTML = _renderEpItems(
                filtered, watchedIds, '', ''
            );
        }
    } catch(e) {
        Log.e('EpList', `filterEpList: ${e.message}`);
    }
}

// ── SORT ───────────────────────────────────────

let _epListReversed = false;

function toggleEpListSort() {
    _epListReversed = !_epListReversed;

    const container = document.getElementById('eplist-container');
    if (!container) return;

    // Ambil semua episode dari DOM (reverse items)
    const items = container.querySelectorAll('.episode-item');
    const arr   = Array.from(items).reverse();

    // Re-render
    container.innerHTML = arr.map(el => el.outerHTML).join('');

    Log.d('EpList', `Sort: ${_epListReversed ? 'desc' : 'asc'}`);
}

// ── HELPER ─────────────────────────────────────

function _getWatchedIdsForList(animeId, pkg) {
    try {
        if (!animeId || !pkg) return [];
        if (typeof NativeStorage === 'undefined') return [];
        return JSON.parse(
            NativeStorage.getWatchedEpisodes(animeId, pkg) || '[]'
        );
    } catch(e) { return []; }
}