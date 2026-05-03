// ── EPISODE PLAYER ─────────────────────────────

let _playerState = {
    episodeId:    null,
    animeId:      null,
    pkg:          null,
    episodes:     [],
    currentIndex: 0,
    resumeMs:     0,
    isOnline:     true,
    videoUrl:     null,
    referer:      null,
    progressTimer: null
};

Pages.episodePlayer = async (container, params) => {
    const { episodeId, animeId, pkg, episodes, resumeMs } = params;

    // Update state
    _playerState.episodeId    = episodeId;
    _playerState.animeId      = animeId;
    _playerState.pkg          = pkg;
    _playerState.episodes     = episodes || [];
    _playerState.resumeMs     = resumeMs || 0;
    _playerState.currentIndex = episodes?.findIndex(e => e.episodeId === episodeId) ?? 0;

    container.innerHTML = _playerLayout(episodeId, episodes);

    // Inject player styles
    _injectPlayerStyles();

    // Load video URL
    await _loadVideo(episodeId, pkg);
};

// ── LAYOUT ─────────────────────────────────────

function _playerLayout(episodeId, episodes) {
    const ep    = episodes?.find(e => e.episodeId === episodeId);
    const title = ep
        ? `Episode ${ep.number}${ep.title ? ` - ${ep.title}` : ''}`
        : episodeId;

    return `
        <!-- Player container — fullscreen -->
        <div id="player-root" style="
            position:fixed;inset:0;
            background:#000;z-index:500;
            display:flex;flex-direction:column">

            <!-- Video area -->
            <div id="video-area" style="
                flex:1;position:relative;
                display:flex;align-items:center;
                justify-content:center;
                background:#000">

                <!-- WebView embed player (online) -->
                <iframe id="embed-frame"
                    style="display:none;width:100%;
                        height:100%;border:none"
                    allowfullscreen
                    webkitallowfullscreen
                    allow="autoplay; fullscreen">
                </iframe>

                <!-- Loading overlay -->
                <div id="player-loading"
                    style="position:absolute;inset:0;
                        display:flex;align-items:center;
                        justify-content:center;
                        background:rgba(0,0,0,0.7)">
                    <div class="loading-spinner"
                        style="width:48px;height:48px;border-width:4px;
                            border-top-color:white"></div>
                </div>

                <!-- Gesture overlay — tap kiri/kanan, swipe -->
                <div id="gesture-left"
                    style="position:absolute;left:0;top:0;
                        width:40%;height:100%;z-index:10"
                    onclick="handleTapLeft()"
                    ontouchstart="handleTouchStart(event)"
                    ontouchmove="handleTouchMove(event,'left')"
                    ontouchend="handleTouchEnd(event,'left')">
                    <!-- Skip indicator kiri -->
                    <div id="skip-left" style="
                        display:none;position:absolute;
                        left:16px;top:50%;transform:translateY(-50%);
                        background:rgba(0,0,0,0.6);
                        border-radius:50px;padding:8px 16px;
                        color:white;font-size:14px;font-weight:700">
                        ◀◀ <span id="skip-left-sec">10</span>s
                    </div>
                </div>

                <div id="gesture-right"
                    style="position:absolute;right:0;top:0;
                        width:40%;height:100%;z-index:10"
                    onclick="handleTapRight()"
                    ontouchstart="handleTouchStart(event)"
                    ontouchmove="handleTouchMove(event,'right')"
                    ontouchend="handleTouchEnd(event,'right')">
                    <!-- Skip indicator kanan -->
                    <div id="skip-right" style="
                        display:none;position:absolute;
                        right:16px;top:50%;transform:translateY(-50%);
                        background:rgba(0,0,0,0.6);
                        border-radius:50px;padding:8px 16px;
                        color:white;font-size:14px;font-weight:700">
                        <span id="skip-right-sec">10</span>s ▶▶
                    </div>
                </div>

                <!-- Tap tengah → toggle controls -->
                <div id="gesture-center"
                    style="position:absolute;left:40%;
                        width:20%;height:100%;z-index:10"
                    onclick="toggleControls()">
                </div>

                <!-- Controls overlay -->
                <div id="player-controls" style="
                    position:absolute;inset:0;
                    display:flex;flex-direction:column;
                    justify-content:space-between;
                    background:linear-gradient(
                        rgba(0,0,0,0.6) 0%,
                        transparent 30%,
                        transparent 70%,
                        rgba(0,0,0,0.7) 100%);
                    z-index:20;opacity:0;
                    transition:opacity 0.3s;
                    pointer-events:none">

                    <!-- Top bar -->
                    <div style="display:flex;align-items:center;
                        padding:12px 8px;gap:4px">
                        <button class="player-btn"
                            onclick="closePlayer()"
                            style="pointer-events:auto">
                            <svg viewBox="0 0 24 24" fill="white">
                                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                            </svg>
                        </button>
                        <span style="flex:1;color:white;
                            font-size:14px;font-weight:600;
                            padding:0 8px;
                            white-space:nowrap;overflow:hidden;
                            text-overflow:ellipsis">
                            ${title}
                        </span>
                        <button class="player-btn"
                            onclick="showPlayerMenu()"
                            style="pointer-events:auto">
                            <svg viewBox="0 0 24 24" fill="white">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                            </svg>
                        </button>
                    </div>

                    <!-- Center play/pause -->
                    <div style="display:flex;justify-content:center;
                        gap:32px;align-items:center">
                        <button class="player-btn-lg"
                            onclick="prevEpisode()"
                            style="pointer-events:auto">
                            <svg viewBox="0 0 24 24" fill="white">
                                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                            </svg>
                        </button>
                        <button id="btn-play-pause"
                            class="player-btn-lg"
                            onclick="togglePlayPause()"
                            style="pointer-events:auto;
                                width:64px;height:64px">
                            <svg id="icon-play-pause"
                                viewBox="0 0 24 24" fill="white">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </button>
                        <button class="player-btn-lg"
                            onclick="nextEpisode()"
                            style="pointer-events:auto">
                            <svg viewBox="0 0 24 24" fill="white">
                                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                            </svg>
                        </button>
                    </div>

                    <!-- Bottom bar -->
                    <div style="padding:8px 16px 16px">
                        <!-- Progress bar -->
                        <div id="progress-wrap"
                            style="display:flex;align-items:center;
                                gap:8px;margin-bottom:8px">
                            <span id="time-current"
                                style="color:white;font-size:12px;
                                    width:40px;text-align:right">
                                0:00
                            </span>
                            <div id="progress-bar-bg"
                                style="flex:1;height:3px;
                                    background:rgba(255,255,255,0.3);
                                    border-radius:2px;cursor:pointer;
                                    pointer-events:auto"
                                onclick="seekFromBar(event)">
                                <div id="progress-bar-fill"
                                    style="height:100%;width:0%;
                                        background:var(--color-primary);
                                        border-radius:2px;
                                        pointer-events:none">
                                </div>
                            </div>
                            <span id="time-total"
                                style="color:white;font-size:12px;
                                    width:40px">
                                0:00
                            </span>
                        </div>

                        <!-- Action buttons -->
                        <div style="display:flex;
                            align-items:center;gap:4px">
                            <!-- Skip intro -->
                            <button onclick="skipIntro()"
                                style="pointer-events:auto;
                                    background:rgba(255,255,255,0.15);
                                    border:1px solid rgba(255,255,255,0.4);
                                    color:white;border-radius:6px;
                                    padding:5px 10px;font-size:12px;
                                    cursor:pointer">
                                +85s Skip Intro
                            </button>

                            <div style="flex:1"></div>

                            <!-- Kualitas -->
                            <button id="btn-quality"
                                onclick="showQualityMenu()"
                                style="pointer-events:auto;
                                    background:rgba(255,255,255,0.15);
                                    border:1px solid rgba(255,255,255,0.4);
                                    color:white;border-radius:6px;
                                    padding:5px 10px;font-size:12px;
                                    cursor:pointer">
                                HD
                            </button>

                            <!-- Rotate / fullscreen -->
                            <button onclick="toggleOrientation()"
                                style="pointer-events:auto"
                                class="player-btn">
                                <svg viewBox="0 0 24 24" fill="white">
                                    <path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-6.25-.77c-.59-.59-1.54-.59-2.12 0L1.75 8.11c-.59.59-.59 1.54 0 2.12l12.02 12.02c.59.59 1.54.59 2.12 0l6.36-6.36c.59-.59.59-1.54 0-2.12L10.23 1.75zm4.6 19.44L2.81 9.17l6.36-6.36 12.02 12.02-6.36 6.36zm-7.31.29C4.25 19.94 1.91 16.76 1.55 13H.05C.56 19.16 5.71 24 12 24l.66-.03-3.81-3.81-1.33 1.32z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Brightness indicator -->
                <div id="brightness-indicator"
                    style="display:none;position:absolute;
                        left:16px;top:50%;transform:translateY(-50%);
                        background:rgba(0,0,0,0.7);
                        border-radius:8px;padding:8px 12px;
                        color:white;font-size:13px;
                        flex-direction:column;gap:6px;
                        align-items:center">
                    ☀️
                    <div style="width:4px;height:80px;
                        background:rgba(255,255,255,0.3);
                        border-radius:2px;position:relative">
                        <div id="brightness-bar"
                            style="position:absolute;bottom:0;
                                width:100%;background:white;
                                border-radius:2px;height:50%">
                        </div>
                    </div>
                </div>

                <!-- Volume indicator -->
                <div id="volume-indicator"
                    style="display:none;position:absolute;
                        right:16px;top:50%;transform:translateY(-50%);
                        background:rgba(0,0,0,0.7);
                        border-radius:8px;padding:8px 12px;
                        color:white;font-size:13px;
                        flex-direction:column;gap:6px;
                        align-items:center">
                    🔊
                    <div style="width:4px;height:80px;
                        background:rgba(255,255,255,0.3);
                        border-radius:2px;position:relative">
                        <div id="volume-bar"
                            style="position:absolute;bottom:0;
                                width:100%;background:white;
                                border-radius:2px;height:70%">
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `;
}

