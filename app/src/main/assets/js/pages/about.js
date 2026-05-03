// ── ABOUT ──────────────────────────────────────

Pages.about = (container) => {
    container.innerHTML = `
        <div class="page-header">
            <button class="header-btn" onclick="Router.back()">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="page-title">Tentang</span>
        </div>

        <!-- Logo + nama -->
        <div style="display:flex;flex-direction:column;
            align-items:center;padding:32px 16px 24px;gap:12px">
            <div class="more-logo-placeholder">N</div>
            <div style="font-size:24px;font-weight:700">
                Nakama
            </div>
            <div style="font-size:13px;color:var(--color-text-sub)">
                Versi ${Config.version}
            </div>
            <div style="font-size:13px;color:var(--color-text-sub);
                text-align:center;max-width:280px;line-height:1.5">
                Aplikasi streaming anime hybrid berbasis WebView
                dengan sistem extension.
            </div>
        </div>

        <div class="menu-divider"></div>

        <!-- Links -->
        <button class="menu-item" onclick="openLink('https://github.com/user/nakama')">
            <svg viewBox="0 0 24 24"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>
            GitHub — App
        </button>

        <button class="menu-item" onclick="openLink('https://github.com/user/nakama-extensions')">
            <svg viewBox="0 0 24 24"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>
            GitHub — Extensions
        </button>

        <button class="menu-item" onclick="openLink('https://github.com/user/nakama/issues')">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            Laporkan Bug
        </button>

        <div class="menu-divider"></div>

        <!-- Open Source -->
        <div style="padding:16px">
            <div style="font-size:12px;font-weight:700;
                color:var(--color-text-sub);
                text-transform:uppercase;
                letter-spacing:0.5px;margin-bottom:12px">
                Open Source
            </div>
            ${_ossItem('OkHttp', 'Square', 'Apache 2.0')}
            ${_ossItem('NiceHttp', 'Blatzar', 'Apache 2.0')}
            ${_ossItem('Coil', 'Coil Contributors', 'Apache 2.0')}
            ${_ossItem('Timber', 'Jake Wharton', 'Apache 2.0')}
            ${_ossItem('ExoPlayer / Media3', 'Google', 'Apache 2.0')}
            ${_ossItem('Room', 'Google / AndroidX', 'Apache 2.0')}
            ${_ossItem('Cloudstream3', 'recloudstream', 'GPL-3.0')}
        </div>

        <div class="menu-divider"></div>

        <!-- Build info -->
        <div style="padding:16px;
            font-size:12px;color:var(--color-text-sub);
            line-height:1.8">
            <div>Versi: <strong>${Config.version}</strong></div>
            <div>Platform: Android WebView Hybrid</div>
            <div>Network: Port Cloudstream3 (GPL-3.0)</div>
        </div>

        <div style="height:16px"></div>
    `;
};

function _ossItem(name, author, license) {
    return `
        <div style="display:flex;justify-content:space-between;
            align-items:center;padding:8px 0;
            border-bottom:1px solid var(--color-border)">
            <div>
                <div style="font-size:13px;
                    color:var(--color-text)">${name}</div>
                <div style="font-size:12px;
                    color:var(--color-text-sub)">${author}</div>
            </div>
            <span style="font-size:11px;
                color:var(--color-text-sub);
                background:var(--color-card);
                padding:3px 8px;border-radius:50px">
                ${license}
            </span>
        </div>`;
}

function openLink(url) {
    Log.d('About', `Open: ${url}`);
    // TODO: open via external browser bridge
}