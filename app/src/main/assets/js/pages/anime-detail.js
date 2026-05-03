// ── ANIME DETAIL ───────────────────────────────

let _currentAnime   = null;
let _currentEpisodes = [];
let _watchedIds     = [];
let _lastProgress   = null;

Pages.animeDetail = async (container, params) => {
    const { animeId, pkg } = params;
    if (!animeId || !pkg) {
        container.innerHTML = _errorState('Parameter tidak valid');
        return;
    }

    // Tampil skeleton loading
    container.innerHTML = _detailSkeleton();

    try {
        // Load extension
        const ext = await _loadExtension(pkg);
        if (!ext) throw new Error(`Extension ${pkg} tidak ditemukan`);

        // Fetch anime detail + episodes paralel
        const [detail, episodes] = await Promise.all([
            _fetchAnimeDetail(ext, animeId),
            _fetchEpisodes(ext, animeId)
        ]);

        _currentAnime    = { ...detail, animeId, pkg };
        _currentEpisodes = episodes;

        // Load data lokal
        _watchedIds   = _getWatchedIds(animeId, pkg);
        _lastProgress = _getLastProgress(animeId, pkg);

        // Update lastWatchedAt di DB
        _updateLastWatched(animeId, pkg);

        // Render
        container.innerHTML = _detailLayout(_currentAnime, _currentEpisodes);

        // Load thumbnail
        _loadDetailThumbnail(_currentAnime);

    } catch(e) {
        container.innerHTML = _errorState(e.message);
        Log.e('AnimeDetail', e.message);
    }
};

// ── LAYOUT ─────────────────────────────────────