// ── LOAD VIDEO ─────────────────────────────────

async function _loadVideo(episodeId, pkg) {
    try {
        const ext = await _loadExtension(pkg);
        if (!ext) throw new Error('Extension tidak tersedia');

        const videos = await ext.getVideos(episodeId);
        if (!videos || videos.length === 0) {
            throw new Error('Tidak ada video tersedia');
        }

        // Ambil video pertama / terbaik
        const video = videos[0];
        _playerState.videoUrl = video.url;
        _playerState.referer  = video.referer || '';
        _playerState.isOnline = video.type !== 'mp4_local';

        Log.d('Player', `Loading: ${video.url} (type: ${video.type})`);

        if (video.type === 'embed') {
            _loadEmbed(video.url, video.referer);
        } else if (video.type === 'mp4') {
            _loadOffline(video.url);
        } else {
            // Default ke embed
            _loadEmbed(video.url, video.referer);
        }

        // Multi-quality — simpan semua opsi
        if (videos.length > 1) {
            _playerState.qualities = videos;
            const qualityBtn = document.getElementById('btn-quality');
            if (qualityBtn) qualityBtn.style.display = 'block';
        }

    } catch(e) {
        _hideLoading();
        Log.e('Player', `loadVideo error: ${e.message}`);
        _showPlayerError(e.message);
    }
}

