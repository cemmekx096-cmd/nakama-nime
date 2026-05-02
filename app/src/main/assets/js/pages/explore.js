// ── EXPLORE ────────────────────────────────────

let _exploreTab     = 'sources';
let _allExtensions  = [];
let _installedExts  = [];
let _exploreSearch  = false;

Pages.explore = (container) => {
    container.innerHTML = `
        <div class="page-header" id="explore-header">
            <span class="page-title">Jelajahi</span>
            <button class="header-btn" onclick="toggleExploreSearch()">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            </button>
            <button class="header-btn" id="explore-filter-btn"
                style="display:none" onclick="showExploreFilter()">
                <svg viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
            </button>
        </div>

        <!-- Search bar -->
        <div id="explore-search-bar" style="display:none;padding:0 16px 8px">
            <div class="search-bar">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input type="text" id="explore-search-input"
                    placeholder="Cari extension..."
                    oninput="onExploreSearch(this.value)">
                <button onclick="toggleExploreSearch()"
                    style="background:none;border:none;
                    color:var(--color-text-sub);cursor:pointer;font-size:20px">✕</button>
            </div>
        </div>

        <!-- Sub tabs -->
        <div class="sub-tabs" id="explore-tabs">
            <button class="sub-tab ${_exploreTab==='sources' ? 'active' : ''}"
                onclick="switchExploreTab('sources')">
                Sumber
            </button>
            <button class="sub-tab ${_exploreTab==='extensions' ? 'active' : ''}"
                onclick="switchExploreTab('extensions')">
                Ekstensi
                <span class="sub-tab-badge" id="ext-update-badge"
                    style="display:none">0</span>
            </button>
            <button class="sub-tab ${_exploreTab==='migration' ? 'active' : ''}"
                onclick="switchExploreTab('migration')">
                Migrasi
            </button>
        </div>

        <!-- Content -->
        <div id="explore-content"></div>
    `;

    _renderExploreTab(_exploreTab);
};

// ── TAB SWITCH ─────────────────────────────────

function switchExploreTab(tab) {
    _exploreTab = tab;

    document.querySelectorAll('.sub-tab').forEach((btn, i) => {
        const tabs = ['sources', 'extensions', 'migration'];
        btn.classList.toggle('active', tabs[i] === tab);
    });

    // Tampil/sembunyikan filter button
    const filterBtn = document.getElementById('explore-filter-btn');
    if (filterBtn) filterBtn.style.display = tab === 'sources' ? 'flex' : 'none';

    _renderExploreTab(tab);
}

function _renderExploreTab(tab) {
    const content = document.getElementById('explore-content');
    if (!content) return;

    switch(tab) {
        case 'sources':    _renderSources(content);    break;
        case 'extensions': _renderExtensions(content); break;
        case 'migration':  _renderMigration(content);  break;
    }
}

// ══════════════════════════════════════════════
// TAB 1 — SUMBER
// ══════════════════════════════════════════════

