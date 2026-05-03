// ── EXT DETAIL ─────────────────────────────────

Pages.extDetail = (container, params) => {
    const ext = params.ext || {};
    if (!ext.pkg) {
        container.innerHTML = _errorState('Data extension tidak valid');
        return;
    }

    const isInstalled = typeof NativeExtension !== 'undefined'
        ? NativeExtension.isInstalled(ext.pkg)
        : false;

    const localVersion = typeof NativeExtension !== 'undefined'
        ? (NativeExtension.getVersion(ext.pkg) || ext.version)
        : ext.version;

    const hasUpdate = isInstalled && localVersion !== ext.version;

    const incognito = _getSetting(`incognito_${ext.pkg}`) === 'true';
    const langEnabled = _getSetting(`lang_${ext.pkg}`) !== 'false';

    const iconId = `ext-detail-icon`;

    container.innerHTML = `
        <!-- Header -->
        <div class="page-header">
            <button class="header-btn" onclick="Router.back()">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="page-title">Info Ekstensi</span>
            <button class="header-btn"
                onclick="openExtWebsite('${ext.sources?.[0]?.baseUrl || ''}')">
                <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            </button>
            <button class="header-btn"
                onclick="showExtDetailMenu('${ext.pkg}')">
                <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            </button>
        </div>

        <!-- Icon + Info -->
        <div class="ext-detail-header">
            <img id="${iconId}" class="ext-detail-icon"
                src="" data-url="${ext.icon || ext.iconUrl || ''}"
                onerror="this.style.opacity='0.2'">

            <div class="ext-detail-name">${ext.name}</div>
            <div class="ext-detail-pkg">${ext.pkg}</div>

            <!-- Stats row -->
            <div class="ext-detail-stats">
                <div class="ext-detail-stat">
                    <span class="ext-detail-stat-value">
                        ${isInstalled ? localVersion : ext.version}
                    </span>
                    <span class="ext-detail-stat-label">Versi</span>
                </div>
                <div class="ext-detail-divider"></div>
                <div class="ext-detail-stat">
                    <span class="ext-detail-stat-value">
                        ${(ext.lang || 'id').toUpperCase()}
                    </span>
                    <span class="ext-detail-stat-label">Bahasa</span>
                </div>
                ${ext.nsfw ? `
                    <div class="ext-detail-divider"></div>
                    <div class="ext-detail-stat">
                        <span class="ext-detail-stat-value"
                            style="color:#EF4444">18+</span>
                        <span class="ext-detail-stat-label">Konten</span>
                    </div>` : ''}
            </div>

            <!-- Trust badge -->
            ${ext.trusted === false ? `
                <div style="margin-top:8px;padding:6px 12px;
                    background:rgba(239,68,68,0.15);
                    border:1px solid #EF4444;
                    border-radius:50px;font-size:12px;
                    color:#EF4444;font-weight:600">
                    ⚠️ TIDAK TERPERCAYA
                </div>` : `
                <div style="margin-top:8px;padding:6px 12px;
                    background:rgba(34,197,94,0.15);
                    border:1px solid #22C55E;
                    border-radius:50px;font-size:12px;
                    color:#22C55E;font-weight:600">
                    ✓ TERPERCAYA
                </div>`}
        </div>

        <!-- Action buttons -->
        <div class="ext-detail-actions">
            ${isInstalled ? `
                <button class="btn-outline"
                    style="border-color:#EF4444;color:#EF4444"
                    onclick="confirmUninstallExt('${ext.pkg}')">
                    Lepas
                </button>
                ${hasUpdate ? `
                    <button class="btn-filled"
                        id="btn-ext-update"
                        onclick="updateExtFromDetail(
                            '${ext.pkg}','${ext.file}','${ext.sha256}')">
                        Perbarui ke ${ext.version}
                    </button>` : `
                    <button class="btn-filled"
                        onclick="openSource('${ext.pkg}')">
                        Buka
                    </button>`}
            ` : `
                <button class="btn-filled"
                    id="btn-ext-install"
                    onclick="installExtFromDetail(
                        '${ext.pkg}','${ext.file}',
                        '${ext.sha256}',${ext.trusted !== false})">
                    Pasang
                </button>
            `}
        </div>

        <!-- Update info kalau ada -->
        ${hasUpdate ? `
            <div style="margin:0 16px 16px;padding:12px;
                background:color-mix(in srgb,
                    var(--color-primary) 10%, transparent);
                border:1px solid var(--color-primary);
                border-radius:var(--radius-md);
                font-size:13px;color:var(--color-text)">
                Pembaruan tersedia:
                <span style="color:var(--color-text-sub)">
                    ${localVersion}
                </span>
                →
                <span style="color:var(--color-primary);font-weight:600">
                    ${ext.version}
                </span>
            </div>` : ''}

        <div class="menu-divider"></div>

        <!-- Toggle: Mode penyamaran per extension -->
        <label class="toggle-row">
            <svg class="toggle-row-icon" viewBox="0 0 24 24">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            <div class="toggle-info">
                <div class="toggle-title">Mode penyamaran</div>
                <div class="toggle-desc">
                    Jeda riwayat pembacaan untuk ekstensi ini
                </div>
            </div>
            <label class="toggle">
                <input type="checkbox"
                    ${incognito ? 'checked' : ''}
                    onchange="setSetting(
                        'incognito_${ext.pkg}', this.checked)">
                <span class="toggle-track"></span>
            </label>
        </label>

        <div class="menu-divider"></div>

        <!-- Toggle bahasa -->
        <label class="toggle-row">
            <svg class="toggle-row-icon" viewBox="0 0 24 24">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56z"/>
            </svg>
            <div class="toggle-info">
                <div class="toggle-title">
                    ${(ext.lang || 'id').toUpperCase()}
                </div>
                <div class="toggle-desc">
                    Aktifkan konten bahasa ini
                </div>
            </div>
            <label class="toggle">
                <input type="checkbox"
                    ${langEnabled ? 'checked' : ''}
                    onchange="setSetting(
                        'lang_${ext.pkg}', this.checked)">
                <span class="toggle-track"></span>
            </label>
        </label>

        <div class="menu-divider"></div>

        <!-- Info tambahan -->
        <div style="padding:16px">
            <div style="font-size:12px;color:var(--color-text-sub);
                font-weight:700;text-transform:uppercase;
                letter-spacing:0.5px;margin-bottom:12px">
                Informasi
            </div>

            ${_infoRow('Base URL',
                ext.sources?.[0]?.baseUrl || '-')}
            ${_infoRow('Repo',
                ext.trusted !== false ? 'Resmi' : 'Tidak resmi')}
            ${_infoRow('SHA256',
                ext.sha256
                    ? ext.sha256.substring(0, 16) + '...'
                    : '-')}
        </div>

        <div style="height:16px"></div>
    `;

    // Load icon
    _loadExtDetailIcon(iconId, ext);
};