function _loadEmbed(url, referer) {
    const frame = document.getElementById('embed-frame');
    if (!frame) return;

    frame.style.display = 'block';
    frame.src           = url;

    frame.onload = () => {
        _hideLoading();
        _showControls();
        _startControlsTimeout();
        _startProgressLoop();
        Log.d('Player', 'Embed loaded');
    };
}

function _loadOffline(filePath) {
    if (typeof NativePlayer === 'undefined') {
        _showPlayerError('NativePlayer tidak tersedia');
        return;
    }

    const { id, promise } = NativeCallback.create();
    NativePlayer.playOffline(filePath, _playerState.resumeMs, id);

    promise.then(result => {
        if (result.event === 'error') {
            _showPlayerError(result.error);
        } else if (result.event === 'progress') {
            _updateProgressUI(result.position, result.duration);
        } else if (result.event === 'ended') {
            _onVideoEnded();
        }
        _hideLoading();
    });
}

// ── CONTROLS ───────────────────────────────────

let _controlsVisible   = false;
let _controlsTimeout   = null;
let _tapLeftCount      = 0;
let _tapRightCount     = 0;
let _tapLeftTimeout    = null;
let _tapRightTimeout   = null;

function toggleControls() {
    _controlsVisible = !_controlsVisible;
    _setControlsVisible(_controlsVisible);
    if (_controlsVisible) _startControlsTimeout();
}