function _renderSources(content) {
    _installedExts = _getInstalledExts();

    if (_installedExts.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔌</div>
                <div class="empty-title">Belum ada sumber</div>
                <div class="empty-desc">
                    Pasang extension di tab Ekstensi terlebih dahulu
                </div>
                <button onclick="switchExploreTab('extensions')"
                    style="margin-top:16px;padding:10px 24px;
                        background:var(--color-primary);color:white;
                        border:none;border-radius:50px;
                        font-size:14px;font-weight:600;cursor:pointer">
                    Pasang Extension
                </button>
            </div>`;
        return;
    }

    // Group by lang
    const lastUsedPkg = _getSetting('last_used_ext');
    const grouped     = {};

    _installedExts.forEach(ext => {
        const lang = ext.lang || 'id';
        if (!grouped[lang]) grouped[lang] = [];
        grouped[lang].push(ext);
    });

    let html = '';

    // Terakhir digunakan
    if (lastUsedPkg) {
        const ext = _installedExts.find(e => e.pkg === lastUsedPkg);
        if (ext) {
            html += `<div class="list-section-header">Terakhir digunakan</div>`;
            html += _sourceItem(ext);
        }
    }

    // Per bahasa
    Object.entries(grouped).forEach(([lang, exts]) => {
        html += `<div class="list-section-header">${lang.toUpperCase()}</div>`;
        html += exts.map(ext => _sourceItem(ext)).join('');
    });

    content.innerHTML = html;

    // Load icon semua source
    _loadExtIcons();
}

function _sourceItem(ext) {
    const iconId = `icon-${ext.pkg.replace(/\./g,'-')}`;
    return `
        <div class="ext-item" onclick="openSource('${ext.pkg}')">
            <img id="${iconId}" class="ext-icon"
                src="" data-url="${ext.icon || ext.iconUrl || ''}"
                onerror="this.style.opacity='0.3'">
            <div class="ext-info">
                <div class="ext-name">${ext.name}</div>
                <div class="ext-meta">${ext.lang || 'id'}</div>
            </div>
            <button class="ext-btn" title="Terbaru"
                onclick="event.stopPropagation(); browseSource('${ext.pkg}','latest')">
                <svg viewBox="0 0 24 24"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
            </button>
        </div>`;
}

function openSource(pkg) {
    _setSetting('last_used_ext', pkg);
    Router.navigate('source-browse', { pkg });
    Log.d('Explore', `Open source: ${pkg}`);
}

function browseSource(pkg, tab) {
    _setSetting('last_used_ext', pkg);
    Router.navigate('source-browse', { pkg, tab });
}

function showExploreFilter() {
    _showBottomSheet([
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>`,
            label: 'Semua bahasa',
            action: () => { _renderSources(document.getElementById('explore-content')); }
        },
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96z"/></svg>`,
            label: 'Indonesia saja',
            action: () => { _filterSourcesByLang('id'); }
        }
    ], 'Filter Sumber');
}

function _filterSourcesByLang(lang) {
    const content = document.getElementById('explore-content');
    if (!content) return;

    const filtered = _installedExts.filter(e => e.lang === lang);
    let html = `<div class="list-section-header">${lang.toUpperCase()}</div>`;
    html += filtered.map(ext => _sourceItem(ext)).join('');
    content.innerHTML = html;
    _loadExtIcons();
}

// ══════════════════════════════════════════════
// TAB 2 — EKSTENSI
// ══════════════════════════════════════════════

