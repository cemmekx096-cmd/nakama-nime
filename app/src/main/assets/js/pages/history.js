Pages.history = (container) => {
    const history = typeof NativeStorage !== 'undefined'
        ? JSON.parse(NativeStorage.getHistory() || '[]')
        : [];

    container.innerHTML = `
        <div class="page-header">
            <span class="page-title">Riwayat</span>
            <button class="header-btn" onclick="searchHistory()">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            </button>
            <button class="header-btn" onclick="confirmClearHistory()">
                <svg viewBox="0 0 24 24"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/></svg>
            </button>
        </div>
        ${history.length === 0
            ? `<div class="empty-state">
                <div class="empty-icon">( ·Д·。)</div>
                <div class="empty-title">Belum ada riwayat</div>
                <div class="empty-desc">Anime yang kamu tonton akan muncul di sini</div>
               </div>`
            : `<div class="grid-list">
                ${history.map(anime => `
                    <div class="anime-card"
                        onclick="Router.navigate('anime-detail',
                            ${JSON.stringify({animeId: anime.animeId, pkg: anime.pkg})})">
                        <img class="anime-thumb"
                            src="${anime.thumbnailUrl}"
                            onerror="this.src=''" loading="lazy">
                        <div class="anime-info">
                            <div class="anime-title">${anime.title}</div>
                            <div class="anime-sub">${formatDate(anime.lastWatchedAt)}</div>
                        </div>
                    </div>`).join('')}
               </div>`
        }
    `;
};

function searchHistory()      { Log.d('History', 'search — todo'); }
function confirmClearHistory() {
    if (typeof NativeStorage !== 'undefined') {
        NativeStorage.clearHistory();
        Router.navigate('history');
    }
}