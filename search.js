// Base dynamique (remplie en parsant index.html au chargement). Un fallback local est utilisé si le fetch échoue (ex: ouverture en file://)
let moviesDatabase = [];

// Fallback minimal (s'active seulement si on ne peut pas lire index.html)
const LOCAL_FALLBACK_DB = [
    { id: 'film1',  title: 'La vie au petit âge', type: 'film',  rating: 3.5, genres: ['Comédie','Familial','Aventure'], image: 'La.jpeg' },
    { id: 'film2',  title: 'Dédoublement',        type: 'film',  rating: 4.5, genres: ['Thriller','Comédie','Action'], image: 'Dé.jpg' },
    { id: 'film3',  title: 'Jackson Goup',        type: 'film',  rating: 3,   genres: ['Aventure','Fantastique','Comédie'], image: 'Ja.jpg' },
    { id: 'film4',  title: 'Karma',               type: 'film',  rating: 3,   genres: ['Horreur','Mystère','Psychologique'], image: 'Ka.jpeg' },
    { id: 'serie1', title: 'Alex',                type: 'série', rating: 4,   genres: ['Action','Comédie','Familial'], image: 'Al.jpg' },
    { id: 'serie2', title: 'Lawless Legend',      type: 'série', rating: 3.5, genres: ['Western','Comédie','Action'], image: 'Law.jpg' },
    { id: 'film5',  title: 'Trailer Batman',      type: 'trailer',            genres: ['Action','Drame','Super-héros'], image: 'Ba.jpg' },
    { id: 'film6',  title: 'Urbanos City',        type: 'film',  rating: 2.5, genres: ['Comédie','Familial','Enfants'], image: 'Ur.jpg' },
    { id: 'film7',  title: 'Backrooms Urbanos',   type: 'film',  rating: 3.5, genres: ['Horreur','Mystère','Ambience'], image: 'Bac.jpg' }
];