async function _renderExtensions(content) {
    content.innerHTML = `
        <div style="padding:48px;text-align:center">
            <div class="loading-spinner" style="margin:auto"></div>
        </div>`;

    try {
        _installedExts = _getInstalledExts();

        const repoUrl = _getSetting('repo_url') || Config.defaultRepoUrl;

        // Fetch index.json
        if (typeof NativeExtension === 'undefined') {
            throw new Error('NativeExtension bridge tidak tersedia');
        }

        const { id, promise } = NativeCallback.create();
        NativeExtension.fetchIndex(repoUrl, id);
        const result = await promise;

        if (!result.success) throw new Error(result.error || 'Gagal fetch index');

        _allExtensions = JSON.parse(result.data);

        _buildExtensionList(content);

    } catch(e) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <div class="empty-title">Gagal memuat</div>
                <div class="empty-desc">${e.message}</div>
                <button onclick="_renderExtensions(document.getElementById('explore-content'))"
                    style="margin-top:12px;padding:8px 20px;
                        background:var(--color-primary);color:white;
                        border:none;border-radius:50px;cursor:pointer">
                    Coba lagi
                </button>
            </div>`;
        Log.e('Explore', `fetchIndex: ${e.message}`);
    }
}

function _buildExtensionList(content, query = '') {
    const needUpdate = [];
    const installed  = [];
    const available  = {};

    _allExtensions.forEach(ext => {
        // Filter search
        if (query && !ext.name.toLowerCase().includes(query.toLowerCase())) return;

        const local = _installedExts.find(e => e.pkg === ext.pkg);
        if (local) {
            if (local.version !== ext.version) {
                needUpdate.push({ ...ext, localVersion: local.version });
            } else {
                installed.push({ ...ext, localVersion: local.version });
            }
        } else {
            const lang = ext.lang || 'lainnya';
            if (!available[lang]) available[lang] = [];
            available[lang].push(ext);
        }
    });

    // Update badge
    const badge = document.getElementById('ext-update-badge');
    if (badge) {
        badge.textContent  = needUpdate.length;
        badge.style.display = needUpdate.length > 0 ? 'inline-flex' : 'none';
    }

    let html = '';

    // Perlu update
    if (needUpdate.length > 0) {
        html += `
            <div style="display:flex;align-items:center;
                padding:8px 16px 4px;gap:8px">
                <span class="list-section-header"
                    style="padding:0;flex:1;margin:0">
                    Pembaruan tertunda
                </span>
                <button onclick="updateAllExtensions()"
                    style="background:var(--color-text);
                        color:var(--color-bg);border:none;
                        border-radius:50px;padding:6px 14px;
                        font-size:13px;font-weight:600;cursor:pointer">
                    Perbarui semuanya
                </button>
            </div>
            ${needUpdate.map(e => _extItem(e, 'update')).join('')}`;
    }

    // Terpasang
    if (installed.length > 0) {
        html += `<div class="list-section-header">Terpasang</div>`;
        html += installed.map(e => _extItem(e, 'installed')).join('');
    }

    // Tersedia per bahasa
    Object.entries(available).forEach(([lang, exts]) => {
        html += `<div class="list-section-header">${lang.toUpperCase()}</div>`;
        html += exts.map(e => _extItem(e, 'available')).join('');
    });

    if (!html) {
        html = `<div class="empty-state">
            <div class="empty-title">Tidak ada extension</div>
        </div>`;
    }

    content.innerHTML = html;
    _loadExtIcons();
}

function _extItem(ext, status) {
    const iconId    = `icon-ext-${ext.pkg.replace(/\./g,'-')}`;
    const nsfwBadge = ext.nsfw
        ? `<span class="nsfw-badge"> · 18+</span>` : '';
    const untrusted = ext.trusted === false
        ? `<span class="untrusted-badge"> TIDAK TERPERCAYA</span>` : '';

    let meta = '';
    if (status === 'update') {
        meta = `${ext.lang || 'id'} · ${ext.localVersion}
            <span style="color:var(--color-primary)">→ ${ext.version}</span>
            ${nsfwBadge}${untrusted}`;
    } else {
        meta = `${ext.lang || 'id'} · ${ext.version}${nsfwBadge}${untrusted}`;
    }

    let actions = '';

    if (status === 'installed') {
        actions = `
            <button class="ext-btn" title="Pengaturan"
                onclick="event.stopPropagation();
                    openExtDetail(${JSON.stringify(JSON.stringify(ext))})">
                ${_iconGear()}
            </button>`;

    } else if (status === 'update') {
        actions = `
            <button class="ext-btn" title="Pengaturan"
                onclick="event.stopPropagation();
                    openExtDetail(${JSON.stringify(JSON.stringify(ext))})">
                ${_iconGear()}
            </button>
            <button class="ext-btn install" title="Perbarui"
                id="btn-${ext.pkg.replace(/\./g,'-')}"
                onclick="event.stopPropagation();
                    updateExtension('${ext.pkg}','${ext.file}','${ext.sha256}')">
                ${_iconDownload()}
            </button>`;

    } else {
        // available
        actions = `
            <button class="ext-btn" title="Buka website"
                onclick="event.stopPropagation();
                    openInBrowser('${ext.sources?.[0]?.baseUrl || ''}')">
                ${_iconGlobe()}
            </button>
            <button class="ext-btn install" title="Pasang"
                id="btn-${ext.pkg.replace(/\./g,'-')}"
                onclick="event.stopPropagation();
                    installExtension('${ext.pkg}','${ext.file}',
                        '${ext.sha256}',${ext.trusted !== false})">
                ${_iconDownload()}
            </button>`;
    }

    return `
        <div class="ext-item">
            <img id="${iconId}" class="ext-icon"
                src="" data-url="${ext.icon || ext.iconUrl || ''}"
                onerror="this.style.opacity='0.2'">
            <div class="ext-info">
                <div class="ext-name">${ext.name}</div>
                <div class="ext-meta">${meta}</div>
            </div>
            <div class="ext-actions">${actions}</div>
        </div>`;
}

// ── INSTALL / UPDATE / UNINSTALL ───────────────

async function installExtension(pkg, fileUrl, sha256, trusted) {
    if (!trusted) {
        const ok = confirm(
            '⚠️ Ekstensi Tidak Terpercaya\n\n' +
            'Ekstensi dari repo tidak resmi dapat menjalankan ' +
            'kode berbahaya.\n\nLanjutkan pemasangan?'
        );
        if (!ok) return;
    }

    _setBtnLoading(`btn-${pkg.replace(/\./g,'-')}`);

    const { id, promise } = NativeCallback.create();
    NativeExtension.install(pkg, fileUrl, sha256, trusted, id);

    const result = await promise;
    if (result.success) {
        Log.i('Explore', `Installed: ${pkg}`);
        _installedExts = _getInstalledExts();
        _buildExtensionList(
            document.getElementById('explore-content'),
            document.getElementById('explore-search-input')?.value || ''
        );
    } else {
        alert(`Gagal memasang:\n${result.error}`);
        Log.e('Explore', `Install failed: ${result.error}`);
    }
}

async function updateExtension(pkg, fileUrl, sha256) {
    _setBtnLoading(`btn-${pkg.replace(/\./g,'-')}`);

    const { id, promise } = NativeCallback.create();
    NativeExtension.update(pkg, fileUrl, sha256, id);

    const result = await promise;
    if (result.success) {
        Log.i('Explore', `Updated: ${pkg}`);
        _installedExts = _getInstalledExts();
        _buildExtensionList(
            document.getElementById('explore-content')
        );
    } else {
        alert(`Gagal memperbarui:\n${result.error}`);
    }
}

async function updateAllExtensions() {
    const toUpdate = _allExtensions.filter(ext => {
        const local = _installedExts.find(e => e.pkg === ext.pkg);
        return local && local.version !== ext.version;
    });

    for (const ext of toUpdate) {
        await updateExtension(ext.pkg, ext.file, ext.sha256);
    }
}

function openExtDetail(extJsonStr) {
    try {
        const ext = JSON.parse(extJsonStr);
        Router.navigate('ext-detail', { ext });
    } catch(e) {
        Log.e('Explore', `openExtDetail parse error: ${e.message}`);
    }
}

function openInBrowser(url) {
    if (!url) return;
    Log.d('Explore', `Open browser: ${url}`);
    // TODO: open external browser via bridge
}

// ══════════════════════════════════════════════
// TAB 3 — MIGRASI
// ══════════════════════════════════════════════

function _renderMigration(content) {
    const library  = _getLibrary();
    const installed = _getInstalledExts();

    // Hitung jumlah anime per pkg
    const countMap = {};
    library.forEach(anime => {
        countMap[anime.pkg] = (countMap[anime.pkg] || 0) + 1;
    });

    // Semua pkg yang ada (dari library + installed)
    const allPkgs = [...new Set([
        ...Object.keys(countMap),
        ...installed.map(e => e.pkg)
    ])];

    if (allPkgs.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <div class="empty-title">Tidak ada data</div>
                <div class="empty-desc">
                    Tambahkan anime ke pustaka terlebih dahulu
                </div>
            </div>`;
        return;
    }

    let html = `
        <div style="display:flex;align-items:center;
            padding:12px 16px;gap:8px">
            <span style="flex:1;font-size:13px;
                color:var(--color-text-sub)">
                Pilih sumber yang akan dipindah
            </span>
        </div>`;

    allPkgs.forEach(pkg => {
        const ext        = installed.find(e => e.pkg === pkg);
        const count      = countMap[pkg] || 0;
        const isInstalled = !!ext;
        const iconId     = `icon-mig-${pkg.replace(/\./g,'-')}`;
        const name       = ext?.name || pkg.split('.').pop() || pkg;
        const iconUrl    = ext?.icon || ext?.iconUrl || '';

        html += `
            <div class="ext-item" onclick="openMigration('${pkg}')">
                ${isInstalled
                    ? `<img id="${iconId}" class="ext-icon"
                            src="" data-url="${iconUrl}"
                            onerror="this.style.opacity='0.2'">`
                    : `<div class="ext-icon" style="
                            background:var(--color-card);
                            display:flex;align-items:center;
                            justify-content:center">
                            <svg width="20" height="20"
                                viewBox="0 0 24 24"
                                fill="#EF4444">
                                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                            </svg>
                        </div>`
                }
                <div class="ext-info">
                    <div class="ext-name">${name}</div>
                    <div class="ext-meta">
                        ${ext?.lang || ''}
                        ${!isInstalled
                            ? '<span style="color:#EF4444"> · Tidak terinstall</span>'
                            : ''}
                    </div>
                </div>
                ${count > 0 ? `
                    <span style="
                        background:var(--color-card);
                        color:var(--color-text-sub);
                        font-size:12px;font-weight:600;
                        padding:4px 8px;border-radius:6px;
                        min-width:28px;text-align:center">
                        ${count}
                    </span>` : ''}
            </div>`;
    });

    content.innerHTML = html;
    _loadExtIcons();
}

