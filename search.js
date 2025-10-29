// Base dynamique (remplie en parsant index.html au chargement). Un fallback local est utilisé si le fetch échoue (ex: ouverture en file://)
let moviesDatabase = [];

// Utilise la fonction partagée de utilities.js (pas de duplication)

// Fallback minimal (s'active seulement si on ne peut pas lire index.html)
const LOCAL_FALLBACK_DB = [
    { id: 'film1',  title: 'La vie au petit âge', type: 'film',  rating: 2.5, genres: ['Comédie','Familial','Aventure'], image: 'images/La.webp' },
    { id: 'film2',  title: 'Dédoublement',        type: 'film',  rating: 4,   genres: ['Thriller','Comédie','Action'], image: 'images/Dé.webp' },
    { id: 'film3',  title: 'Jackson Goup',        type: 'film',  rating: 3,   genres: ['Aventure','Fantastique','Comédie'], image: 'images/Ja.webp' },
    { id: 'film4',  title: 'Karma',               type: 'film',  rating: 2.5, genres: ['Horreur','Mystère','Psychologique'], image: 'images/Ka.webp' },
    { id: 'serie1', title: 'Alex',                type: 'série', rating: 3,   genres: ['Action','Comédie','Familial'], image: 'images/Al.webp' },
    { id: 'serie2', title: 'Lawless Legend',      type: 'série', rating: 3,   genres: ['Western','Comédie','Action'], image: 'images/Law.webp' },
    { id: 'serie3', title: 'Les Aventures de Jean‑Michel Content', type: 'série', rating: 3.5, genres: ['Familial','Aventure','Comédie'], image: 'images/Je.webp' },
    { id: 'film5',  title: 'Trailer Batman',      type: 'trailer',            genres: ['Action','Drame','Super-héros'], image: 'images/Ba.webp' },
    { id: 'film6',  title: 'Urbanos City',        type: 'film',  rating: 2,   genres: ['Comédie','Familial','Enfants'], image: 'images/Ur.webp' },
    { id: 'film7',  title: 'Backrooms Urbanos',   type: 'film',  rating: 3,   genres: ['Horreur','Mystère','Ambience'], image: 'images/Bac.webp' }
];

// Utilise le système de lazy loading partagé de utilities.js
installLazyImageLoader();

// Construit dynamiquement la base à partir de index.html (cartes + popups)
async function buildDatabaseFromIndex() {
    try {
        // In local file:// mode, skip network fetches that will CORS-fail and use fallback
        try {
            if (location && location.protocol === 'file:') {
                moviesDatabase = LOCAL_FALLBACK_DB;
                return;
            }
        } catch {}
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

        // Merge approved items from shared JSON (visible par tous), but skip in file://
        try {
            let isFile = false;
            try { isFile = (location && location.protocol === 'file:'); } catch {}
            if (!isFile) {
                const res = await fetch('data/approved.json', { credentials: 'same-origin', cache: 'no-store' });
                if (res && res.ok) {
                    const approved = await res.json();
                    if (Array.isArray(approved)) {
                        approved.forEach(c => {
                            if (!c || !c.id || !c.title) return;
                            const type = c.type || 'film';
                            const rating = (typeof c.rating === 'number') ? c.rating : undefined;
                            const genres = Array.isArray(c.genres) ? c.genres.filter(Boolean) : [];
                            const image = optimizeCloudinaryUrlCard(c.portraitImage || c.image || c.landscapeImage || '');
                            const studioBadge = optimizeCloudinaryUrl(c.studioBadge || '');
                            items.push({ id: c.id, title: c.title, type, rating, genres, image, studioBadge });
                        });
                    }
                }
            }
        } catch {}

        // Merge approved admin items from localStorage
        try {
            const raw = localStorage.getItem('clipsou_items_approved_v1');
            if (raw) {
                const approved = JSON.parse(raw);
                if (Array.isArray(approved)) {
                    approved.forEach(c => {
                        if (!c || !c.id || !c.title) return;
                        const type = c.type || 'film';
                        const rating = (typeof c.rating === 'number') ? c.rating : undefined;
                        const genres = Array.isArray(c.genres) ? c.genres.filter(Boolean) : [];
                        const image = optimizeCloudinaryUrlCard(c.portraitImage || c.image || '');
                        const studioBadge = optimizeCloudinaryUrl(c.studioBadge || '');
                        items.push({ id: c.id, title: c.title, type, rating, genres, image, studioBadge });
                    });
                }
            }
        } catch {}

        if (items.length > 0) {
            // Dedupe by id and normalized title, prefer entries with better data (image, rating)
            moviesDatabase = dedupeByIdAndTitle(items);
        } else {
            // Aucun item trouvé (ex: ouverture sans serveur) -> fallback local
            moviesDatabase = LOCAL_FALLBACK_DB;
        }
    } catch (e) {
        console.warn('Impossible de charger index.html pour la recherche.', e);
        moviesDatabase = LOCAL_FALLBACK_DB;
    }
}

