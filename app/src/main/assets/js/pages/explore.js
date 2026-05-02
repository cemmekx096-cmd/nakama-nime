// State tab aktif
let _exploreTab = 'sources';

Pages.explore = (container) => {
    container.innerHTML = `
        <div class="page-header">
            <span class="page-title">Jelajahi</span>
            <button class="header-btn" id="btn-explore-search">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            </button>
            <button class="header-btn" id="btn-explore-filter">
                <svg viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
            </button>
        </div>

        <!-- Sub tabs -->
        <div class="sub-tabs">
            <button class="sub-tab ${_exploreTab==='sources' ? 'active' : ''}"
                onclick="switchExploreTab('sources')">Sumber</button>
            <button class="sub-tab ${_exploreTab==='extensions' ? 'active' : ''}"
                onclick="switchExploreTab('extensions')">
                Ekstensi
                <span class="sub-tab-badge" id="ext-update-badge" style="display:none">0</span>
            </button>
            <button class="sub-tab ${_exploreTab==='migration' ? 'active' : ''}"
                onclick="switchExploreTab('migration')">Migrasi</button>
        </div>

        <!-- Tab content -->
        <div id="explore-content"></div>
    `;

    renderExploreTab(_exploreTab);
    checkExtensionUpdates();
};

function switchExploreTab(tab) {
    _exploreTab = tab;
    document.querySelectorAll('.sub-tab').forEach((btn, i) => {
        const tabs = ['sources', 'extensions', 'migration'];
        btn.classList.toggle('active', tabs[i] === tab);
    });
    renderExploreTab(tab);
}

function renderExploreTab(tab) {
    const content = document.getElementById('explore-content');
    if (!content) return;
    switch (tab) {
        case 'sources':    renderSources(content);    break;
        case 'extensions': renderExtensions(content); break;
        case 'migration':  renderMigration(content);  break;
    }
}

// ── SUMBER ──────────────────────────────────────