function _showControls() {
    _controlsVisible = true;
    _setControlsVisible(true);
}

function _setControlsVisible(visible) {
    const ctrl = document.getElementById('player-controls');
    if (!ctrl) return;
    ctrl.style.opacity       = visible ? '1' : '0';
    ctrl.style.pointerEvents = visible ? 'auto' : 'none';
}

function _startControlsTimeout() {
    clearTimeout(_controlsTimeout);
    _controlsTimeout = setTimeout(() => {
        _controlsVisible = false;
        _setControlsVisible(false);
    }, 3000);
}

// ── TAP SKIP ───────────────────────────────────

function handleTapLeft() {
    _tapLeftCount++;
    const secs = _tapLeftCount * 10;

    const indicator = document.getElementById('skip-left');
    const label     = document.getElementById('skip-left-sec');
    if (indicator) indicator.style.display = 'flex';
    if (label) label.textContent = secs;

    // Seek
    _seekRelative(-10000);

    // Reset setelah 800ms tanpa tap
    clearTimeout(_tapLeftTimeout);
    _tapLeftTimeout = setTimeout(() => {
        _tapLeftCount = 0;
        if (indicator) indicator.style.display = 'none';
    }, 800);
}

function handleTapRight() {
    _tapRightCount++;
    const secs = _tapRightCount * 10;

    const indicator = document.getElementById('skip-right');
    const label     = document.getElementById('skip-right-sec');
    if (indicator) indicator.style.display = 'flex';
    if (label) label.textContent = secs;

    _seekRelative(10000);

    clearTimeout(_tapRightTimeout);
    _tapRightTimeout = setTimeout(() => {
        _tapRightCount = 0;
        if (indicator) indicator.style.display = 'none';
    }, 800);
}

// ── SWIPE GESTURE (brightness & volume) ────────

let _touchStartY  = 0;
let _touchStartX  = 0;

function handleTouchStart(e) {
    _touchStartY = e.touches[0].clientY;
    _touchStartX = e.touches[0].clientX;
}

function handleTouchMove(e, side) {
    const deltaY = _touchStartY - e.touches[0].clientY;
    const deltaX = Math.abs(_touchStartX - e.touches[0].clientX);

    // Hanya process kalau swipe vertikal
    if (Math.abs(deltaY) < deltaX) return;

    const percent = Math.max(0, Math.min(100,
        50 + (deltaY / window.innerHeight * 100)
    ));

    if (side === 'left') {
        _showBrightnessIndicator(percent);
    } else {
        _showVolumeIndicator(percent);
    }
}

function handleTouchEnd(e, side) {
    setTimeout(() => {
        document.getElementById('brightness-indicator').style.display = 'none';
        document.getElementById('volume-indicator').style.display = 'none';
    }, 1000);
}

function _showBrightnessIndicator(percent) {
    const el  = document.getElementById('brightness-indicator');
    const bar = document.getElementById('brightness-bar');
    if (el)  el.style.display  = 'flex';
    if (bar) bar.style.height  = `${percent}%`;
}

function _showVolumeIndicator(percent) {
    const el  = document.getElementById('volume-indicator');
    const bar = document.getElementById('volume-bar');
    if (el)  el.style.display = 'flex';
    if (bar) bar.style.height = `${percent}%`;
}

