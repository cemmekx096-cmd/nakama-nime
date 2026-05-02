Pages.home = (container) => {
    const library = typeof NativeStorage !== 'undefined'
        ? JSON.parse(NativeStorage.getLibrary() || '[]')
        : [];

    const cardMode = typeof NativeStorage !== 'undefined'
        ? (NativeStorage.getSetting('card_mode') || 'compact')
        : 'compact';

    if (library.length === 0) {
        container.innerHTML = `
            <div class="page-header">
                <span class="page-title">Pustaka</span>
                <button class="header-btn" onclick="showSearchBar()">
                    <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                </button>
                <button class="header-btn" onclick="showFilterMenu()">
                    <svg viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
                </button>
                <button class="header-btn" onclick="showLibraryMenu()">
                    <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </button>
            </div>
            <div class="empty-state">
                <div class="empty-icon">( ·O·;)</div>
                <div class="empty-title">Pustaka kamu kosong</div>
                <div class="empty-desc">Tambahkan anime dari tab Jelajahi</div>
            </div>
        `;
        return;
    }

    const gridClass = {
        'compact':     'grid-compact',
        'comfortable': 'grid-comfortable',
        'list':        'grid-list'
    }[cardMode] || 'grid-compact';

    const cards = library.map(anime => renderAnimeCard(anime, cardMode)).join('');

    container.innerHTML = `
        <div class="page-header">
            <span class="page-title">Pustaka</span>
            <button class="header-btn" onclick="showSearchBar()">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            </button>
            <button class="header-btn" onclick="showFilterMenu()">
                <svg viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
            </button>
            <button class="header-btn" onclick="showLibraryMenu()">
                <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            </button>
        </div>
        <div class="${gridClass}">${cards}</div>
    `;
};

function renderAnimeCard(anime, mode) {
    const thumb = anime.localThumb
        ? `file://${anime.localThumb}`
        : anime.thumbnailUrl;

    const onclick = `Router.navigate('anime-detail', ${JSON.stringify({
        animeId: anime.animeId,
        pkg: anime.pkg
    })})`;

    if (mode === 'list') {
        return `
            <div class="anime-card" onclick="${onclick}">
                <img class="anime-thumb" src="${thumb}"
                    onerror="this.src=''" loading="lazy">
                <div class="anime-info">
                    <div class="anime-title">${anime.title}</div>
                    <div class="anime-sub">${anime.status || ''}</div>
                </div>
            </div>`;
    }

    return `
        <div class="anime-card" onclick="${onclick}">
            <img src="${thumb}" onerror="this.src=''" loading="lazy">
            <div class="anime-title">${anime.title}</div>
        </div>`;
}

function showSearchBar()   { Log.d('Home', 'search — todo'); }
function showFilterMenu()  { Log.d('Home', 'filter — todo'); }
function showLibraryMenu() { Log.d('Home', 'menu — todo'); }