function renderSources(content) {
    const installed = typeof NativeExtension !== 'undefined'
        ? JSON.parse(NativeExtension.getInstalled() || '[]')
        : [];

    if (installed.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔌</div>
                <div class="empty-title">Belum ada sumber</div>
                <div class="empty-desc">Pasang extension di tab Ekstensi terlebih dahulu</div>
            </div>`;
        return;
    }

    // Group by lang
    const grouped = {};
    installed.forEach(ext => {
        const lang = ext.lang || 'lainnya';
        if (!grouped[lang]) grouped[lang] = [];
        grouped[lang].push(ext);
    });

    let html = '';

    // Terakhir digunakan (ambil dari settings)
    const lastUsed = typeof NativeStorage !== 'undefined'
        ? NativeStorage.getSetting('last_used_ext')
        : null;

    if (lastUsed) {
        const ext = installed.find(e => e.pkg === lastUsed);
        if (ext) {
            html += `
                <div class="list-section-header">Terakhir digunakan</div>
                ${renderSourceItem(ext)}`;
        }
    }

    Object.entries(grouped).forEach(([lang, exts]) => {
        html += `<div class="list-section-header">${lang.toUpperCase()}</div>`;
        html += exts.map(ext => renderSourceItem(ext)).join('');
    });

    content.innerHTML = html;
}

function renderSourceItem(ext) {
    const icon = ext.localIcon
        ? `file://${ext.localIcon}`
        : (ext.iconUrl || ext.icon || '');

    return `
        <div class="ext-item" onclick="openSource('${ext.pkg}')">
            <img class="ext-icon" src="${icon}" onerror="this.style.display='none'">
            <div class="ext-info">
                <div class="ext-name">${ext.name}</div>
                <div class="ext-meta">${ext.lang || 'id'}</div>
            </div>
            <button class="ext-btn" onclick="event.stopPropagation(); browseLatest('${ext.pkg}')">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/><path d="M11 11h2v6h-2zm0-4h2v2h-2z"/></svg>
            </button>
        </div>`;
}

function openSource(pkg) {
    if (typeof NativeStorage !== 'undefined') {
        NativeStorage.setSetting('last_used_ext', pkg);
    }
    Router.navigate('source-browse', { pkg });
    Log.d('Explore', `Open source: ${pkg}`);
}

function browseLatest(pkg) {
    Router.navigate('source-browse', { pkg, tab: 'latest' });
}

// ── EKSTENSI ─────────────────────────────────────

let _allExtensions = [];
let _installedExts = [];

async function renderExtensions(content) {
    content.innerHTML = `<div style="padding:32px;text-align:center">
        <div class="loading-spinner" style="margin:auto"></div>
    </div>`;

    try {
        // Ambil installed
        _installedExts = typeof NativeExtension !== 'undefined'
            ? JSON.parse(NativeExtension.getInstalled() || '[]')
            : [];

        // Fetch index.json
        const repoUrl = typeof NativeStorage !== 'undefined'
            ? (NativeStorage.getSetting('repo_url') || Config.defaultRepoUrl)
            : Config.defaultRepoUrl;

        const { id, promise } = NativeCallback.create();
        NativeExtension.fetchIndex(repoUrl, id);
        const result = await promise;

        if (!result.success) throw new Error(result.error);

        _allExtensions = JSON.parse(result.data);

        // Pisah: perlu update, terpasang, tersedia
        const needUpdate = [];
        const installed  = [];
        const available  = {};

        _allExtensions.forEach(ext => {
            const local = _installedExts.find(e => e.pkg === ext.pkg);
            if (local) {
                if (local.version !== ext.version) {
                    needUpdate.push({ ...ext, localVersion: local.version });
                } else {
                    installed.push(ext);
                }
            } else {
                const lang = ext.lang || 'lainnya';
                if (!available[lang]) available[lang] = [];
                available[lang].push(ext);
            }
        });

        // Update badge
        if (needUpdate.length > 0) {
            const badge = document.getElementById('ext-update-badge');
            if (badge) {
                badge.textContent = needUpdate.length;
                badge.style.display = 'inline-flex';
            }
        }

        let html = '';

        if (needUpdate.length > 0) {
            html += `
                <div style="display:flex;align-items:center;padding:8px 16px;gap:8px">
                    <span class="list-section-header" style="padding:0;flex:1">
                        Pembaruan tertunda
                    </span>
                    <button onclick="updateAllExtensions()"
                        style="background:var(--color-text);color:var(--color-bg);
                               border:none;border-radius:50px;padding:6px 14px;
                               font-size:13px;font-weight:600;cursor:pointer">
                        Perbarui semuanya
                    </button>
                </div>
                ${needUpdate.map(ext => renderExtItem(ext, 'update')).join('')}`;
        }

        if (installed.length > 0) {
            html += `<div class="list-section-header">Terpasang</div>`;
            html += installed.map(ext => renderExtItem(ext, 'installed')).join('');
        }

        Object.entries(available).forEach(([lang, exts]) => {
            html += `<div class="list-section-header">${lang.toUpperCase()}</div>`;
            html += exts.map(ext => renderExtItem(ext, 'available')).join('');
        });

        content.innerHTML = html || `<div class="empty-state">
            <div class="empty-title">Tidak ada extension</div>
        </div>`;

    } catch(e) {
        content.innerHTML = `<div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <div class="empty-title">Gagal memuat</div>
            <div class="empty-desc">${e.message}</div>
            <button onclick="renderExtensions(document.getElementById('explore-content'))"
                style="margin-top:12px;padding:8px 20px;background:var(--color-primary);
                       color:white;border:none;border-radius:50px;cursor:pointer">
                Coba lagi
            </button>
        </div>`;
        Log.e('Explore', `fetchIndex error: ${e.message}`);
    }
}

function renderExtItem(ext, status) {
    const icon = ext.icon || ext.iconUrl || '';
    const nsfwBadge = ext.nsfw
        ? `<span class="nsfw-badge"> · 18+</span>` : '';
    const untrustedBadge = ext.trusted === false
        ? `<span class="untrusted-badge"> · TIDAK TERPERCAYA</span>` : '';

    let actionBtns = '';

    if (status === 'installed') {
        actionBtns = `
            <button class="ext-btn" title="Pengaturan"
                onclick="event.stopPropagation(); openExtDetail('${ext.pkg}')">
                <svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z"/></svg>
            </button>`;
    } else if (status === 'update') {
        actionBtns = `
            <button class="ext-btn" title="Pengaturan"
                onclick="event.stopPropagation(); openExtDetail('${ext.pkg}')">
                <svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z"/></svg>
            </button>
            <button class="ext-btn install" title="Perbarui"
                onclick="event.stopPropagation(); updateExtension('${ext.pkg}','${ext.file}','${ext.sha256}')">
                <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            </button>`;
    } else {
        // available
        actionBtns = `
            <button class="ext-btn" title="Buka website"
                onclick="event.stopPropagation(); openExtWebsite('${ext.sources?.[0]?.baseUrl || ''}')">
                <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>
            </button>
            <button class="ext-btn install" title="Pasang"
                id="install-btn-${ext.pkg.replace(/\./g,'-')}"
                onclick="event.stopPropagation(); installExtension('${ext.pkg}','${ext.file}','${ext.sha256}',${ext.trusted !== false})">
                <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            </button>`;
    }

    return `
        <div class="ext-item">
            <img class="ext-icon" src="${icon}" onerror="this.style.opacity='0'">
            <div class="ext-info">
                <div class="ext-name">${ext.name}</div>
                <div class="ext-meta">
                    ${ext.lang || 'id'} · ${status === 'update'
                        ? `${ext.localVersion} → ${ext.version}`
                        : ext.version}
                    ${nsfwBadge}${untrustedBadge}
                </div>
            </div>
            <div class="ext-actions">${actionBtns}</div>
        </div>`;
}

async function installExtension(pkg, fileUrl, sha256, trusted) {
    if (!trusted) {
        const ok = confirm(
            '⚠️ Ekstensi Tidak Terpercaya\n\n' +
            'Ekstensi dari repo tidak resmi dapat membaca data atau menjalankan kode berbahaya.\n\n' +
            'Lanjutkan pemasangan?'
        );
        if (!ok) return;
    }

    const btnId = `install-btn-${pkg.replace(/\./g,'-')}`;
    const btn = document.getElementById(btnId);
    if (btn) btn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;border-width:2px"></div>';

    const { id, promise } = NativeCallback.create();
    NativeExtension.install(pkg, fileUrl, sha256, trusted, id);
    const result = await promise;

    if (result.success) {
        Log.i('Explore', `Installed: ${pkg}`);
        renderExtensions(document.getElementById('explore-content'));
    } else {
        alert(`Gagal memasang: ${result.error}`);
        Log.e('Explore', `Install failed: ${result.error}`);
    }
}

async function updateExtension(pkg, fileUrl, sha256) {
    const { id, promise } = NativeCallback.create();
    NativeExtension.update(pkg, fileUrl, sha256, id);
    const result = await promise;

    if (result.success) {
        Log.i('Explore', `Updated: ${pkg}`);
        renderExtensions(document.getElementById('explore-content'));
    } else {
        alert(`Gagal memperbarui: ${result.error}`);
    }
}

async function updateAllExtensions() {
    const needUpdate = _allExtensions.filter(ext => {
        const local = _installedExts.find(e => e.pkg === ext.pkg);
        return local && local.version !== ext.version;
    });

    for (const ext of needUpdate) {
        await updateExtension(ext.pkg, ext.file, ext.sha256);
    }
}

function openExtDetail(pkg) {
    const ext = _allExtensions.find(e => e.pkg === pkg)
             || _installedExts.find(e => e.pkg === pkg);
    if (ext) Router.navigate('ext-detail', { ext });
}

function openExtWebsite(url) {
    if (url && typeof NativeNetwork !== 'undefined') {
        Log.d('Explore', `Open website: ${url}`);
        // Buka di WebView external — implementasi nanti
    }
}

// ── MIGRASI ──────────────────────────────────────

function renderMigration(content) {
    const library = typeof NativeStorage !== 'undefined'
        ? JSON.parse(NativeStorage.getLibrary() || '[]')
        : [];

    const installed = typeof NativeExtension !== 'undefined'
        ? JSON.parse(NativeExtension.getInstalled() || '[]')
        : [];

    // Hitung jumlah anime per extension
    const countByPkg = {};
    library.forEach(anime => {
        countByPkg[anime.pkg] = (countByPkg[anime.pkg] || 0) + 1;
    });

    // Semua extension (termasuk yang tidak terinstall)
    const allPkgs = [...new Set([
        ...Object.keys(countByPkg),
        ...installed.map(e => e.pkg)
    ])];

    if (allPkgs.length === 0) {
        content.innerHTML = `<div class="empty-state">
            <div class="empty-title">Tidak ada data migrasi</div>
            <div class="empty-desc">Tambahkan anime ke pustaka terlebih dahulu</div>
        </div>`;
        return;
    }

    content.innerHTML = `
        <div style="padding:8px 16px;display:flex;align-items:center;gap:8px">
            <span style="flex:1;font-size:13px;color:var(--color-text-sub)">
                Pilih sumber yang akan dipindah
            </span>
        </div>
        ${allPkgs.map(pkg => {
            const ext = installed.find(e => e.pkg === pkg);
            const count = countByPkg[pkg] || 0;
            const isInstalled = !!ext;
            const icon = ext?.iconUrl || ext?.icon || '';
            const name = ext?.name || pkg;

            return `
                <div class="ext-item" onclick="openMigration('${pkg}')">
                    ${isInstalled
                        ? `<img class="ext-icon" src="${icon}" onerror="this.style.opacity='0'">`
                        : `<div class="ext-icon" style="background:var(--color-card);display:flex;
                               align-items:center;justify-content:center">
                               <svg width="20" height="20" viewBox="0 0 24 24" fill="#EF4444">
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
                    ${count > 0
                        ? `<span style="background:var(--color-card);color:var(--color-text-sub);
                               font-size:12px;font-weight:600;padding:4px 8px;border-radius:6px">
                               ${count}
                           </span>`
                        : ''}
                </div>`;
        }).join('')}`;
}

function openMigration(pkg) {
    Log.d('Explore', `Migration for: ${pkg} — todo`);
}

function checkExtensionUpdates() {
    // Dipanggil saat tab explore dibuka
    // Badge sudah di-handle di renderExtensions
}