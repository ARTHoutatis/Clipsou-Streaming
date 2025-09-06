// Base dynamique (remplie en parsant index.html au chargement). Un fallback local est utilisé si le fetch échoue (ex: ouverture en file://)
let moviesDatabase = [];
// Cache des templates de popups (clé = id, valeur = HTML string)
const popupTemplates = new Map();

// Fallback minimal (s'active seulement si on ne peut pas lire index.html)
const LOCAL_FALLBACK_DB = [
    { id: 'film1',  title: 'La vie au petit âge', type: 'film',  rating: 2.5, genres: ['Comédie','Familial','Aventure'], image: 'La.jpeg' },
    { id: 'film2',  title: 'Dédoublement',        type: 'film',  rating: 4,   genres: ['Thriller','Comédie','Action'], image: 'Dé.jpg' },
    { id: 'film3',  title: 'Jackson Goup',        type: 'film',  rating: 3,   genres: ['Aventure','Fantastique','Comédie'], image: 'Ja.jpg' },
    { id: 'film4',  title: 'Karma',               type: 'film',  rating: 2.5, genres: ['Horreur','Mystère','Psychologique'], image: 'Ka.jpeg' },
    { id: 'serie1', title: 'Alex',                type: 'série', rating: 3,   genres: ['Action','Comédie','Familial'], image: 'Al.jpg' },
    { id: 'serie2', title: 'Lawless Legend',      type: 'série', rating: 3,   genres: ['Western','Comédie','Action'], image: 'Law.jpg' },
    { id: 'film5',  title: 'Trailer Batman',      type: 'trailer',            genres: ['Action','Drame','Super-héros'], image: 'Ba.jpg' },
    { id: 'film6',  title: 'Urbanos City',        type: 'film',  rating: 2,   genres: ['Comédie','Familial','Enfants'], image: 'Ur.jpg' },
    { id: 'film7',  title: 'Backrooms Urbanos',   type: 'film',  rating: 3,   genres: ['Horreur','Mystère','Ambience'], image: 'Bac.jpg' }
];

