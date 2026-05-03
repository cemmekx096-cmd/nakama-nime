// ── SETTINGS ───────────────────────────────────

// ══════════════════════════════════════════════
// HALAMAN LAINNYA (More)
// ══════════════════════════════════════════════

Pages.more = (container) => {
    const incognito   = _getSetting('incognito_global') === 'true';
    const dlOnly      = _getSetting('download_only') === 'true';

    container.innerHTML = `
        <!-- Logo -->
        <div class="more-logo-area">
            <div class="more-logo-placeholder">N</div>
        </div>

        <!-- Toggle: Download only -->
        ${_toggleRow(
            `<svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>`,
            'Hanya yang sudah diunduh',
            'Saring semua entri di perpustakaan',
            'download_only',
            dlOnly
        )}

        <!-- Toggle: Mode penyamaran global -->
        ${_toggleRow(
            `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
            'Mode penyamaran',
            'Jeda riwayat untuk semua sumber',
            'incognito_global',
            incognito
        )}

        <div class="menu-divider"></div>

        <!-- Menu items -->
        <button class="menu-item"
            onclick="Router.navigate('downloads')">
            <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Antrean unduhan
        </button>

        <button class="menu-item"
            onclick="Router.navigate('settings')">
            <svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
            Pengaturan
        </button>

        <button class="menu-item"
            onclick="Router.navigate('backup')">
            <svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.07-.44.18-.88.18-1.5 0-2.76-2.24-5-5-5-1.7 0-3.19.88-4.06 2.21L8 3 6.94 4.06 5.5 2.62C4.32 3.5 3.5 4.88 3.5 6.5H2c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM12 1.5c1.93 0 3.5 1.57 3.5 3.5 0 .62-.11 1.06-.18 1.5H8.68C8.61 6.06 8.5 5.62 8.5 5c0-1.93 1.57-3.5 3.5-3.5z"/></svg>
            Data dan penyimpanan
        </button>

        <div class="menu-divider"></div>

        <button class="menu-item"
            onclick="Router.navigate('about')">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            Tentang
        </button>

        <button class="menu-item" onclick="sendLog()">
            <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            Kirim log
        </button>

        <button class="menu-item" onclick="showHelp()">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
            Bantuan
        </button>

        <div style="height:16px"></div>
    `;
};

// ══════════════════════════════════════════════
// HALAMAN PENGATURAN
// ══════════════════════════════════════════════

Pages.settings = (container) => {
    container.innerHTML = `
        <div class="page-header" style="position:sticky;
            top:0;background:var(--color-bg);z-index:50">
            <button class="header-btn" onclick="Router.back()">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="page-title">Pengaturan</span>
        </div>

        <!-- TAMPILAN -->
        ${_sectionHeader('Tampilan')}

        ${_settingItem(
            `<svg viewBox="0 0 24 24"><path d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/></svg>`,
            'Tema',
            _getThemeLabel(),
            () => showThemeSettings()
        )}

        ${_settingItem(
            `<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>`,
            'Mode tampilan',
            _getCardModeLabel(),
            () => showCardModeSettings()
        )}

        <div class="menu-divider"></div>

        <!-- PLAYER -->
        ${_sectionHeader('Player')}

        ${_settingItem(
            `<svg viewBox="0 0 24 24"><path d="M10 8v8l6-4z"/></svg>`,
            'Kualitas default',
            _getSetting('default_quality') || 'Auto',
            () => showQualitySettings()
        )}

        ${_settingItem(
            `<svg viewBox="0 0 24 24"><path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/></svg>`,
            'Durasi skip intro',
            `${_getSetting('skip_intro_duration') || '85'} detik`,
            () => showSkipDurationSettings()
        )}

        ${_toggleRow(
            `<svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>`,
            'Lanjut episode otomatis',
            'Putar episode berikutnya secara otomatis',
            'autoplay_next',
            _getSetting('autoplay_next') !== 'false'
        )}

        <div class="menu-divider"></div>

        <!-- NETWORK -->
        ${_sectionHeader('Jaringan')}

        ${_settingItem(
            `<svg viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>`,
            'Penyedia DNS',
            _getDnsLabel(),
            () => showDnsSettings()
        )}

        ${_settingItem(
            `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
            'Agen pengguna',
            _getUALabel(),
            () => showUASettings()
        )}

        ${_settingItem(
            `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
            'Jeda antar request',
            `${_getSetting('rate_limit_ms') || '1500'} ms`,
            () => showRateLimitSettings()
        )}

        <div class="menu-divider"></div>

        <!-- EXTENSION REPO -->
        ${_sectionHeader('Ekstensi')}

        ${_settingItem(
            `<svg viewBox="0 0 24 24"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>`,
            'Repo default',
            _getSetting('repo_url') || 'Default',
            () => showRepoSettings()
        )}

        <div style="height:16px"></div>
    `;
};

// ══════════════════════════════════════════════
// HALAMAN DOWNLOADS
// ══════════════════════════════════════════════

Pages.downloads = (container) => {
    container.innerHTML = `
        <div class="page-header">
            <button class="header-btn" onclick="Router.back()">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="page-title">Unduhan</span>
        </div>
        <div id="downloads-content">
            <div style="padding:32px;text-align:center">
                <div class="loading-spinner" style="margin:auto"></div>
            </div>
        </div>
    `;

    _loadDownloads();
};

function _loadDownloads() {
    const content = document.getElementById('downloads-content');
    if (!content) return;

    try {
        if (typeof NativePlayer === 'undefined') {
            content.innerHTML = _emptyDownloads();
            return;
        }

        const files = JSON.parse(
            NativePlayer.getDownloadedFiles() || '[]'
        );

        if (files.length === 0) {
            content.innerHTML = _emptyDownloads();
            return;
        }

        content.innerHTML = `
            <div style="padding:8px 16px 4px;
                font-size:13px;color:var(--color-text-sub)">
                ${files.length} file ·
                ${_getTotalDlSize(files)}
            </div>
            ${files.map(f => `
                <div class="ext-item">
                    <div style="width:40px;height:40px;
                        background:var(--color-card);
                        border-radius:var(--radius-sm);
                        display:flex;align-items:center;
                        justify-content:center;flex-shrink:0">
                        <svg width="20" height="20"
                            viewBox="0 0 24 24"
                            fill="var(--color-primary)">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                    </div>
                    <div class="ext-info">
                        <div class="ext-name">${f.name}</div>
                        <div class="ext-meta">
                            ${f.sizeStr} · ${f.extension.toUpperCase()}
                        </div>
                    </div>
                    <div class="ext-actions">
                        <button class="ext-btn"
                            onclick="playDownload('${f.path}')">
                            <svg viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </button>
                        <button class="ext-btn uninstall"
                            onclick="deleteDownload('${f.path}')">
                            <svg viewBox="0 0 24 24">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                        </button>
                    </div>
                </div>`).join('')}`;

    } catch(e) {
        content.innerHTML = _emptyDownloads();
        Log.e('Downloads', e.message);
    }
}

function _emptyDownloads() {
    return `<div class="empty-state">
        <div class="empty-icon">📥</div>
        <div class="empty-title">Belum ada unduhan</div>
        <div class="empty-desc">
            Episode yang diunduh akan muncul di sini
        </div>
    </div>`;
}

function playDownload(filePath) {
    Router.navigate('episode-player', {
        episodeId: filePath,
        animeId:   '',
        pkg:       '',
        episodes:  [],
        resumeMs:  0
    });
}

function deleteDownload(filePath) {
    const ok = confirm('Hapus file unduhan ini?');
    if (!ok) return;

    if (typeof NativePlayer !== 'undefined') {
        const deleted = NativePlayer.deleteDownload(filePath);
        if (deleted) {
            _loadDownloads();
            Log.i('Downloads', `Deleted: ${filePath}`);
        } else {
            alert('Gagal menghapus file');
        }
    }
}

function _getTotalDlSize(files) {
    const total = files.reduce((sum, f) => sum + (f.size || 0), 0);
    if (total >= 1024*1024*1024)
        return `${(total/1024/1024/1024).toFixed(1)} GB`;
    if (total >= 1024*1024)
        return `${(total/1024/1024).toFixed(1)} MB`;
    return `${(total/1024).toFixed(1)} KB`;
}

// ══════════════════════════════════════════════
// SETTING DIALOGS (Bottom Sheet)
// ══════════════════════════════════════════════

function showThemeSettings() {
    const current = _getSetting('theme_mode') || '0';
    _showBottomSheet([
        {
            icon: _checkIcon(current === '0'),
            label: 'Ikuti sistem',
            action: () => {
                _setSetting('theme_mode', '0');
                _applyThemeFromSettings();
            }
        },
        {
            icon: _checkIcon(current === '1'),
            label: 'Terang',
            action: () => {
                _setSetting('theme_mode', '1');
                _applyThemeFromSettings();
            }
        },
        {
            icon: _checkIcon(current === '2'),
            label: 'Gelap',
            action: () => {
                _setSetting('theme_mode', '2');
                _applyThemeFromSettings();
            }
        },
        {
            icon: _checkIcon(current === '3'),
            label: 'Hitam pekat (AMOLED)',
            action: () => {
                _setSetting('theme_mode', '3');
                _applyThemeFromSettings();
            }
        }
    ], 'Tema');
}

function showCardModeSettings() {
    const current = _getSetting('card_mode') || 'compact';
    _showBottomSheet([
        {
            icon: _checkIcon(current === 'compact'),
            label: 'Grid Kompak',
            action: () => {
                _setSetting('card_mode', 'compact');
                _refreshSettings();
            }
        },
        {
            icon: _checkIcon(current === 'comfortable'),
            label: 'Grid Nyaman',
            action: () => {
                _setSetting('card_mode', 'comfortable');
                _refreshSettings();
            }
        },
        {
            icon: _checkIcon(current === 'list'),
            label: 'Daftar',
            action: () => {
                _setSetting('card_mode', 'list');
                _refreshSettings();
            }
        }
    ], 'Mode Tampilan');
}

function showQualitySettings() {
    const current = _getSetting('default_quality') || 'Auto';
    const options = ['Auto', '1080p', '720p', '480p', '360p'];
    _showBottomSheet(
        options.map(q => ({
            icon: _checkIcon(current === q),
            label: q,
            action: () => {
                _setSetting('default_quality', q);
                _refreshSettings();
            }
        })),
        'Kualitas Default'
    );
}

function showSkipDurationSettings() {
    const current = _getSetting('skip_intro_duration') || '85';
    const options = ['60', '85', '90', '120'];

    _showInputSheet(
        'Durasi Skip Intro',
        'Detik',
        current,
        (val) => {
            const n = parseInt(val);
            if (isNaN(n) || n < 1) return;
            _setSetting('skip_intro_duration', String(n));
            _refreshSettings();
        },
        options
    );
}

function showDnsSettings() {
    const current = _getSetting('dns_provider') || '0';
    const options = [
        { id: '0', name: 'Sistem (default)' },
        { id: '1', name: 'Google (8.8.8.8)' },
        { id: '2', name: 'Cloudflare (1.1.1.1)' },
        { id: '3', name: 'AdGuard' },
        { id: '4', name: 'DNS.Watch' },
        { id: '5', name: 'Quad9' }
    ];

    _showBottomSheet(
        options.map(o => ({
            icon: _checkIcon(current === o.id),
            label: o.name,
            action: () => {
                _setSetting('dns_provider', o.id);
                if (typeof NativeNetwork !== 'undefined') {
                    NativeNetwork.setDnsProvider(parseInt(o.id));
                    NativeNetwork.rebuildClient();
                }
                _refreshSettings();
            }
        })),
        'Penyedia DNS'
    );
}

function showUASettings() {
    const current = _getSetting('user_agent_type') || 'mobile';
    _showBottomSheet([
        {
            icon: _checkIcon(current === 'mobile'),
            label: 'Mobile (default)',
            action: () => {
                _setSetting('user_agent_type', 'mobile');
                if (typeof NativeNetwork !== 'undefined') {
                    NativeNetwork.setUserAgent('mobile', '');
                }
                _refreshSettings();
            }
        },
        {
            icon: _checkIcon(current === 'desktop'),
            label: 'Desktop',
            action: () => {
                _setSetting('user_agent_type', 'desktop');
                if (typeof NativeNetwork !== 'undefined') {
                    NativeNetwork.setUserAgent('desktop', '');
                }
                _refreshSettings();
            }
        },
        {
            icon: _checkIcon(current === 'custom'),
            label: 'Custom',
            action: () => {
                const ua = prompt('Masukkan User Agent:',
                    _getSetting('user_agent') || '');
                if (ua) {
                    _setSetting('user_agent_type', 'custom');
                    _setSetting('user_agent', ua);
                    if (typeof NativeNetwork !== 'undefined') {
                        NativeNetwork.setUserAgent('custom', ua);
                    }
                    _refreshSettings();
                }
            }
        }
    ], 'Agen Pengguna');
}

function showRateLimitSettings() {
    const current = _getSetting('rate_limit_ms') || '1500';
    const options = ['500', '1000', '1500', '2000', '3000'];

    _showInputSheet(
        'Jeda Antar Request',
        'Milliseconds',
        current,
        (val) => {
            const n = parseInt(val);
            if (isNaN(n) || n < 100) return;
            _setSetting('rate_limit_ms', String(n));
            if (typeof NativeNetwork !== 'undefined') {
                NativeNetwork.setRateLimit(n);
            }
            _refreshSettings();
        },
        options
    );
}

function showRepoSettings() {
    const current = _getSetting('repo_url') || Config.defaultRepoUrl;
    const val = prompt('URL Repo Extension:', current);
    if (val && val.trim()) {
        _setSetting('repo_url', val.trim());
        _refreshSettings();
    }
}

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════

function _sectionHeader(title) {
    return `<div style="padding:12px 16px 4px;
        font-size:12px;font-weight:700;
        color:var(--color-text-sub);
        text-transform:uppercase;
        letter-spacing:0.5px">
        ${title}
    </div>`;
}

function _settingItem(icon, title, value, onclick) {
    return `
        <button class="menu-item" onclick="(${onclick})()">
            ${icon}
            <div style="flex:1;text-align:left">
                <div style="font-size:15px;
                    color:var(--color-text)">${title}</div>
                <div style="font-size:12px;
                    color:var(--color-text-sub);
                    margin-top:1px">${value}</div>
            </div>
            <svg width="16" height="16"
                viewBox="0 0 24 24"
                fill="var(--color-text-sub)">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
        </button>`;
}

function _toggleRow(icon, title, desc, settingKey, checked) {
    return `
        <label class="toggle-row">
            <svg class="toggle-row-icon" viewBox="0 0 24 24">
                ${icon}
            </svg>
            <div class="toggle-info">
                <div class="toggle-title">${title}</div>
                <div class="toggle-desc">${desc}</div>
            </div>
            <label class="toggle">
                <input type="checkbox"
                    ${checked ? 'checked' : ''}
                    onchange="onToggleChange('${settingKey}',this.checked)">
                <span class="toggle-track"></span>
            </label>
        </label>`;
}

function onToggleChange(key, value) {
    _setSetting(key, String(value));
    Log.d('Settings', `${key} = ${value}`);
}

function _checkIcon(isChecked) {
    return isChecked
        ? `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
        : `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
}

function _refreshSettings() {
    Pages.settings(document.getElementById('page-container'));
}

function _applyThemeFromSettings() {
    const mode = _getSetting('theme_mode') || '0';
    const theme = { '0':'dark','1':'light','2':'dark','3':'black' }[mode] || 'dark';
    applyTheme(theme);
    _refreshSettings();
}

// Labels untuk display
function _getThemeLabel() {
    const mode = _getSetting('theme_mode') || '0';
    return {
        '0': 'Ikuti sistem',
        '1': 'Terang',
        '2': 'Gelap',
        '3': 'Hitam pekat'
    }[mode] || 'Ikuti sistem';
}

function _getCardModeLabel() {
    return {
        'compact':     'Grid Kompak',
        'comfortable': 'Grid Nyaman',
        'list':        'Daftar'
    }[_getSetting('card_mode')] || 'Grid Kompak';
}

function _getDnsLabel() {
    return {
        '0': 'Sistem',
        '1': 'Google',
        '2': 'Cloudflare',
        '3': 'AdGuard',
        '4': 'DNS.Watch',
        '5': 'Quad9'
    }[_getSetting('dns_provider')] || 'Sistem';
}

function _getUALabel() {
    return {
        'mobile':  'Mobile',
        'desktop': 'Desktop',
        'custom':  'Custom'
    }[_getSetting('user_agent_type')] || 'Mobile';
}

// Input sheet — untuk setting yang butuh input angka
function _showInputSheet(title, unit, current, onSave, presets = []) {
    _showBottomSheet([
        ...presets.map(p => ({
            icon: _checkIcon(current === p),
            label: `${p} ${unit}`,
            action: () => onSave(p)
        })),
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
            label: 'Custom...',
            action: () => {
                const val = prompt(`${title} (${unit}):`, current);
                if (val) onSave(val);
            }
        }
    ], title);
}

// More page helpers
function sendLog() {
    Log.i('More', 'Send log');
    alert('Fitur kirim log akan segera tersedia');
}

function showHelp() {
    openLink('https://github.com/user/nakama#readme');
}