// Construit dynamiquement la base à partir de index.html (cartes + popups)
async function buildDatabaseFromIndex() {
    try {
        const res = await fetch('index.html', { credentials: 'same-origin', cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Construit directement depuis les popups (aucune dépendance aux cartes générées dynamiquement)
        const items = [];
        doc.querySelectorAll('.fiche-popup[id]').forEach(popup => {
            const id = popup.getAttribute('id');
            // ignorer les popups non contenus (ex: partenariat, submit)
            if (!/^film\d+|^serie\d+/i.test(id)) return;
            const titleEl = popup.querySelector('h3');
            let title = titleEl ? titleEl.textContent.trim() : '';
            title = title.replace(/\s+/g, ' ').trim();
            const img = popup.querySelector('.fiche-left img');
            const image = img ? img.getAttribute('src') : '';
            const genreEls = popup.querySelectorAll('.rating-genres .genres .genre-tag');
            const genres = Array.from(genreEls).map(g => g.textContent.trim()).filter(Boolean);
            const starsText = (popup.querySelector('.rating-genres .stars') || {}).textContent || '';
            const m = starsText.match(/([0-9]+(?:[\.,][0-9]+)?)/);
            const rating = m ? parseFloat(m[1].replace(',', '.')) : undefined;
            let type = 'film';
            if (/^serie/i.test(id)) type = 'série';
            else if (/trailer/i.test(title)) type = 'trailer';
            items.push({ id, title, type, rating, genres, image });
        });

        if (items.length > 0) {
            moviesDatabase = items;
        } else {
            // Aucun item trouvé (ex: ouverture sans serveur) -> fallback local
            moviesDatabase = LOCAL_FALLBACK_DB;
        }
    } catch (e) {
        console.warn('Impossible de charger index.html pour la recherche.', e);
        moviesDatabase = LOCAL_FALLBACK_DB;
    }
}

// Helper: remove accents/diacritics for accent-insensitive matching
function normalizeStr(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Fonction de recherche (accent-insensitive)
function searchMovies(query, selectedGenres = []) {
    let results = moviesDatabase;
    
    // Filtrer par genres sélectionnés
    if (selectedGenres.length > 0) {
        const selected = selectedGenres.map(g => normalizeStr(g).toLowerCase());
        results = results.filter(item => {
            const itemGenres = (item.genres || []).map(g => normalizeStr(g).toLowerCase());
            return selected.some(g => itemGenres.includes(g));
        });
    }
    
    // Filtrer par terme de recherche
    if (query && query.length >= 1) {
        const searchTerm = normalizeStr(query).toLowerCase().trim();
        results = results.filter(item => {
            const title = normalizeStr(item.title).toLowerCase();
            const type = normalizeStr(item.type).toLowerCase();
            const genres = (item.genres || []).map(g => normalizeStr(g).toLowerCase());
            return (
                title.includes(searchTerm) ||
                genres.some(g => g.includes(searchTerm)) ||
                type.includes(searchTerm)
            );
        });
    }
    
    return results;
}

// Afficher les résultats
function displayResults(results) {
    const resultsContainer = document.getElementById('search-results');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results"><p>Aucun résultat trouvé</p></div>';
        return;
    }
    
    // Helper: derive base path without trailing digits
    function deriveBase(src) {
        if (!src) return '';
        const m = src.match(/^(.*?)(\d+)?\.(jpg|jpeg|png|webp)$/i);
        return m ? m[1] : src.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    }

    const resultsHTML = results.map(item => {
        // Map explicit types to data-type for styling
        let typeAttr = 'film';
        if (item.type) {
            const t = item.type.toLowerCase();
            if (t.startsWith('s')) typeAttr = 'série';
            else if (t === 'trailer') typeAttr = 'trailer';
        }
        const ratingAttr = (typeof item.rating !== 'undefined' && item.rating !== null) ? ` data-rating="${item.rating}"` : '';
        const base = deriveBase(item.image);
        const initialSrc = base ? `${base}.jpg` : (item.image || 'apercu.png');
        return `
        <div class="card">
            <a href="index.html#${item.id}">
                <div class="card-media">
                    <img src="${initialSrc}" data-base="${base}" alt="Affiche de ${item.title}" loading="lazy" onerror="(function(img){var b=img.getAttribute('data-base'); if(!b){img.onerror=null; img.src='apercu.png'; return;} var i=(parseInt(img.dataset.i||'0',10)||0)+1; img.dataset.i=i; var exts=['jpg','jpeg','png']; if(i<exts.length){ img.src=b+'.'+exts[i]; } else { img.onerror=null; img.src='apercu.png'; }})(this)">
                    <div class="brand-badge">
                        <img src="clipsoustudio.png" alt="Clipsou Studio" loading="lazy" decoding="async">
                    </div>
                </div>
                <div class="card-info" data-type="${typeAttr}"${ratingAttr}></div>
            </a>
        </div>`;
    }).join('');
    
    resultsContainer.innerHTML = `<div class="search-grid">${resultsHTML}</div>`;
}

// Récupère tous les genres uniques depuis la base
function getAllGenres() {
    const set = new Set();
    moviesDatabase.forEach(item => (item.genres || []).forEach(g => g && set.add(g)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
}

// Rend les puces de genre et branche les filtres
function renderGenreFilters(onChange) {
    const container = document.getElementById('genre-filters');
    if (!container) return { getSelected: () => [] };
    const genres = getAllGenres();
    container.innerHTML = genres.map(g => `<button type="button" class="genre-chip" data-genre="${g}">${g}</button>`).join('');
    const selected = new Set();
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.genre-chip');
        if (!btn) return;
        const g = btn.getAttribute('data-genre');
        if (selected.has(g)) { selected.delete(g); btn.classList.remove('active'); }
        else { selected.add(g); btn.classList.add('active'); }
        if (typeof onChange === 'function') onChange(Array.from(selected));
    });
    return { getSelected: () => Array.from(selected) };
}

// Event listeners
document.addEventListener('DOMContentLoaded', async function() {
    const searchInput = document.getElementById('search-input');
    // Met à jour la base depuis l'accueil (nouvelles entrées et genres pris en compte)
    await buildDatabaseFromIndex();
    // Construire les filtres de genres dynamiques
    const filters = renderGenreFilters(() => {
        const q = searchInput ? searchInput.value : '';
        displayResults(searchMovies(q, filters.getSelected()));
    });
    
    if (searchInput) {
        // Placeholders pour desktop et mobile + switch auto selon taille d'écran
        const desktopPlaceholder = 'Recherchez un genre, un film ou une série...';
        const mobilePlaceholder = 'Recherchez un film/série...';
        const mq = window.matchMedia('(max-width: 768px)');

        function applyPlaceholder(e) {
            const isMobileNow = e.matches === true || (e.media && window.matchMedia(e.media).matches);
            searchInput.placeholder = isMobileNow ? mobilePlaceholder : desktopPlaceholder;
        }

        // Initialisation + écoute des changements (compatibilité navigateurs)
        applyPlaceholder(mq);
        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', applyPlaceholder);
        } else if (typeof mq.addListener === 'function') {
            mq.addListener(applyPlaceholder);
        }

        // Recherche en temps réel
        searchInput.addEventListener('input', function() {
            const query = this.value;
            const results = searchMovies(query, filters.getSelected());
            displayResults(results);
        });
        
        // Recherche avec Enter / bouton "Aller à" et masquer le clavier
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const results = searchMovies(this.value, filters.getSelected());
                displayResults(results);
                // Masquer le clavier sur mobile
                this.blur();
                if (document.activeElement) {
                    document.activeElement.blur();
                }
            }
        });
        
        // Afficher tous les films par défaut (après build async)
        displayResults(searchMovies('', filters.getSelected()));
    }
});