// ── PLAYBACK CONTROLS ──────────────────────────

function togglePlayPause() {
    const icon = document.getElementById('icon-play-pause');
    const isPlaying = icon?.getAttribute('data-playing') === '1';

    if (isPlaying) {
        if (typeof NativePlayer !== 'undefined') NativePlayer.pause();
        if (icon) {
            icon.setAttribute('data-playing', '0');
            icon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
        }
    } else {
        if (typeof NativePlayer !== 'undefined') NativePlayer.resume();
        if (icon) {
            icon.setAttribute('data-playing', '1');
            icon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
        }
    }
}

function skipIntro() {
    const skipSecs = parseInt(_getSetting('skip_intro_duration') || '85');
    _seekRelative(skipSecs * 1000);
    Log.d('Player', `Skip intro: +${skipSecs}s`);
}

function _seekRelative(deltaMs) {
    if (typeof NativePlayer !== 'undefined') {
        const current = NativePlayer.getPosition();
        NativePlayer.seekTo(Math.max(0, current + deltaMs));
    }
}

function seekFromBar(e) {
    const bar      = document.getElementById('progress-bar-bg');
    if (!bar) return;
    const rect     = bar.getBoundingClientRect();
    const percent  = (e.clientX - rect.left) / rect.width;
    const duration = typeof NativePlayer !== 'undefined'
        ? NativePlayer.getDuration()
        : 0;
    if (duration > 0) {
        NativePlayer.seekTo(Math.floor(percent * duration));
    }
}

function nextEpisode() {
    const idx  = _playerState.currentIndex;
    const eps  = _playerState.episodes;
    if (idx < eps.length - 1) {
        _switchEpisode(eps[idx + 1]);
    }
}

function prevEpisode() {
    const idx = _playerState.currentIndex;
    const eps = _playerState.episodes;
    if (idx > 0) {
        _switchEpisode(eps[idx - 1]);
    }
}

function _switchEpisode(ep) {
    // Hentikan progress loop lama
    clearInterval(_playerState.progressTimer);

    // Reset iframe
    const frame = document.getElementById('embed-frame');
    if (frame) frame.src = '';

    // Update state
    _playerState.episodeId    = ep.episodeId;
    _playerState.currentIndex = _playerState.episodes.indexOf(ep);
    _playerState.resumeMs     = 0;

    // Tampil loading
    document.getElementById('player-loading').style.display = 'flex';

    // Load video baru
    _loadVideo(ep.episodeId, _playerState.pkg);

    Log.d('Player', `Switched to: ${ep.episodeId}`);
}

function toggleOrientation() {
    // Handled oleh CustomWebChromeClient di Kotlin
    Log.d('Player', 'Toggle orientation');
}

function closePlayer() {
    // Stop progress loop
    clearInterval(_playerState.progressTimer);

    // Stop player
    if (typeof NativePlayer !== 'undefined') NativePlayer.stop();

    // Hapus player dari DOM
    document.getElementById('player-root')?.remove();

    // Kembali ke halaman sebelumnya
    Router.back();
}

// ── PROGRESS LOOP ──────────────────────────────

function _startProgressLoop() {
    clearInterval(_playerState.progressTimer);

    _playerState.progressTimer = setInterval(() => {
        if (typeof NativePlayer === 'undefined') return;

        const pos      = NativePlayer.getPosition();
        const duration = NativePlayer.getDuration();

        _updateProgressUI(pos, duration);

        // Simpan progress ke DB
        if (_playerState.episodeId && pos > 0) {
            NativeStorage?.saveProgress(
                _playerState.animeId,
                _playerState.pkg,
                _playerState.episodeId,
                Math.floor(pos / 1000),   // ms → detik
                Math.floor(duration / 1000)
            );
        }

    }, Config.progressIntervalMs);
}