function openMigration(pkg) {
    Log.d('Explore', `Migration: ${pkg} — coming soon`);
    // TODO: halaman migrasi
}

// ══════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════

function toggleExploreSearch() {
    _exploreSearch = !_exploreSearch;
    const bar = document.getElementById('explore-search-bar');
    if (bar) {
        bar.style.display = _exploreSearch ? 'block' : 'none';
        if (_exploreSearch) {
            setTimeout(() => {
                document.getElementById('explore-search-input')?.focus();
            }, 100);
        } else {
            // Reset search
            const content = document.getElementById('explore-content');
            if (content && _exploreTab === 'extensions') {
                _buildExtensionList(content);
            }
        }
    }
}

function onExploreSearch(query) {
    const content = document.getElementById('explore-content');
    if (!content) return;

    if (_exploreTab === 'extensions') {
        _buildExtensionList(content, query);
    } else if (_exploreTab === 'sources') {
        // Filter sources
        const filtered = _installedExts.filter(e =>
            e.name.toLowerCase().includes(query.toLowerCase())
        );
        content.innerHTML = filtered.map(e => _sourceItem(e)).join('');
        _loadExtIcons();
    }
}

// ══════════════════════════════════════════════
// ICON LOADER
// ══════════════════════════════════════════════

function _loadExtIcons() {
    if (typeof NativeImage === 'undefined') {
        // Fallback — load langsung dari URL
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

        const pkg = img.id.replace(/icon-(ext-|mig-)?/, '').replace(/-/g, '.');

        // Cek lokal
        const localPath = NativeImage.getIconPath(pkg);
        if (localPath) {
            img.src = `file://${localPath}`;
            return;
        }

        // Download
        const { id, promise } = NativeCallback.create();
        NativeImage.loadIcon(url, pkg, id);
        promise.then(result => {
            img.src = result.success
                ? `file://${result.path}`
                : url;
        }).catch(() => { img.src = url; });
    });
}

// ══════════════════════════════════════════════
// HELPERS (shared dengan pages lain)
// ══════════════════════════════════════════════

function _getInstalledExts() {
    try {
        if (typeof NativeExtension === 'undefined') return [];
        return JSON.parse(NativeExtension.getInstalled() || '[]');
    } catch(e) {
        return [];
    }
}

function _getLibrary() {
    try {
        if (typeof NativeStorage === 'undefined') return [];
        return JSON.parse(NativeStorage.getLibrary() || '[]');
    } catch(e) {
        return [];
    }
}

function _getSetting(key) {
    if (typeof NativeStorage === 'undefined') return '';
    return NativeStorage.getSetting(key) || '';
}

function _setSetting(key, val) {
    if (typeof NativeStorage !== 'undefined') {
        NativeStorage.setSetting(key, val);
    }
}

function _setBtnLoading(btnId) {
    const btn = document.getElementById(btnId);
    if (btn) btn.innerHTML = `
        <div class="loading-spinner"
            style="width:16px;height:16px;border-width:2px"></div>`;
}

// ── SVG Icons ──────────────────────────────────
function _iconGear() {
    return `<svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`;
}

function _iconDownload() {
    return `<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
}

function _iconGlobe() {
    return `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>`;
}