// Utilise les fonctions partagées de utilities.js (pas de duplication)

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
    
    // Helper: derive base path only for relative images with known extensions
    function deriveBase(src) {
        if (!src) return '';
        // If remote URL or has querystring without explicit extension, skip base logic
        if (/^https?:\/\//i.test(src)) return '';
        const m = src.match(/^(.*?)(\d+)?\.(webp|jpg|jpeg|png)$/i);
        return m ? m[1] : src.replace(/\.(webp|jpg|jpeg|png)$/i, '');
    }

    function isLocalAsset(src) {
        if (!src) return false;
        const value = String(src).trim();
        if (!value) return false;
        return !/^(?:https?:|\/\/|data:|blob:)/i.test(value);
    }

    function isClipsouOwned(item) {
        if (!item) return false;
        return isLocalAsset(item.portraitImage) || isLocalAsset(item.landscapeImage) || isLocalAsset(item.image);
    }

    const resultsHTML = results.map(item => {
        // Map explicit types to data-type for styling
        let typeAttr = 'film';
        if (item.type) {
            const t = item.type.toLowerCase();
            if (t === 'série' || t === 'serie' || t.startsWith('s')) typeAttr = 'série';
            else if (t === 'trailer') typeAttr = 'trailer';
        }
        const ratingAttr = (typeof item.rating !== 'undefined' && item.rating !== null) ? ` data-rating="${item.rating}"` : '';
        const base = deriveBase(item.image);
        let initialSrc;
        if (base) {
            initialSrc = `${base}.webp`;
        } else {
            // If full URL or no extension, use as-is; otherwise nothing
            initialSrc = item.image || '';
        }
        const hasCustomBadge = Boolean(item.studioBadge && String(item.studioBadge).trim());
        const clipsouOwned = isClipsouOwned(item) || LOCAL_FALLBACK_DB.some(local => local.id === item.id);
        const badgeSrc = hasCustomBadge ? String(item.studioBadge).trim() : (clipsouOwned ? 'images/clipsoustudio.webp' : '');
        const badgeHtml = badgeSrc ? `
                    <div class="brand-badge">
                        <img src="${badgeSrc}" alt="${badgeSrc === 'images/clipsoustudio.webp' ? 'Clipsou Studio' : 'Studio'}" loading="lazy" decoding="async">
                    </div>` : '';
        const badgeAttr = badgeSrc ? ` data-studio-badge="${badgeSrc.replace(/"/g, '&quot;')}"` : '';
        const clipsouAttr = clipsouOwned ? ' data-clipsou-owned="1"' : '';
        return `
        <div class="card">
            <a href="fiche.html?id=${encodeURIComponent(item.id)}&from=search">
                <div class="card-media">
                    <img data-src="${initialSrc}" data-base="${base}" alt="Affiche de ${item.title}" loading="lazy" decoding="async" onerror="(function(img){var b=img.getAttribute('data-base'); var tried=(parseInt(img.dataset.i||'0',10)||0)+1; img.dataset.i=tried; if(b && tried===1){ img.src=b+'.webp'; } else { img.onerror=null; img.removeAttribute('src'); }})(this)">
                    ${badgeHtml}
                </div>
                <div class="card-info" data-type="${typeAttr}"${ratingAttr}${badgeAttr}${clipsouAttr}></div>
            </a>
        </div>`;
    }).join('');
    
    resultsContainer.innerHTML = `<div class="search-grid">${resultsHTML}</div>`;
}

// Récupère tous les genres uniques depuis la base (déduplication accent-insensible)
function getAllGenres() {
    // Map clé normalisée (sans accents, lowercase) -> libellé d'affichage préféré
    const byKey = new Map();
    const hasDiacritics = (s) => {
        try { return String(s) !== normalizeStr(String(s)); } catch { return false; }
    };
    moviesDatabase.forEach(item => {
        (item.genres || []).forEach(g => {
            if (!g) return;
            const key = normalizeStr(g).toLowerCase();
            if (!byKey.has(key)) {
                byKey.set(key, g);
            } else {
                const cur = byKey.get(key);
                // Préférer la variante accentuée si disponible
                if (!hasDiacritics(cur) && hasDiacritics(g)) {
                    byKey.set(key, g);
                }
            }
        });
    });
    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, 'fr'));
}

// Rend les puces de genre et branche les filtres
function renderGenreFilters(onChange) {
    const container = document.getElementById('genre-chips');
    if (!container) return { getSelected: () => [], selectGenres: () => {} };
    const genres = getAllGenres();
    container.innerHTML = genres.map(g => `<button type="button" class="genre-chip" data-genre="${g}">${g}</button>`).join('');
    const selected = new Set();
    function notify(){ if (typeof onChange === 'function') onChange(Array.from(selected)); }
    function setActive(btn, on){ if (!btn) return; btn.classList.toggle('active', !!on); }
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.genre-chip');
        if (!btn) return;
        const g = btn.getAttribute('data-genre');
        if (selected.has(g)) { selected.delete(g); setActive(btn, false); }
        else { selected.add(g); setActive(btn, true); }
        notify();
    });
    // Programmatic selection API (replaces any existing selection by default)
    function selectGenres(list, append=false){
        try {
            const want = new Set((list||[]).filter(Boolean));
            if (!append) selected.clear();
            // Clear all actives first
            container.querySelectorAll('.genre-chip.active').forEach(el=>el.classList.remove('active'));
            // Activate requested
            container.querySelectorAll('.genre-chip').forEach(btn => {
                const g = btn.getAttribute('data-genre');
                if (want.has(g)) { selected.add(g); btn.classList.add('active'); }
            });
            notify();
        } catch {}
    }
    return { getSelected: () => Array.from(selected), selectGenres };
}