function _updateProgressUI(posMs, durationMs) {
    const fill    = document.getElementById('progress-bar-fill');
    const current = document.getElementById('time-current');
    const total   = document.getElementById('time-total');

    if (fill && durationMs > 0) {
        fill.style.width = `${(posMs / durationMs * 100).toFixed(1)}%`;
    }
    if (current) current.textContent = formatDuration(posMs / 1000);
    if (total)   total.textContent   = formatDuration(durationMs / 1000);
}

function _onVideoEnded() {
    Log.d('Player', 'Video ended');

    // Tandai episode selesai
    if (typeof NativeStorage !== 'undefined' && _playerState.episodeId) {
        NativeStorage.markWatched(
            _playerState.episodeId,
            _playerState.animeId,
            _playerState.pkg
        );
    }

    // Auto-play episode berikutnya
    const autoPlay = _getSetting('autoplay_next') !== 'false';
    if (autoPlay) {
        setTimeout(() => nextEpisode(), 1500);
    }
}

// ── QUALITY MENU ───────────────────────────────

function showQualityMenu() {
    const qualities = _playerState.qualities || [];
    if (qualities.length === 0) return;

    _showBottomSheet(
        qualities.map((v, i) => ({
            icon: `<svg viewBox="0 0 24 24"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>`,
            label: v.quality || `Kualitas ${i + 1}`,
            action: () => {
                _playerState.videoUrl = v.url;
                _loadEmbed(v.url, v.referer);
            }
        })),
        'Pilih Kualitas'
    );
}

function showPlayerMenu() {
    _showBottomSheet([
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2z"/></svg>`,
            label: 'Buka di browser',
            action: () => Log.d('Player', `Open: ${_playerState.videoUrl}`)
        },
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`,
            label: 'Unduh episode ini',
            action: () => Log.d('Player', 'Download — todo')
        },
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M10 8v8l6-4z"/></svg>`,
            label: 'Kecepatan putar',
            action: () => showSpeedMenu()
        }
    ]);
}

function showSpeedMenu() {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    _showBottomSheet(
        speeds.map(s => ({
            icon: `<svg viewBox="0 0 24 24"><path d="M10 8v8l6-4z"/></svg>`,
            label: `${s}x${s === 1.0 ? ' (Normal)' : ''}`,
            action: () => {
                if (typeof NativePlayer !== 'undefined') NativePlayer.setSpeed(s);
                Log.d('Player', `Speed: ${s}x`);
            }
        })),
        'Kecepatan Putar'
    );
}

// ── HELPERS ────────────────────────────────────

function _hideLoading() {
    const el = document.getElementById('player-loading');
    if (el) el.style.display = 'none';
}

function _showPlayerError(msg) {
    const area = document.getElementById('video-area');
    if (!area) return;
    area.innerHTML += `
        <div style="position:absolute;inset:0;
            display:flex;flex-direction:column;
            align-items:center;justify-content:center;
            background:rgba(0,0,0,0.8);
            color:white;text-align:center;padding:32px;
            gap:12px">
            <div style="font-size:32px">⚠️</div>
            <div style="font-size:15px;font-weight:600">
                Gagal memuat video
            </div>
            <div style="font-size:13px;
                color:rgba(255,255,255,0.7)">
                ${msg}
            </div>
            <button onclick="closePlayer()"
                style="margin-top:8px;padding:10px 24px;
                    background:white;color:black;
                    border:none;border-radius:50px;
                    font-size:14px;font-weight:600;
                    cursor:pointer">
                Kembali
            </button>
        </div>`;
}

// ── CSS ────────────────────────────────────────

function _injectPlayerStyles() {
    if (document.getElementById('player-styles')) return;
    const s = document.createElement('style');
    s.id = 'player-styles';
    s.textContent = `
        .player-btn {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            cursor: pointer;
            border-radius: 50%;
        }
        .player-btn svg {
            width: 22px;
            height: 22px;
        }
        .player-btn-lg {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.4);
            border: none;
            cursor: pointer;
            border-radius: 50%;
        }
        .player-btn-lg svg {
            width: 28px;
            height: 28px;
        }
    `;
    document.head.appendChild(s);
}