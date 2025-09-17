// Base dynamique (remplie en parsant index.html au chargement). Un fallback local est utilisé si le fetch échoue (ex: ouverture en file://)
let moviesDatabase = [];

// Fallback minimal (s'active seulement si on ne peut pas lire index.html)
const LOCAL_FALLBACK_DB = [
    { id: 'film1',  title: 'La vie au petit âge', type: 'film',  rating: 2.5, genres: ['Comédie','Familial','Aventure'], image: 'La.webp' },
    { id: 'film2',  title: 'Dédoublement',        type: 'film',  rating: 4,   genres: ['Thriller','Comédie','Action'], image: 'Dé.webp' },
    { id: 'film3',  title: 'Jackson Goup',        type: 'film',  rating: 3,   genres: ['Aventure','Fantastique','Comédie'], image: 'Ja.webp' },
    { id: 'film4',  title: 'Karma',               type: 'film',  rating: 2.5, genres: ['Horreur','Mystère','Psychologique'], image: 'Ka.webp' },
    { id: 'serie1', title: 'Alex',                type: 'série', rating: 3,   genres: ['Action','Comédie','Familial'], image: 'Al.webp' },
    { id: 'serie2', title: 'Lawless Legend',      type: 'série', rating: 3,   genres: ['Western','Comédie','Action'], image: 'Law.webp' },
    { id: 'serie3', title: 'Les Aventures de Jean‑Michel Content', type: 'série', rating: 3.5, genres: ['Familial','Aventure','Comédie'], image: 'Je.webp' },
    { id: 'film5',  title: 'Trailer Batman',      type: 'trailer',            genres: ['Action','Drame','Super-héros'], image: 'Ba.webp' },
    { id: 'film6',  title: 'Urbanos City',        type: 'film',  rating: 2,   genres: ['Comédie','Familial','Enfants'], image: 'Ur.webp' },
    { id: 'film7',  title: 'Backrooms Urbanos',   type: 'film',  rating: 3,   genres: ['Horreur','Mystère','Ambience'], image: 'Bac.webp' }
];

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
                            const image = c.portraitImage || c.image || c.landscapeImage || '';
                            const studioBadge = c.studioBadge || '';
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
                        const image = c.portraitImage || c.image || '';
                        const studioBadge = c.studioBadge || '';
                        items.push({ id: c.id, title: c.title, type, rating, genres, image, studioBadge });
                    });
                }
            }
        } catch {}

        if (items.length > 0) {
            // Dedupe by id and normalized title, prefer entries with better data (image, rating)
            moviesDatabase = dedupeItems(items);
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

// Normalize title to a comparable key (remove diacritics, non-alphanumerics, lowercase)
function normalizeTitleKey(s) {
    try {
        return String(s || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '')
          .trim();
    } catch {
        return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
    }
}

// Choose the better item when duplicates by id/title exist
function preferBetter(a, b) {
    const score = (x) => {
        let s = 0;
        if (x && x.image) s += 3; // has image
        if (typeof x.rating === 'number') s += 1; // has rating
        if (Array.isArray(x.genres) && x.genres.length) s += 1; // has genres
        // Prefer entries carrying a custom studio badge (ensures correct logo display)
        if (x && x.studioBadge) s += 4;
        // Prefer approved-origin entries that likely have Cloudinary URLs (heuristic: http)
        if (x && /^https?:\/\//i.test(x.image || '')) s += 1;
        return s;
    };
    return score(a) >= score(b) ? a : b;
}

// Dedupe by id and normalized title
function dedupeItems(list) {
    const byId = new Map();
    const byTitle = new Map();
    for (const it of list) {
        if (!it) continue;
        const id = it.id || '';
        const key = normalizeTitleKey(it.title || '');
        if (id) {
            const chosen = byId.has(id) ? preferBetter(byId.get(id), it) : it;
            // Merge important fields we don't want to lose (e.g., studioBadge)
            const prev = byId.get(id) || {};
            const merged = {
                ...chosen,
                // If best item lacks studioBadge, carry it over from the other duplicate
                studioBadge: (chosen && chosen.studioBadge) || (it && it.studioBadge) || (prev && prev.studioBadge) || ''
            };
            byId.set(id, merged);
        }
        if (key) {
            const chosenT = byTitle.has(key) ? preferBetter(byTitle.get(key), it) : it;
            const prevT = byTitle.get(key) || {};
            const mergedT = {
                ...chosenT,
                studioBadge: (chosenT && chosenT.studioBadge) || (it && it.studioBadge) || (prevT && prevT.studioBadge) || ''
            };
            byTitle.set(key, mergedT);
        }
    }
    // Merge preferring title uniqueness. If an id maps to a different title key, keep best.
    const out = new Map();
    byTitle.forEach((v, k) => out.set(k, v));
    byId.forEach((v) => {
        const k = normalizeTitleKey(v.title || '');
        if (!out.has(k)) {
            out.set(k, v);
        } else {
            const chosen = preferBetter(out.get(k), v);
            const other = chosen === out.get(k) ? v : out.get(k);
            // Ensure studioBadge is preserved if present on either
            const merged = { ...chosen };
            if (!merged.studioBadge && other && other.studioBadge) merged.studioBadge = other.studioBadge;
            out.set(k, merged);
        }
    });
    return Array.from(out.values());
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
    
    // Helper: derive base path only for relative images with known extensions
    function deriveBase(src) {
        if (!src) return '';
        // If remote URL or has querystring without explicit extension, skip base logic
        if (/^https?:\/\//i.test(src)) return '';
        const m = src.match(/^(.*?)(\d+)?\.(webp|jpg|jpeg|png)$/i);
        return m ? m[1] : src.replace(/\.(webp|jpg|jpeg|png)$/i, '');
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
        let initialSrc;
        if (base) {
            initialSrc = `${base}.webp`;
        } else {
            // If full URL or no extension, use as-is; fallback to placeholder
            initialSrc = item.image || 'apercu.webp';
        }
        const badgeSrc = (item.studioBadge && String(item.studioBadge).trim()) || 'clipsoustudio.webp';
        return `
        <div class="card">
            <a href="fiche.html?id=${encodeURIComponent(item.id)}&from=search">
                <div class="card-media">
                    <img src="${initialSrc}" data-base="${base}" alt="Affiche de ${item.title}" loading="lazy" decoding="async" onerror="(function(img){var b=img.getAttribute('data-base'); if(!b){img.onerror=null; img.src='apercu.webp'; return;} var tried=(parseInt(img.dataset.i||'0',10)||0)+1; img.dataset.i=tried; if(tried===1){ img.src=b+'.webp'; } else { img.onerror=null; img.src='apercu.webp'; }})(this)">
                    <div class="brand-badge">
                        <img src="${badgeSrc}" alt="Studio" loading="lazy" decoding="async">
                    </div>
                </div>
                <div class="card-info" data-type="${typeAttr}"${ratingAttr}${item.studioBadge ? ` data-studio-badge="${String(item.studioBadge).replace(/"/g,'&quot;')}"` : ''}></div>
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

// External link confirmation (Trustpilot, Discord, Tipeee)
(function installExternalLinkGuard(){
  try {
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
  } catch {}
})();