function _detailLayout(anime, episodes) {
    const inLibrary = typeof NativeStorage !== 'undefined'
        ? NativeStorage.isInLibrary(anime.animeId, anime.pkg)
        : false;

    const playBtnText = _getPlayButtonText();

    return `
        <!-- Banner / Thumbnail -->
        <div style="position:relative">
            <img id="detail-banner"
                src="" style="width:100%;height:220px;
                object-fit:cover;display:block;
                background:var(--color-card)">
            <!-- Gradient overlay -->
            <div style="position:absolute;bottom:0;left:0;right:0;
                height:120px;background:linear-gradient(
                    transparent, var(--color-bg))"></div>

            <!-- Back button -->
            <button onclick="Router.back()"
                style="position:absolute;top:16px;left:8px;
                    width:40px;height:40px;border-radius:50%;
                    background:rgba(0,0,0,0.6);border:none;
                    color:white;display:flex;align-items:center;
                    justify-content:center;cursor:pointer">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
            </button>

            <!-- Titik 3 -->
            <button onclick="showAnimeMenu()"
                style="position:absolute;top:16px;right:8px;
                    width:40px;height:40px;border-radius:50%;
                    background:rgba(0,0,0,0.6);border:none;
                    color:white;display:flex;align-items:center;
                    justify-content:center;cursor:pointer">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
            </button>
        </div>

        <!-- Info -->
        <div style="padding:0 16px 8px">
            <h1 style="font-size:20px;font-weight:700;
                color:var(--color-text);line-height:1.3;
                margin-bottom:6px">
                ${anime.title}
            </h1>

            <!-- Meta info -->
            <div style="display:flex;flex-wrap:wrap;gap:6px;
                margin-bottom:12px">
                ${anime.status ? `<span class="meta-chip">${anime.status}</span>` : ''}
                ${anime.year   ? `<span class="meta-chip">${anime.year}</span>` : ''}
                ${anime.rating ? `<span class="meta-chip">⭐ ${anime.rating}</span>` : ''}
            </div>

            <!-- Action buttons -->
            <div style="display:flex;gap:8px;margin-bottom:16px">
                <!-- Play button -->
                <button id="btn-play"
                    onclick="playAnime()"
                    style="flex:1;padding:12px;
                        background:var(--color-primary);
                        color:white;border:none;
                        border-radius:var(--radius-md);
                        font-size:15px;font-weight:600;
                        cursor:pointer;display:flex;
                        align-items:center;justify-content:center;
                        gap:8px">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    ${playBtnText}
                </button>

                <!-- Tambah ke pustaka -->
                <button id="btn-library"
                    onclick="toggleLibrary()"
                    style="width:48px;height:48px;
                        background:var(--color-card);
                        border:none;border-radius:var(--radius-md);
                        display:flex;align-items:center;
                        justify-content:center;cursor:pointer">
                    <svg width="22" height="22" viewBox="0 0 24 24"
                        fill="${inLibrary ? 'var(--color-primary)' : 'var(--color-text-sub)'}">
                        ${inLibrary
                            ? `<path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>`
                            : `<path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>`
                        }
                    </svg>
                </button>

                <!-- Reload -->
                <button onclick="reloadAnimeDetail()"
                    style="width:48px;height:48px;
                        background:var(--color-card);
                        border:none;border-radius:var(--radius-md);
                        display:flex;align-items:center;
                        justify-content:center;cursor:pointer">
                    <svg width="22" height="22" viewBox="0 0 24 24"
                        fill="var(--color-text-sub)">
                        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                    </svg>
                </button>
            </div>

            <!-- Genre tags -->
            ${anime.genres ? `
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
                    ${_parseGenres(anime.genres).map(g => `
                        <span style="padding:4px 10px;
                            background:var(--color-card);
                            border-radius:50px;font-size:12px;
                            color:var(--color-text-sub)">
                            ${g}
                        </span>`).join('')}
                </div>` : ''}

            <!-- Sinopsis -->
            ${anime.synopsis ? `
                <div id="synopsis-wrap">
                    <p id="synopsis-text"
                        style="font-size:13px;color:var(--color-text-sub);
                            line-height:1.6;
                            display:-webkit-box;-webkit-line-clamp:3;
                            -webkit-box-orient:vertical;overflow:hidden">
                        ${anime.synopsis}
                    </p>
                    <button onclick="toggleSynopsis()"
                        id="synopsis-btn"
                        style="background:none;border:none;
                            color:var(--color-primary);
                            font-size:13px;cursor:pointer;
                            padding:4px 0;margin-top:2px">
                        Selengkapnya
                    </button>
                </div>` : ''}
        </div>

        <!-- Divider + Episode header -->
        <div style="display:flex;align-items:center;
            padding:8px 16px;gap:8px;
            border-top:1px solid var(--color-border)">
            <span style="font-size:15px;font-weight:700;flex:1">
                ${episodes.length} Episode
            </span>
            <button onclick="sortEpisodes()"
                style="background:none;border:none;
                    color:var(--color-text-sub);
                    font-size:13px;cursor:pointer;
                    display:flex;align-items:center;gap:4px">
                <svg width="16" height="16" viewBox="0 0 24 24"
                    fill="currentColor">
                    <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
                </svg>
                Urutkan
            </button>
        </div>

        <!-- Episode list -->
        <div id="episode-list">
            ${_renderEpisodeList(episodes)}
        </div>
    `;
}

// ── EPISODE LIST ───────────────────────────────

