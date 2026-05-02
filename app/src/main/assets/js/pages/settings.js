Pages.more = (container) => {
    const incognito = typeof NativeStorage !== 'undefined'
        ? NativeStorage.getSetting('incognito_global') === 'true'
        : false;

    const downloadOnly = typeof NativeStorage !== 'undefined'
        ? NativeStorage.getSetting('download_only') === 'true'
        : false;

    container.innerHTML = `
        <!-- Logo area -->
        <div class="more-logo-area">
            <div class="more-logo-placeholder">N</div>
        </div>

        <!-- Toggle: Hanya yang sudah diunduh -->
        <label class="toggle-row">
            <svg class="toggle-row-icon" viewBox="0 0 24 24">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
            </svg>
            <div class="toggle-info">
                <div class="toggle-title">Hanya yang sudah diunduh</div>
                <div class="toggle-desc">Saring semua entri di perpustakaan</div>
            </div>
            <label class="toggle">
                <input type="checkbox" ${downloadOnly ? 'checked' : ''}
                    onchange="setSetting('download_only', this.checked)">
                <span class="toggle-track"></span>
            </label>
        </label>

        <!-- Toggle: Mode penyamaran global -->
        <label class="toggle-row">
            <svg class="toggle-row-icon" viewBox="0 0 24 24">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            <div class="toggle-info">
                <div class="toggle-title">Mode penyamaran</div>
                <div class="toggle-desc">Jeda riwayat untuk semua sumber</div>
            </div>
            <label class="toggle">
                <input type="checkbox" ${incognito ? 'checked' : ''}
                    onchange="setSetting('incognito_global', this.checked)">
                <span class="toggle-track"></span>
            </label>
        </label>

        <div class="menu-divider"></div>

        <!-- Menu items -->
        <button class="menu-item" onclick="Router.navigate('downloads')">
            <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Antrean unduhan
        </button>

        <button class="menu-item" onclick="Router.navigate('settings')">
            <svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
            Pengaturan
        </button>

        <button class="menu-item" onclick="Router.navigate('backup')">
            <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            Data dan penyimpanan
        </button>

        <div class="menu-divider"></div>

        <button class="menu-item" onclick="Router.navigate('about')">
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

// Halaman settings detail
Pages.settings = (container) => {
    container.innerHTML = `
        <div class="page-header">
            <button class="header-btn" onclick="Router.back()">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="page-title">Pengaturan</span>
        </div>
        <div class="empty-state">
            <div class="empty-title">Pengaturan</div>
            <div class="empty-desc">Coming soon</div>
        </div>
    `;
};

Pages.downloads = (container) => {
    container.innerHTML = `
        <div class="page-header">
            <button class="header-btn" onclick="Router.back()">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="page-title">Unduhan</span>
        </div>
        <div class="empty-state">
            <div class="empty-icon">📥</div>
            <div class="empty-title">Belum ada unduhan</div>
        </div>
    `;
};

Pages.backup = (container) => {
    container.innerHTML = `
        <div class="page-header">
            <button class="header-btn" onclick="Router.back()">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="page-title">Data & Penyimpanan</span>
        </div>
        <div class="empty-state">
            <div class="empty-title">Coming soon</div>
        </div>
    `;
};

Pages.about = (container) => {
    container.innerHTML = `
        <div class="page-header">
            <button class="header-btn" onclick="Router.back()">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="page-title">Tentang</span>
        </div>
        <div style="padding:32px;text-align:center">
            <div class="more-logo-placeholder" style="margin:0 auto 16px">N</div>
            <div style="font-size:22px;font-weight:700">Nakama</div>
            <div style="color:var(--color-text-sub);margin-top:4px">
                v${Config.version}
            </div>
        </div>
    `;
};

// ── Helpers ────────────────────────────────────

function setSetting(key, value) {
    if (typeof NativeStorage !== 'undefined') {
        NativeStorage.setSetting(key, String(value));
    }
    Log.d('Settings', `${key} = ${value}`);
}

function sendLog() {
    Log.i('More', 'Send log requested — todo');
}

function showHelp() {
    Log.i('More', 'Help requested — todo');
}