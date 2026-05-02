Pages.extDetail = (container, params) => {
    const ext = params.ext || {};
    const icon = ext.icon || ext.iconUrl || '';
    const isInstalled = typeof NativeExtension !== 'undefined'
        ? NativeExtension.isInstalled(ext.pkg || '')
        : false;

    const incognito = typeof NativeStorage !== 'undefined'
        ? NativeStorage.getSetting(`incognito_${ext.pkg}`) === 'true'
        : false;

    const langEnabled = typeof NativeStorage !== 'undefined'
        ? NativeStorage.getSetting(`lang_${ext.pkg}`) !== 'false'
        : true;

    container.innerHTML = `
        <div class="page-header">
            <button class="header-btn" onclick="Router.back()">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="page-title">Info Ekstensi</span>
            <button class="header-btn" onclick="openExtSite('${ext.sources?.[0]?.baseUrl || ''}')">
                <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            </button>
        </div>

        <!-- Header detail -->
        <div class="ext-detail-header">
            <img class="ext-detail-icon" src="${icon}" onerror="this.style.opacity='0'">
            <div class="ext-detail-name">${ext.name || ''}</div>
            <div class="ext-detail-pkg">${ext.pkg || ''}</div>
            <div class="ext-detail-stats">
                <div class="ext-detail-stat">
                    <span class="ext-detail-stat-value">${ext.version || '-'}</span>
                    <span class="ext-detail-stat-label">Versi</span>
                </div>
                <div class="ext-detail-divider"></div>
                <div class="ext-detail-stat">
                    <span class="ext-detail-stat-value">${ext.lang || 'id'}</span>
                    <span class="ext-detail-stat-label">Bahasa</span>
                </div>
            </div>
        </div>

        <!-- Aksi -->
        <div class="ext-detail-actions">
            ${isInstalled
                ? `<button class="btn-outline" style="border-color:#EF4444;color:#EF4444"
                        onclick="confirmUninstall('${ext.pkg}')">
                        Lepas
                   </button>`
                : `<button class="btn-filled"
                        onclick="installExtension('${ext.pkg}','${ext.file}','${ext.sha256}',${ext.trusted !== false})">
                        Pasang
                   </button>`
            }
        </div>

        <div class="menu-divider"></div>

        <!-- Mode penyamaran per extension -->
        <label class="toggle-row">
            <svg class="toggle-row-icon" viewBox="0 0 24 24">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            <div class="toggle-info">
                <div class="toggle-title">Mode penyamaran</div>
                <div class="toggle-desc">Jeda riwayat pembacaan untuk ekstensi ini</div>
            </div>
            <label class="toggle">
                <input type="checkbox" ${incognito ? 'checked' : ''}
                    onchange="setSetting('incognito_${ext.pkg}', this.checked)">
                <span class="toggle-track"></span>
            </label>
        </label>

        <div class="menu-divider"></div>

        <!-- Toggle bahasa -->
        <label class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-title">${(ext.lang || 'id').toUpperCase()}</div>
            </div>
            <label class="toggle">
                <input type="checkbox" ${langEnabled ? 'checked' : ''}
                    onchange="setSetting('lang_${ext.pkg}', this.checked)">
                <span class="toggle-track"></span>
            </label>
        </label>
    `;
};

async function confirmUninstall(pkg) {
    const ok = confirm(`Hapus ekstensi ${pkg}?`);
    if (!ok) return;

    const { id, promise } = NativeCallback.create();
    NativeExtension.uninstall(pkg, id);
    const result = await promise;

    if (result.success) {
        Router.back();
        Log.i('ExtDetail', `Uninstalled: ${pkg}`);
    } else {
        alert(`Gagal menghapus: ${result.error}`);
    }
}

function openExtSite(url) {
    if (url) Log.d('ExtDetail', `Open: ${url}`);
}