function _renderEpisodeList(episodes) {
    if (episodes.length === 0) {
        return `<div class="empty-state">
            <div class="empty-title">Tidak ada episode</div>
        </div>`;
    }

    return episodes.map(ep => {
        const isWatched = _watchedIds.includes(ep.episodeId);
        const progress  = typeof NativeStorage !== 'undefined'
            ? (() => {
                try {
                    return JSON.parse(
                        NativeStorage.getProgress(ep.episodeId) || '{}'
                    );
                } catch(e) { return {}; }
            })()
            : {};

        const hasProgress = progress.position > 0 && !isWatched;

        return `
            <div class="episode-item ${isWatched ? 'watched' : ''}"
                onclick="playEpisode('${ep.episodeId}')">

                <!-- Thumbnail episode (opsional) -->
                ${ep.thumbnailUrl ? `
                    <img src="${ep.thumbnailUrl}"
                        style="width:80px;height:48px;
                            border-radius:6px;object-fit:cover;
                            flex-shrink:0;background:var(--color-card)"
                        onerror="this.style.display='none'">` : ''}

                <div style="flex:1;min-width:0">
                    <div style="font-size:14px;font-weight:600;
                        color:${isWatched
                            ? 'var(--color-text-sub)'
                            : 'var(--color-text)'};
                        white-space:nowrap;overflow:hidden;
                        text-overflow:ellipsis">
                        Episode ${ep.number}${ep.title ? ` - ${ep.title}` : ''}
                    </div>

                    <div style="font-size:12px;
                        color:var(--color-text-sub);
                        margin-top:2px">
                        ${ep.uploadedAt || ''}
                        ${hasProgress ? `
                            · <span style="color:var(--color-primary)">
                                ${formatDuration(progress.position)}
                              </span>` : ''}
                        ${isWatched ? `
                            · <span style="color:var(--color-text-sub)">
                                ✓ Ditonton
                              </span>` : ''}
                    </div>

                    <!-- Progress bar -->
                    ${hasProgress ? `
                        <div style="height:2px;background:var(--color-border);
                            border-radius:1px;margin-top:4px">
                            <div style="height:100%;
                                background:var(--color-primary);
                                border-radius:1px;width:${
                                    Math.min(100,
                                        Math.round(progress.position /
                                        (progress.duration || 1) * 100)
                                    )}%"></div>
                        </div>` : ''}
                </div>

                <!-- Download status -->
                <div style="display:flex;align-items:center;
                    padding:0 4px">
                    ${ep.downloaded ? `
                        <svg width="16" height="16"
                            viewBox="0 0 24 24"
                            fill="var(--color-primary)">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>` : ''}
                </div>
            </div>`;
    }).join('');
}

// ── PLAY LOGIC ─────────────────────────────────

function _getPlayButtonText() {
    if (!_lastProgress || Object.keys(_lastProgress).length === 0) {
        return 'Mulai';
    }
    if (_lastProgress.completed) {
        // Cari episode berikutnya
        const idx = _currentEpisodes.findIndex(
            e => e.episodeId === _lastProgress.episodeId
        );
        if (idx >= 0 && idx < _currentEpisodes.length - 1) {
            return `Lanjut Ep ${_currentEpisodes[idx + 1].number}`;
        }
        return 'Selesai';
    }
    return `Lanjut Ep ${_lastProgress.episodeId || ''}`;
}

function playAnime() {
    if (_currentEpisodes.length === 0) return;

    // Belum pernah nonton
    if (!_lastProgress || Object.keys(_lastProgress).length === 0) {
        playEpisode(_currentEpisodes[0].episodeId);
        return;
    }

    // Sudah selesai → episode berikutnya
    if (_lastProgress.completed) {
        const idx = _currentEpisodes.findIndex(
            e => e.episodeId === _lastProgress.episodeId
        );
        if (idx >= 0 && idx < _currentEpisodes.length - 1) {
            playEpisode(_currentEpisodes[idx + 1].episodeId);
        }
        return;
    }

    // Resume
    playEpisode(_lastProgress.episodeId, _lastProgress.position);
}

function playEpisode(episodeId, resumeMs = 0) {
    Router.navigate('episode-player', {
        episodeId,
        resumeMs,
        animeId: _currentAnime?.animeId,
        pkg:     _currentAnime?.pkg,
        episodes: _currentEpisodes
    });
}

// ── ACTIONS ────────────────────────────────────