// Event listeners
document.addEventListener('DOMContentLoaded', async function() {
    const searchInput = document.getElementById('search-input');
    const filtersToggleBtn = document.getElementById('filters-toggle');
    const genreFilters = document.getElementById('genre-filters'); // wrapper (kept for aria-controls)
    const genreChips = document.getElementById('genre-chips'); // actual chips container
    // Met à jour la base depuis l'accueil (nouvelles entrées et genres pris en compte)
    await buildDatabaseFromIndex();
    // Construire les filtres de genres dynamiques
    const filters = renderGenreFilters(() => {
        const q = searchInput ? searchInput.value : '';
        displayResults(searchMovies(q, filters.getSelected()));
    });

    // Desktop/mobile initial state for filters visibility
    (function setupFiltersToggle(){
        if (!genreChips || !filtersToggleBtn) return;
        function applyInitial() {
            // Collapse by default on all devices (mobile and desktop)
            genreChips.classList.add('collapsed');
            filtersToggleBtn.setAttribute('aria-expanded', 'false');
        }
        applyInitial();
        // Toggle on click
        filtersToggleBtn.addEventListener('click', function(){
            const nowCollapsed = genreChips.classList.toggle('collapsed');
            filtersToggleBtn.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');
        });
        // Keep in sync with viewport changes
        const mq = window.matchMedia('(min-width: 769px)');
        const onChange = ()=> applyInitial();
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
        else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    })();
    // If URL requests the filters panel to be open, expand it
    try {
        const params = new URLSearchParams(window.location.search || '');
        const wantOpen = /^(1|true|yes|open)$/i.test(String(params.get('openFilters') || ''));
        if (wantOpen && genreChips && filtersToggleBtn) {
            genreChips.classList.remove('collapsed');
            filtersToggleBtn.setAttribute('aria-expanded', 'true');
        }
    } catch {}
    // Deep-linking: pre-select genre from ?q=<genre>
    let hadDeepLink = false;
    try {
        const params = new URLSearchParams(window.location.search || '');
        const qParam = (params.get('q') || '').trim();
        if (qParam) {
            const all = getAllGenres();
            // Find display label whose normalized form matches q
            const target = (function(){
                const qn = normalizeStr(qParam).toLowerCase();
                // attempt exact match
                for (const g of all) { if (normalizeStr(g).toLowerCase() === qn) return g; }
                // attempt startsWith/contains
                for (const g of all) { const gn = normalizeStr(g).toLowerCase(); if (gn.startsWith(qn) || qn.startsWith(gn)) return g; }
                return '';
            })();
            if (target) {
                // Clear text query to rely on genre filter only
                if (searchInput) searchInput.value = '';
                // Programmatically select genre and render results
                filters.selectGenres([target]);
                displayResults(searchMovies('', filters.getSelected()));
                hadDeepLink = true;
            }
        }
    } catch {}
    
    // If no deep-link and input is empty, show ALL items by default (films, séries, trailers)
    try {
        const isInputEmpty = !searchInput || String(searchInput.value || '').trim() === '';
        if (!hadDeepLink && isInputEmpty) {
            displayResults(searchMovies('', [])); // ignore any residual chip state on first paint
        }
    } catch {}

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
    }

    // External link confirmation (Trustpilot, Discord, Tipeee)
    (function installExternalLinkGuard(){
        // ...
        const shouldConfirm = (urlStr)=>{
            try {
                const u = new URL(urlStr, window.location.href);
                const h = u.hostname.toLowerCase();
                return (
                    h.endsWith('trustpilot.com') ||
                    h === 'discord.gg' || h.endsWith('.discord.gg') || h.endsWith('discord.com') ||
                    h.endsWith('tipeee.com') || h.endsWith('fr.tipeee.com') ||
                    h.endsWith('nova-stream.live')
                );
            } catch { return false; }
        };
        document.addEventListener('click', function(e){
            try {
                const a = e.target && (e.target.closest ? e.target.closest('a[href]') : null);
                if (!a) return;
                const href = a.getAttribute('href') || '';
                if (!/^https?:/i.test(href)) return; // only external http(s)
                if (!shouldConfirm(href)) return;
                const dest = (function(){ try { const u=new URL(href, location.href); return u.hostname.replace(/^www\./,'') + u.pathname; } catch { return href; } })();
                const ok = window.confirm('Vous allez ouvrir un lien externe:\n' + dest + '\n\nÊtes-vous sûr de vouloir continuer ?');
                if (!ok) { e.preventDefault(); e.stopPropagation(); }
            } catch {}
        }, true);
    })();
    
});
