// assets/js/pages/episode-list.js
Pages.episodeList = (container, params) => {
    container.innerHTML = `
        <div class="dummy-page">
            <h2>📋 Daftar Episode</h2>
            <p>animeId: ${params.animeId || '-'}</p>
        </div>
    `;
};