function toggleLibrary() {
    if (!_currentAnime || typeof NativeStorage === 'undefined') return;

    const { animeId, pkg } = _currentAnime;
    const inLibrary = NativeStorage.isInLibrary(animeId, pkg);

    if (inLibrary) {
        NativeStorage.removeFromLibrary(animeId, pkg);
    } else {
        NativeStorage.addToLibrary(JSON.stringify(_currentAnime));
    }

    // Update icon tombol
    const btn = document.getElementById('btn-library');
    if (btn) {
        const nowIn = !inLibrary;
        btn.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24"
                fill="${nowIn ? 'var(--color-primary)' : 'var(--color-text-sub)'}">
                ${nowIn
                    ? `<path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>`
                    : `<path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>`
                }
            </svg>`;
    }

    Log.d('AnimeDetail', `Library: ${inLibrary ? 'removed' : 'added'}`);
}

function reloadAnimeDetail() {
    if (_currentAnime) {
        Pages.animeDetail(
            document.getElementById('page-container'),
            { animeId: _currentAnime.animeId, pkg: _currentAnime.pkg }
        );
    }
}

function toggleSynopsis() {
    const text = document.getElementById('synopsis-text');
    const btn  = document.getElementById('synopsis-btn');
    if (!text || !btn) return;

    const isCollapsed = text.style.webkitLineClamp === '3';
    text.style.webkitLineClamp  = isCollapsed ? 'unset' : '3';
    text.style.webkitBoxOrient  = isCollapsed ? 'unset' : 'vertical';
    text.style.display          = isCollapsed ? 'block' : '-webkit-box';
    text.style.overflow         = isCollapsed ? 'visible' : 'hidden';
    btn.textContent             = isCollapsed ? 'Lebih sedikit' : 'Selengkapnya';
}

let _episodesReversed = false;
function sortEpisodes() {
    _episodesReversed = !_episodesReversed;
    const sorted = _episodesReversed
        ? [..._currentEpisodes].reverse()
        : [..._currentEpisodes];

    const list = document.getElementById('episode-list');
    if (list) list.innerHTML = _renderEpisodeList(sorted);
}

function showAnimeMenu() {
    _showBottomSheet([
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56z"/></svg>`,
            label: 'Buka di browser',
            action: () => {
                if (_currentAnime?.sourceUrl) {
                    Log.d('AnimeDetail', `Open: ${_currentAnime.sourceUrl}`);
                }
            }
        },
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/></svg>`,
            label: 'Tandai semua ditonton',
            action: () => markAllWatched()
        },
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
            label: 'Tandai semua belum ditonton',
            action: () => markAllUnwatched()
        }
    ]);
}

function markAllWatched() {
    if (!_currentAnime || typeof NativeStorage === 'undefined') return;
    _currentEpisodes.forEach(ep => {
        NativeStorage.markWatched(
            ep.episodeId,
            _currentAnime.animeId,
            _currentAnime.pkg
        );
    });
    _watchedIds = _currentEpisodes.map(e => e.episodeId);
    const list = document.getElementById('episode-list');
    if (list) list.innerHTML = _renderEpisodeList(_currentEpisodes);
}

function markAllUnwatched() {
    Log.d('AnimeDetail', 'markAllUnwatched — todo');
}

// ── SKELETON ───────────────────────────────────

function _detailSkeleton() {
    return `
        <div style="animation:pulse 1.2s ease-in-out infinite">
            <div style="width:100%;height:220px;
                background:var(--color-card)"></div>
            <div style="padding:16px">
                <div style="height:24px;width:70%;
                    background:var(--color-card);
                    border-radius:6px;margin-bottom:12px"></div>
                <div style="height:16px;width:40%;
                    background:var(--color-card);
                    border-radius:6px;margin-bottom:8px"></div>
                <div style="height:48px;
                    background:var(--color-card);
                    border-radius:var(--radius-md);
                    margin-bottom:16px"></div>
                ${[1,2,3,4,5].map(() => `
                    <div style="height:56px;
                        background:var(--color-card);
                        border-radius:6px;margin-bottom:8px">
                    </div>`).join('')}
            </div>
        </div>
        <style>
            @keyframes pulse {
                0%,100% { opacity:1; }
                50%      { opacity:0.5; }
            }
        </style>`;
}

function _errorState(msg) {
    return `
        <div class="page-header">
            <button class="header-btn" onclick="Router.back()">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="page-title">Error</span>
        </div>
        <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <div class="empty-title">Gagal memuat</div>
            <div class="empty-desc">${msg}</div>
            <button onclick="Router.back()"
                style="margin-top:16px;padding:10px 24px;
                    background:var(--color-primary);color:white;
                    border:none;border-radius:50px;cursor:pointer">
                Kembali
            </button>
        </div>`;
}

// ── EXTENSION LOADER ───────────────────────────

const _extCache = {};

async function _loadExtension(pkg) {
    if (_extCache[pkg]) return _extCache[pkg];

    if (typeof NativeExtension === 'undefined') return null;

    const code = NativeExtension.readExtension(pkg);
    if (!code) return null;

    try {
        // Eval extension code
        const module = {};
        const fn     = new Function('module', 'exports', code);
        fn(module, module.exports = {});

        const ext = module.exports?.default || module.exports;
        _extCache[pkg] = ext;
        Log.d('AnimeDetail', `Extension loaded: ${pkg}`);
        return ext;
    } catch(e) {
        Log.e('AnimeDetail', `Extension eval error: ${e.message}`);
        return null;
    }
}

async function _fetchAnimeDetail(ext, animeId) {
    if (typeof ext.getAnimeDetail === 'function') {
        return await ext.getAnimeDetail(animeId);
    }
    // Fallback — return minimal info
    return { title: animeId, synopsis: '', genres: '', status: '' };
}

async function _fetchEpisodes(ext, animeId) {
    try {
        const eps = await ext.getEpisodes(animeId);
        return Array.isArray(eps) ? eps : [];
    } catch(e) {
        Log.e('AnimeDetail', `getEpisodes error: ${e.message}`);
        return [];
    }
}

// ── THUMBNAIL ──────────────────────────────────

function _loadDetailThumbnail(anime) {
    const img = document.getElementById('detail-banner');
    if (!img || !anime.thumbnailUrl) return;

    if (typeof NativeImage === 'undefined') {
        img.src = anime.thumbnailUrl;
        return;
    }

    const localPath = NativeImage.getThumbnailPath(anime.animeId);
    if (localPath) {
        img.src = `file://${localPath}`;
        return;
    }

    const { id, promise } = NativeCallback.create();
    NativeImage.loadThumbnail(anime.thumbnailUrl, anime.animeId, id);
    promise.then(result => {
        img.src = result.success
            ? `file://${result.path}`
            : anime.thumbnailUrl;
    }).catch(() => { img.src = anime.thumbnailUrl; });
}

