// assets/js/pages/anime-detail.js
Pages.animeDetail = (container, params) => {
    container.innerHTML = `
        <div class="dummy-page">
            <h2>📺 Detail Anime</h2>
            <p>animeId: ${params.animeId || '-'}</p>
            <p>pkg: ${params.pkg || '-'}</p>
        </div>
    `;
};