// ── ACTIONS ────────────────────────────────────

async function installExtFromDetail(pkg, fileUrl, sha256, trusted) {
    if (!trusted) {
        const ok = confirm(
            '⚠️ Ekstensi Tidak Terpercaya\n\n' +
            'Ekstensi dari repo tidak resmi dapat menjalankan ' +
            'kode berbahaya.\n\nLanjutkan pemasangan?'
        );
        if (!ok) return;
    }

    const btn = document.getElementById('btn-ext-install');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            <span style="display:flex;align-items:center;
                justify-content:center;gap:8px">
                <div class="loading-spinner"
                    style="width:16px;height:16px;
                        border-width:2px;
                        border-top-color:var(--color-bg)">
                </div>
                Memasang...
            </span>`;
    }

    const { id, promise } = NativeCallback.create();
    NativeExtension.install(pkg, fileUrl, sha256, trusted, id);
    const result = await promise;

    if (result.success) {
        Log.i('ExtDetail', `Installed: ${pkg}`);
        // Refresh halaman
        Router.navigate('explore');
    } else {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Pasang';
        }
        alert(`Gagal memasang:\n${result.error}`);
        Log.e('ExtDetail', `Install failed: ${result.error}`);
    }
}

async function updateExtFromDetail(pkg, fileUrl, sha256) {
    const btn = document.getElementById('btn-ext-update');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            <span style="display:flex;align-items:center;
                justify-content:center;gap:8px">
                <div class="loading-spinner"
                    style="width:16px;height:16px;
                        border-width:2px;
                        border-top-color:var(--color-bg)">
                </div>
                Memperbarui...
            </span>`;
    }

    const { id, promise } = NativeCallback.create();
    NativeExtension.update(pkg, fileUrl, sha256, id);
    const result = await promise;

    if (result.success) {
        Log.i('ExtDetail', `Updated: ${pkg}`);
        alert('Ekstensi berhasil diperbarui');
        Router.back();
    } else {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Perbarui';
        }
        alert(`Gagal memperbarui:\n${result.error}`);
    }
}

async function confirmUninstallExt(pkg) {
    const ok = confirm(`Hapus ekstensi ${pkg}?`);
    if (!ok) return;

    const { id, promise } = NativeCallback.create();
    NativeExtension.uninstall(pkg, id);
    const result = await promise;

    if (result.success) {
        Log.i('ExtDetail', `Uninstalled: ${pkg}`);
        Router.navigate('explore');
    } else {
        alert(`Gagal menghapus:\n${result.error}`);
    }
}

function showExtDetailMenu(pkg) {
    _showBottomSheet([
        {
            icon: `<svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/></svg>`,
            label: 'Hapus semua riwayat dari sumber ini',
            action: () => {
                const ok = confirm(
                    'Hapus semua riwayat tonton dari extension ini?'
                );
                if (ok && typeof NativeStorage !== 'undefined') {
                    // TODO: hapus per pkg
                    Log.d('ExtDetail', `Clear history for: ${pkg}`);
                }
            }
        }
    ]);
}

function openExtWebsite(url) {
    if (!url) return;
    Log.d('ExtDetail', `Open website: ${url}`);
    // TODO: open browser via bridge
}

// ── HELPERS ────────────────────────────────────

function _infoRow(label, value) {
    return `
        <div style="display:flex;justify-content:space-between;
            align-items:flex-start;padding:8px 0;
            border-bottom:1px solid var(--color-border)">
            <span style="font-size:13px;
                color:var(--color-text-sub)">
                ${label}
            </span>
            <span style="font-size:13px;color:var(--color-text);
                text-align:right;max-width:60%;
                word-break:break-all">
                ${value}
            </span>
        </div>`;
}

function _loadExtDetailIcon(imgId, ext) {
    const img = document.getElementById(imgId);
    if (!img) return;

    const url = ext.icon || ext.iconUrl || '';
    if (!url) return;

    if (typeof NativeImage === 'undefined') {
        img.src = url;
        return;
    }

    const localPath = NativeImage.getIconPath(ext.pkg);
    if (localPath) {
        img.src = `file://${localPath}`;
        return;
    }

    const { id, promise } = NativeCallback.create();
    NativeImage.loadIcon(url, ext.pkg, id);
    promise.then(result => {
        img.src = result.success ? `file://${result.path}` : url;
    }).catch(() => { img.src = url; });
}