// ── HELPERS ────────────────────────────────────

function _getWatchedIds(animeId, pkg) {
    try {
        if (typeof NativeStorage === 'undefined') return [];
        return JSON.parse(
            NativeStorage.getWatchedEpisodes(animeId, pkg) || '[]'
        );
    } catch(e) { return []; }
}

function _getLastProgress(animeId, pkg) {
    try {
        if (typeof NativeStorage === 'undefined') return null;
        const data = JSON.parse(
            NativeStorage.getLastWatched(animeId, pkg) || '{}'
        );
        return Object.keys(data).length > 0 ? data : null;
    } catch(e) { return null; }
}

function _updateLastWatched(animeId, pkg) {
    if (typeof NativeStorage === 'undefined') return;
    NativeStorage.updateLastWatched(animeId, pkg, Date.now());
}

function _parseGenres(genres) {
    try {
        if (typeof genres === 'string' && genres.startsWith('[')) {
            return JSON.parse(genres);
        }
        if (typeof genres === 'string') {
            return genres.split(',').map(g => g.trim()).filter(Boolean);
        }
        return Array.isArray(genres) ? genres : [];
    } catch(e) { return []; }
}

// Inject CSS tambahan
(function injectDetailStyles() {
    if (document.getElementById('detail-styles')) return;
    const style = document.createElement('style');
    style.id = 'detail-styles';
    style.textContent = `
        .meta-chip {
            padding: 3px 10px;
            background: var(--color-card);
            border-radius: 50px;
            font-size: 12px;
            color: var(--color-text-sub);
        }
        .episode-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            cursor: pointer;
            transition: background 0.15s;
            border-bottom: 1px solid var(--color-border);
        }
        .episode-item:active {
            background: var(--color-card);
        }
        .episode-item.watched {
            opacity: 0.6;
        }
    `;
    document.head.appendChild(style);
})();