// Construit la base à partir des popups déjà présents dans search.html
function buildDatabaseFromCurrentPage() {
    console.log('📚 Construction de la base depuis la page actuelle...');
    
    // Construit directement depuis les popups présents dans search.html
    const items = [];
    document.querySelectorAll('.fiche-popup[id]').forEach(popup => {
        const id = popup.getAttribute('id');
        // ignorer les popups non contenus (ex: partenariat, submit)
        if (!/^film\d+|^serie\d+/i.test(id)) return;
        
        // Stocker le template HTML de la popup pour injection côté recherche
        try {
            popupTemplates.set(id, popup.outerHTML);
        } catch {}
        
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
        
        // Extraire description et URL Regarder
        const descEl = popup.querySelector('.fiche-right p');
        const description = descEl ? descEl.textContent.trim() : '';
        
        let watchUrl = '';
        const btnLinks = popup.querySelectorAll('.button-group a');
        for (const a of btnLinks) {
            const href = a.getAttribute('href') || '';
            const isClose = (a.classList && a.classList.contains('close-btn')) || href.startsWith('javascript:history.back');
            if (!isClose && href) { watchUrl = href; break; }
        }
        
        let type = 'film';
        if (/^serie/i.test(id)) type = 'série';
        else if (/trailer/i.test(title)) type = 'trailer';
        
        items.push({ id, title, type, rating, genres, image, description, watchUrl });
    });

    if (items.length > 0) {
        moviesDatabase = items;
        console.log(`✅ Base construite avec ${items.length} éléments`);
    } else {
        // Aucun item trouvé -> fallback local
        moviesDatabase = LOCAL_FALLBACK_DB;
        console.log('⚠️ Aucun popup trouvé, utilisation du fallback local');
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
    // Trier: note décroissante, puis titre
    try {
        results = results.slice().sort((a, b) => {
            const ra = (typeof a.rating === 'number') ? a.rating : -Infinity;
            const rb = (typeof b.rating === 'number') ? b.rating : -Infinity;
            if (rb !== ra) return rb - ra;
            return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
        });
    } catch {}

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results"><p>Aucun résultat trouvé</p></div>';
        // Annoncer le résultat pour les technologies d'assistance
        const announcer = document.getElementById('results-announcer');
        if (announcer) announcer.textContent = 'Aucun résultat.';
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
            <a href="#${item.id}">
                <div class="card-media">
                    <img src="${initialSrc}" data-base="${base}" alt="Affiche de ${item.title}" loading="lazy" decoding="async" onerror="(function(img){var b=img.getAttribute('data-base'); if(!b){img.onerror=null; img.src='apercu.png'; return;} var i=(parseInt(img.dataset.i||'0',10)||0)+1; img.dataset.i=i; var exts=['jpg','jpeg','png']; if(i<exts.length){ img.src=b+'.'+exts[i]; } else { img.onerror=null; img.src='apercu.png'; }})(this)">
                    <div class="brand-badge">
                        <img src="clipsoustudio.png" alt="Clipsou Studio" loading="lazy" decoding="async">
                    </div>
                </div>
                <div class="card-info" data-type="${typeAttr}"${ratingAttr}></div>
            </a>
        </div>`;
    }).join('');
    
    resultsContainer.innerHTML = `<div class="search-grid">${resultsHTML}</div>`;
    // Mettre à jour l'annonce du nombre de résultats
    const announcer = document.getElementById('results-announcer');
    if (announcer) announcer.textContent = `${results.length} résultat${results.length>1?'s':''}`;
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
    // La gestion du scroll est maintenant entièrement déléguée à simple-scroll-fix.js
    let lastOpener = null;
    
    const searchInput = document.getElementById('search-input');
    // Construire la base depuis les popups présents dans la page actuelle
    buildDatabaseFromCurrentPage();
    // Construire les filtres de genres dynamiques
    const filters = renderGenreFilters(() => {
        const q = searchInput ? searchInput.value : '';
        displayResults(searchMovies(q, filters.getSelected()));
    });
    
    // Helpers pour gérer l'ouverture de popups sans quitter la page de recherche
    function buildFallbackPopupHTML(item) {
        if (!item) return '';
        const title = item.title || '';
        const img = item.image || 'apercu.png';
        const rating = (typeof item.rating !== 'undefined' && item.rating !== null) ? `★${item.rating}/5` : '';
        const genres = (item.genres || []).map(g => `<span class="genre-tag">${g}</span>`).join('');
        const description = (item.description && item.description.trim().length > 0) ? item.description : 'Description indisponible.';
        const watchBtn = (item.watchUrl && item.watchUrl.startsWith('http'))
          ? `<a href="${item.watchUrl}" target="_blank" rel="noopener noreferrer" class="button">▶ Regarder</a>`
          : '';
        return `
<div id="${item.id}" class="fiche-popup" role="dialog" aria-modal="true" aria-labelledby="${item.id}-title">
  <div class="fiche-content landscape-layout">
    <div class="fiche-left">
      <img src="${img}" alt="Image de ${title}" class="landscape" decoding="async" loading="lazy">
    </div>
    <div class="fiche-right">
      <h3 id="${item.id}-title">${title}</h3>
      <div class="rating-genres">
        ${rating ? `<div class="stars">${rating}</div>` : ''}
        <div class="genres">${genres}</div>
      </div>
      <p>${description}</p>
      <div class="button-group">
        ${watchBtn}
        <a href="#" class="button close-btn">❌ Fermer</a>
      </div>
    </div>
  </div>
</div>`;
    }

    function ensurePopupInjected(id) {
        if (!id) return false;
        if (document.getElementById(id)) return true;
        let tpl = popupTemplates.get(id);
        if (!tpl) {
            // Construire un fallback à partir de la base locale si disponible
            const item = (moviesDatabase || []).find(m => m.id === id);
            tpl = buildFallbackPopupHTML(item);
            if (!tpl) return false;
        }
        const container = document.querySelector('main.search-container') || document.body;
        container.insertAdjacentHTML('beforeend', tpl);
        return true;
    }
    
    function openPopupById(id) {
        if (!id) return;
        if (ensurePopupInjected(id)) {
            try {
                window.location.hash = '#' + id;
            } catch {}
        }
    }
    
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
        
        // Délégation: clic sur une carte -> injecter la popup et ouvrir via hash local
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.addEventListener('click', function(e) {
                const a = e.target.closest('a[href^="#"]');
                if (!a) return;
                const href = a.getAttribute('href') || '';
                const id = href.replace(/^#/, '');
                if (!id) return;
                e.preventDefault();
                lastOpener = a;
                openPopupById(id);
            });
        }
        
        // Si on arrive avec un hash (ex: lien partagé), injecter la popup correspondante
        if (window.location.hash) {
            const id = window.location.hash.replace(/^#/, '');
            ensurePopupInjected(id);
        }

        // Assurer l'injection même si le hash change par d'autres interactions
        window.addEventListener('hashchange', function() {
            const id = window.location.hash.replace(/^#/, '');
            if (id) {
                ensurePopupInjected(id);
            }
        });
    }

    // La gestion du scroll est maintenant entièrement déléguée à simple-scroll-fix.js
});

// Side menu (hamburger) behavior for search page
document.addEventListener('DOMContentLoaded', function () {
    (function setupSideMenu() {
        const btn = document.querySelector('.hamburger-btn');
        const menu = document.getElementById('side-menu');
        const overlay = document.querySelector('.side-overlay');
        const closeBtn = document.querySelector('.side-close');

        if (!btn || !menu || !overlay || !closeBtn) return;

        function openMenu() {
            document.body.classList.add('menu-open');
            menu.classList.add('open');
            overlay.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
            const firstLink = menu.querySelector('a, button');
            if (firstLink && typeof firstLink.focus === 'function') {
                setTimeout(() => firstLink.focus(), 0);
            }
        }

        function closeMenu() {
            document.body.classList.remove('menu-open');
            menu.classList.remove('open');
            overlay.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
            if (typeof btn.focus === 'function') btn.focus();
        }

        btn.addEventListener('click', () => {
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            if (expanded) closeMenu(); else openMenu();
        });
        closeBtn.addEventListener('click', closeMenu);
        overlay.addEventListener('click', closeMenu);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('open')) {
                closeMenu();
            }
        });

        // Close menu on internal link clicks and handle popups via :target
        menu.addEventListener('click', (e) => {
            const a = e.target.closest('a');
            if (!a) return;
            const href = a.getAttribute('href') || '';
            if (href.startsWith('#')) {
                e.preventDefault();
                const id = href.replace(/^#/, '');
                // Injecter la popup si elle correspond à un film/série et n'est pas encore présente
                if (!document.getElementById(id)) {
                    ensurePopupInjected(id);
                }
                closeMenu();
                setTimeout(() => {
                    const el = document.getElementById(id);
                    if (el) {
                        // If target is a popup, open it by updating the hash (triggers :target)
                        if (el.classList && el.classList.contains('fiche-popup')) {
                            try { window.location.hash = '#' + id; } catch {}
                            return;
                        }
                        // Otherwise, scroll to the section and update hash for consistency
                        try { el.scrollIntoView({ behavior: 'auto', block: 'center' }); } catch {}
                        try {
                            if (window.history && typeof window.history.replaceState === 'function') {
                                window.history.replaceState(null, document.title, '#' + id);
                            } else {
                                window.location.hash = '#' + id;
                            }
                        } catch {}
                    }
                }, 10);
                return;
            }
            closeMenu();
        });
    })();
    
    // Comportement de fermeture: s'aligne sur index via href="javascript:history.back()"
});
