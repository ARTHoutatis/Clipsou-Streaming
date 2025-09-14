'use strict';

// Force revenir en haut de la page au chargement / rafraîchissement
// et désactiver la restauration automatique de position par le navigateur
(function ensureTopOnLoad(){
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch(_) {}
  function toTop(){ try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch(_) { window.scrollTo(0,0); } }
  // DOM prêt, on remonte
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', toTop, { once: true });
  } else {
    toTop();
  }
  // Au chargement complet et lors du retour via bfcache
  window.addEventListener('load', function(){ setTimeout(toTop, 0); }, { once: true });
  window.addEventListener('pageshow', function(e){ if (e && e.persisted) toTop(); else toTop(); });
})();

// Episodes database per series title
const EPISODES_DB = {
  'Alex': [
    { n: 1, url: 'https://www.youtube.com/watch?v=Uynd10bGS6I&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=1', title: 'SAUVER Zigzag !' },
    { n: 2, url: 'https://www.youtube.com/watch?v=QfTsODE-HIU&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=2', title: 'EXPLOSION' },
    { n: 3, url: 'https://www.youtube.com/watch?v=up7Q2jBlSOo&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=3', title: 'LA PLANTE' },
    { n: 4, url: 'https://www.youtube.com/watch?v=DmUG8oVmzMk&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=4', title: 'Un petit feux de camp' },
    { n: 5, url: 'https://www.youtube.com/watch?v=JzPlADBeDto&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=5', title: 'Une Banane' },
    { n: 6, url: 'https://www.youtube.com/watch?v=Jm-Mwy6733Y&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=6', title: 'BOOM (8x8x8 X challenge)' },
    { n: 7, url: 'https://www.youtube.com/watch?v=RYM7vH96y1I&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=7', title: 'Alex contre LA MAIN' },
    { n: 8, url: 'https://www.youtube.com/watch?v=yMYoD9I1xs0&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=8', title: 'Casser une vitre animation' },
    { n: 9, url: 'https://www.youtube.com/watch?v=IQXjgoYKyYU&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=9', title: 'Deadpool lego combat stop motion' }
  ],
  'Lawless Legend': [
    { n: 1, url: 'https://www.youtube.com/watch?v=I21K4Ksf_4A&list=PLljfI9MJr5K2Li687G4dOxjfyDQkIfJn3&index=1', title: "De l'argent voler pour de l'argent gagné" },
    { n: 2, url: 'https://www.youtube.com/watch?v=jfbOQ7kWKw0&list=PLljfI9MJr5K2Li687G4dOxjfyDQkIfJn3&index=2', title: 'Les voleurs ennemis' },
    { n: 3, url: 'https://www.youtube.com/watch?v=JCW8qyJCqbA&list=PLljfI9MJr5K2Li687G4dOxjfyDQkIfJn3&index=3', title: 'Une mauvaise nouvelle' }
  ],
  'Les Aventures de Jean‑Michel Content': [
    { n: 1, url: 'https://www.youtube.com/watch?v=OgLRqt_iRkI&list=PLljfI9MJr5K17MmHDsdU6QqSFwZJ_Tn-5&index=1', title: 'Jean-Michel Content à la plage' },
    { n: 2, url: 'https://www.youtube.com/watch?v=Sa_3VceEqaI&list=PLljfI9MJr5K17MmHDsdU6QqSFwZJ_Tn-5&index=2', title: 'Jean-Michel Content fête son anniversaire' }
  ]
};

// Build normalized lookup for episodes by title (accent/punctuation-insensitive)
const EPISODES_DB_NORM = (() => {
  const m = Object.create(null);
  try {
    Object.keys(EPISODES_DB).forEach(k => {
      m[normalizeTitleKey(k)] = EPISODES_DB[k];
    });
  } catch {}
  return m;
})();

// Fallback episodes mapping by fiche id (defined AFTER EPISODES_DB/EPISODES_DB_NORM)
const EPISODES_ID_DB = {
  'serie1': EPISODES_DB['Alex'],
  'serie2': EPISODES_DB['Lawless Legend'],
  'serie3': EPISODES_DB['Les Aventures de Jean‑Michel Content']
};

// Cache index.html in-session to avoid repeated network/file reads
let __INDEX_HTML_CACHE = null;
async function fetchIndexHtmlCached() {
  if (__INDEX_HTML_CACHE && typeof __INDEX_HTML_CACHE === 'string') return __INDEX_HTML_CACHE;
  const res = await fetch('index.html', { credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const html = await res.text();
  __INDEX_HTML_CACHE = html;
  return html;
}

// Fallback local complet pour usage hors serveur (file://) ou si index.html est inaccessible
const LOCAL_FALLBACK_DB = [
  {
    id: 'film1',
    title: 'La vie au petit âge',
    image: 'La1.webp',
    genres: ['Comédie','Familial','Aventure'],
    rating: 2.5,
    type: 'film',
    description: "Timmy, un enfant espiègle, nous fait visiter son village dans un monde entièrement construit en briques LEGO. Mais chaque coin de rue réserve son lot de gags et de surprises ! Une aventure familiale pleine d'humour et de tendresse qui ravira petits et grands.",
    watchUrl: 'https://youtu.be/XtqzuhtuH2E?si=e-89Qu0t_vrO0RzG'
  },
  {
    id: 'film2',
    title: 'Dédoublement',
    image: 'Dé1.webp',
    genres: ['Thriller','Comédie','Action'],
    rating: 4,
    type: 'film',
    description: "Deux frères identiques, l'un vêtu de blanc et l'autre de noir, s'entendent à merveille… jusqu'à ce que l'un finisse en prison. Dans l'univers de Minecraft, ce thriller haletant mêle comédie, suspense et évasion.",
    watchUrl: 'https://www.youtube.com/watch?v=gfbiTpqQDY0'
  },
  {
    id: 'film3',
    title: 'Jackson Goup',
    image: 'Ja1.webp',
    genres: ['Aventure','Fantastique','Comédie'],
    rating: 3.5,
    type: 'film',
    description: "Un aventurier un peu maladroit traverse des contrées hostiles remplies de créatures féroces. Tourné en prise de vue réelle (live action), ce périple épique mêle humour et fantastique pour un voyage plein de surprises.",
    watchUrl: 'https://www.youtube.com/watch?v=VUqwvqQ51sg'
  },
  {
    id: 'serie1',
    title: 'Alex',
    image: 'Al1.webp',
    genres: ['Action','Comédie','Familial'],
    rating: 3,
    type: 'série',
    description: "Suivez les aventures captivantes d'Alex, un personnage attachant dans un univers en briques LEGO. Cette série brickfilm innovante mêle action, humour et émotion dans des épisodes soigneusement réalisés qui plairont à tous les âges.",
    watchUrl: 'https://www.youtube.com/playlist?list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf'
  },
  {
    id: 'serie2',
    title: 'Lawless Legend',
    image: 'Law1.webp',
    genres: ['Western','Comédie','Action'],
    rating: 3,
    type: 'série',
    description: "Plongez dans l'univers du Far West à travers cette série brickfilm unique ! Cowboys en briques LEGO, duels au soleil couchant et esthétique VHS nostalgique : cette série réinvente le western avec humour dans un style rétro irrésistible.",
    watchUrl: 'https://youtube.com/playlist?list=PLljfI9MJr5K2Li687G4dOxjfyDQkIfJn3&si=FQ0ImMc9j-6wvtRk'
  },
  {
    id: 'film4',
    title: 'Karma',
    image: 'Ka1.webp',
    genres: ['Horreur','Mystère','Psychologique'],
    rating: 2.5,
    type: 'film',
    description: "Victime de harcèlement scolaire, une adolescente met fin à ses jours. Réalisé en prise de vue réelle, ce récit surnaturel suit le retour d'un esprit tourmenté qui hante son bourreau et le plonge dans une spirale de terreur.",
    watchUrl: 'https://www.youtube.com/watch?v=p79g08Igceo'
  },
  {
    id: 'film5',
    title: 'Trailer BATMAN',
    image: 'Ba1.webp',
    genres: ['Action','Drame','Super-héros'],
    type: 'trailer',
    description: "Un nouveau trailer de Batman, sombre et intense, réimaginé dans l'univers Minecraft. Découvrez des premières images qui redéfinissent le chevalier noir avec une approche moderne et spectaculaire.",
    watchUrl: 'https://www.youtube.com/watch?v=SzbqZNObLNU'
  },
  {
    id: 'film6',
    title: 'URBANOS city',
    image: 'Ur1.webp',
    genres: ['Comédie','Familial','Enfants'],
    rating: 2,
    type: 'film',
    description: "Le Noob vous présente, avec humour, la ville d'Urbanos créée sur Minecraft.",
    watchUrl: 'https://www.youtube.com/watch?v=ZcnWsRXHLic'
  },
  {
    id: 'film7',
    title: 'Backrooms URBANOS',
    image: 'Bac1.webp',
    genres: ['Horreur','Mystère','Ambience'],
    rating: 3.5,
    type: 'film',
    description: "Après avoir chuté à travers le sol, Noob se retrouve piégé dans les Backrooms : un dédale sans fin de couloirs jaunâtres où bourdonnent les néons et où rôdent d’étranges présences...",
    watchUrl: 'https://www.youtube.com/watch?v=b1BSjegjM_s'
  },
  {
    id: 'serie3',
    title: 'Les Aventures de Jean‑Michel Content',
    image: 'Je1.webp',
    genres: ['Familial','Aventure','Comédie'],
    rating: 3.5,
    type: 'série',
    description: "Jean‑Michel Content est un homme toujours heureux, quoi qu’il arrive. Avec son esprit enfantin, il multiplie les bêtises et adore déranger les autres. Agaçant mais attachant, il transforme chaque situation en moment absurde.",
    watchUrl: 'https://youtube.com/playlist?list=PLljfI9MJr5K17MmHDsdU6QqSFwZJ_Tn-5&si=lVyJvllZ6dkb94gq'
  }
];

// Base d'acteurs par titre (clé = item.title tel qu'affiché)
// Note: si un acteur n'a pas d'image, on affichera 'acteurs... image/Unknown.jpeg'
const ACTOR_DB = {
  'Jackson Goup': [
    { name: 'Kassielator', role: 'Magicien' },
    { name: 'Kassielator', role: 'Rodolf' },
    { name: 'Liam Roxxor', role: 'Jackson goup' }
  ],
  'La vie au petit âge': [
    { name: 'Liam Roxxor', role: 'Timmy' },
    { name: 'Cocodu', role: 'Le Roi' }
  ],
  'Dédoublement': [
    { name: 'Beat Vortex', role: 'Boucher' },
    { name: 'Arth', role: 'Juge' },
    { name: 'Raiback', role: 'Policier' },
    { name: 'Ferrisbu', role: 'Axel' },
    { name: 'Clone prod', role: 'Noah' },
    { name: 'Liam Roxxor', role: 'Rytan le chauffeur' }
  ],
  'Karma': [
    { name: 'Liam Roxxor', role: 'James' },
    { name: 'Stranger Art', role: 'Louise' }
  ],
  'Les Aventures de Jean‑Michel Content': [
    { name: 'Kassielator', role: 'Jean‑Michel Content' },
    { name: 'Liam Roxxor', role: 'Sébastien' }
  ],
  'Jean Michel Content': [
    { name: 'Kassielator', role: 'Jean michel content' },
    { name: 'Liam Roxxor', role: 'Sebastien' }
  ],
  'URBANOS city': [
    { name: 'Arth', role: 'Noob' }
  ],
  'Backrooms URBANOS': [
    { name: 'Arth', role: 'Arth' }
  ],
  'Alex': [
    { name: 'Ferrisbu', role: 'Alex' }
  ],
  'Lawless Legend': [
    { name: "Le Zebre'ifique", role: 'Bill Boker' },
    { name: 'Maxou', role: 'Jesse Mercer' },
    { name: 'Steve Animation', role: 'Policier' },
    { name: 'Calvlego', role: 'Sam Crowley' },
    { name: 'Atrochtiraptor', role: 'Jed Polt' },
    { name: 'Mordecai', role: 'Royce Colter' },
    { name: 'Paleo Brick', role: 'Sherrif brown' },
    { name: 'Brickmaniak', role: 'Royce Coler' },
    { name: 'Clone prod', role: 'Myro Tasty' },
    { name: 'Liam Roxxor', role: 'Banquier' },
    { name: 'Ferrisbu', role: 'Bourgeois' }
  ]
};

// Custom display order for specific titles. Names are matched case-insensitively.
// Any actors not listed will be appended after in their original order.
const CUSTOM_ACTOR_ORDER = {
  'Lawless Legend': [
    'Calvlego',
    'Atrochtiraptor',
    'Mordecai',
    'Maxou',
    'Brickmaniak',
    "Le Zebre'ifique",
    'Clone prod',
    'Paleo Brick',
    'Steve Animation',
    'Liam Roxxor',
    'Ferrisbu'
  ],
  'Dédoublement': [
    'Ferrisbu',
    'Clone prod',
    'Raiback',
    'Arth',
    'Beat Vortex',
    'Liam Roxxor'
  ]
};

// Build a normalized lookup for the desired custom order by title
const CUSTOM_ACTOR_ORDER_NORM = (() => {
  const m = Object.create(null);
  Object.keys(CUSTOM_ACTOR_ORDER).forEach(k => {
    m[normalizeTitleKey(k)] = CUSTOM_ACTOR_ORDER[k];
  });
  return m;
})();

// Clean filename map (kebab-case basenames without extension) for each actor
const ACTOR_IMAGE_MAP = {
  'Arth': 'arth',
  'Beat Vortex': 'beat-vortex',
  'Clone prod': 'clone-prod',
  'Cocodu': 'cocodu',
  'Ferrisbu': 'ferrisbu',
  'Kassielator': 'kassielator',
  'Liam Roxxor': 'liam-roxxor',
  'Maxou': 'maxou',
  'Raiback': 'raiback',
  'Steve Animation': 'steve-animation',
  "Le Zebre'ifique": 'le-zebre-ifique',
  'Unknown': 'unknown'
};

// Normalize titles to match regardless of accents/case/spaces
function normalizeTitleKey(s) {
  try {
    return String(s || '')
      .normalize('NFD')                     // split accents
      .replace(/[\u0300-\u036f]/g, '')    // remove diacritics
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')          // remove all non-alphanumeric
      .trim();
  } catch(_) {
    // Fallback if normalize isn't supported
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
  }
}

// Build a normalized lookup for actor lists
const ACTOR_DB_NORM = (() => {
  const m = Object.create(null);
  Object.keys(ACTOR_DB).forEach(k => {
    m[normalizeTitleKey(k)] = ACTOR_DB[k];
  });
  return m;
})();

function getActorImageBase(name) {
  // Base du chemin sans extension; on essaiera plusieurs extensions ensuite
  const baseDir = './';
  const clean = String(name || '').trim();
  // IMPORTANT: ne pas encoder ici pour éviter le double-encodage.
  // On renvoie la base brute et on encoder(a) l'URL complète au moment de l'affectation du src.
  return baseDir + clean;
}

// Construit la base des fiches depuis index.html
async function buildItemsFromIndex() {
  try {
    const html = await fetchIndexHtmlCached();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const items = [];
    doc.querySelectorAll('.fiche-popup[id]').forEach(popup => {
      const id = popup.getAttribute('id');
      if (!/^(film\d+|serie\d+)/i.test(id)) return;
      const titleEl = popup.querySelector('h3');
      const title = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : '';
      const imgEl = popup.querySelector('.fiche-left img');
      const image = imgEl ? imgEl.getAttribute('src') : '';
      const genreEls = popup.querySelectorAll('.rating-genres .genres .genre-tag');
      const genres = Array.from(genreEls).map(g => g.textContent.trim()).filter(Boolean);
      const starsText = (popup.querySelector('.rating-genres .stars') || {}).textContent || '';
      const m = starsText.match(/([0-9]+(?:[\.,][0-9]+)?)/);
      const rating = m ? parseFloat(m[1].replace(',', '.')) : undefined;
      let type = 'film';
      if (/^serie/i.test(id)) type = 'série';
      else if (/trailer/i.test(title)) type = 'trailer';
      let description = '';
      const descEl = popup.querySelector('.fiche-right p');
      if (descEl) description = descEl.textContent.trim();
      let watchUrl = '';
      const btn = popup.querySelector('.button-group a');
      if (btn) {
        const href = btn.getAttribute('href') || '';
        try { if (/^https?:/i.test(href)) watchUrl = href; } catch {}
      }
      items.push({ id, title, image, genres, rating, type, description, watchUrl });
    });

    // Merge items from shared approved.json (visible to all)
    try {
      const res = await fetch('data/approved.json', { credentials: 'same-origin', cache: 'no-store' });
      if (res && res.ok) {
        const approved = await res.json();
        if (Array.isArray(approved)) {
          approved.forEach(c => {
            if (!c || !c.id || !c.title) return;
            const type = c.type || 'film';
            const rating = (typeof c.rating === 'number') ? c.rating : undefined;
            const genres = Array.isArray(c.genres)
              ? c.genres.map(g => String(g || '').trim()).filter(Boolean)
              : [];
            const image = c.landscapeImage || c.image || c.portraitImage || '';
            const description = c.description || '';
            const watchUrl = c.watchUrl || '';
            const actors = Array.isArray(c.actors) ? c.actors.filter(a=>a && a.name) : [];
            const studioBadge = c.studioBadge || '';
            items.push({ id: c.id, title: c.title, type, rating, genres, image, description, watchUrl, actors, portraitImage: c.portraitImage || '', landscapeImage: c.landscapeImage || '', studioBadge });
          });
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
            const genres = Array.isArray(c.genres)
              ? c.genres.map(g => String(g || '').trim()).filter(Boolean)
              : [];
            const image = c.landscapeImage || c.image || c.portraitImage || '';
            const description = c.description || '';
            const watchUrl = c.watchUrl || '';
            const actors = Array.isArray(c.actors) ? c.actors.filter(a=>a && a.name) : [];
            const studioBadge = c.studioBadge || '';
            items.push({ id: c.id, title: c.title, type, rating, genres, image, description, watchUrl, actors, portraitImage: c.portraitImage || '', landscapeImage: c.landscapeImage || '', studioBadge });
          });
        }
      }
    } catch {}

    return items.length > 0 ? items : LOCAL_FALLBACK_DB;
  } catch (e) {
    console.warn('Impossible de construire la base depuis index.html', e);
    return LOCAL_FALLBACK_DB;
  }
}

function setMetaTag(selector, attr, value) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    if (selector.startsWith('meta[')) {
      // extraire name= ou property=
      const nameMatch = selector.match(/name=\"([^\"]+)\"/);
      const propMatch = selector.match(/property=\"([^\"]+)\"/);
      if (nameMatch) el.setAttribute('name', nameMatch[1]);
      if (propMatch) el.setAttribute('property', propMatch[1]);
      document.head.appendChild(el);
    } else {
      return;
    }
  }
  el.setAttribute(attr, value);
}

function renderFiche(container, item) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'fiche-content landscape-layout';

  const left = document.createElement('div');
  left.className = 'fiche-left';
  // Wrap media so overlay can be positioned relative to the image bounds
  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'fiche-media-wrap';
  const img = document.createElement('img');
  img.src = item.image || 'apercu.png';
  img.alt = 'Image de ' + (item.title || 'la fiche');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.className = 'landscape';
  mediaWrap.appendChild(img);
  left.appendChild(mediaWrap);

  const right = document.createElement('div');
  right.className = 'fiche-right';

  const h3 = document.createElement('h3');
  h3.textContent = item.title || '';

  const rg = document.createElement('div');
  rg.className = 'rating-genres';
  if (typeof item.rating === 'number' && !Number.isNaN(item.rating)) {
    const stars = document.createElement('div');
    const rounded = Math.round(item.rating * 10) / 10;
    let txt = rounded.toFixed(1);
    if (txt.endsWith('.0')) txt = String(Math.round(rounded));
    stars.className = 'stars';
    stars.textContent = '★' + txt + '/5';
    rg.appendChild(stars);
  }
  const genresDiv = document.createElement('div');
  genresDiv.className = 'genres';
  (item.genres || []).forEach(g => {
    const tag = document.createElement('span');
    tag.className = 'genre-tag';
    tag.textContent = g;
    genresDiv.appendChild(tag);
  });
  rg.appendChild(genresDiv);

  const p = document.createElement('p');
  p.textContent = item.description || '';

  // Mobile overlay: clone title + rating/genres into an overlay inside the image container
  try {
    const overlay = document.createElement('div');
    overlay.className = 'fiche-overlay';
    const overlayTitle = h3.cloneNode(true);
    overlayTitle.classList.add('overlay-title');
    const overlayMeta = rg.cloneNode(true);
    overlayMeta.classList.add('overlay-meta');
    overlay.appendChild(overlayTitle);
    overlay.appendChild(overlayMeta);
    mediaWrap.appendChild(overlay);
  } catch (e) {
    // no-op if cloning fails
  }

  const buttons = document.createElement('div');
  buttons.className = 'button-group';
  if (item.watchUrl) {
    const a = document.createElement('a');
    a.className = 'button';
    // If this fiche is a series, route to episodes section instead of external watch
    if ((item.type === 'série') || /^serie/i.test(item.id || '')) {
      a.href = '#episodes-section';
      a.textContent = 'Voir les épisodes';
      a.addEventListener('click', function(e){
        // Open the episodes panel immediately
        try { e.preventDefault(); } catch {}
        try { window.__wantEpisodes = true; } catch {}
        try { location.hash = '#episodes-section'; } catch {}
        // Prefer direct opener if available to avoid any race
        try { if (typeof window.__openEpisodes === 'function') { window.__openEpisodes(); return; } } catch {}
        try { window.dispatchEvent(new CustomEvent('open-episodes')); } catch { try { window.dispatchEvent(new Event('open-episodes')); } catch {} }
      });
    } else {
      try { a.href = item.watchUrl; } catch { a.href = item.watchUrl || ''; }
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = '▶ Regarder';
    }
    buttons.appendChild(a);
  }

  right.appendChild(h3);
  right.appendChild(rg);
  if (item.description) right.appendChild(p);
  // Place buttons under the image on mobile so they visually follow the media
  // and switch automatically when the viewport changes (no refresh required)
  try {
    const mq = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;
    const placeButtons = () => {
      if (mq && mq.matches) {
        left.appendChild(buttons);
      } else {
        right.appendChild(buttons);
      }
    };
    placeButtons();
    if (mq) {
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', placeButtons);
      } else if (typeof mq.addListener === 'function') {
        // Fallback for older browsers
        mq.addListener(placeButtons);
      }
    } else {
      // Ultimate fallback on resize
      window.addEventListener('resize', placeButtons);
      window.addEventListener('orientationchange', placeButtons);
    }
  } catch (e) {
    right.appendChild(buttons);
  }

  wrap.appendChild(left);
  wrap.appendChild(right);
  container.appendChild(wrap);
}

// ===== Similar content (by shared genres) =====
function computeSimilar(allItems, current, minOverlap = 2, maxCount = 10) {
  if (!current) return [];
  // Normalize genre: trim, lowercase, remove accents for robust matching
  const norm = (s) => {
    try {
      return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    } catch {
      return String(s || '').toLowerCase().trim();
    }
  };
  const curGenres = new Set((current.genres || []).map(g => norm(g)).filter(Boolean));
  const scored = [];
  for (const it of allItems) {
    if (!it || it.id === current.id) continue;
    const gset = new Set((it.genres || []).map(x => norm(x)).filter(Boolean));
    let overlap = 0;
    for (const g of gset) if (curGenres.has(g)) overlap++;
    if (overlap >= minOverlap) scored.push({ item: it, overlap });
  }
  scored.sort((a, b) => (b.overlap - a.overlap) || ((b.item.rating || 0) - (a.item.rating || 0)));
  return scored.slice(0, maxCount).map(s => s.item);
}

function renderSimilarSection(rootEl, similarItems, currentItem) {
  if (!rootEl) return;
  if (!Array.isArray(similarItems)) similarItems = [];
  const section = document.createElement('section');
  section.className = 'section';
  // Header avec boutons de bascule (Contenu similaire / Épisodes / Acteurs)
  const header = document.createElement('div');
  header.className = 'section-header';
  const similarBtn = document.createElement('button');
  similarBtn.type = 'button';
  similarBtn.className = 'button secondary similar-toggle active';
  similarBtn.textContent = 'Contenu similaire';
  similarBtn.setAttribute('aria-expanded', 'true');
  header.appendChild(similarBtn);
  // Episodes toggle (only for series with known episodes)
  const titleForMatch = (currentItem && currentItem.title) || '';
  const idForMatch = (currentItem && currentItem.id) || '';
  const hasEpisodes = !!(currentItem && (currentItem.type === 'série' || /serie/i.test(idForMatch)) && (EPISODES_DB_NORM[normalizeTitleKey(titleForMatch)] || EPISODES_ID_DB[idForMatch]));
  const episodesBtn = document.createElement('button');
  episodesBtn.type = 'button';
  episodesBtn.className = 'button secondary episodes-toggle';
  episodesBtn.textContent = 'Épisodes';
  episodesBtn.setAttribute('aria-expanded', 'false');
  if (hasEpisodes) header.appendChild(episodesBtn);
  const actorsBtn = document.createElement('button');
  actorsBtn.type = 'button';
  actorsBtn.className = 'button secondary actors-toggle';
  actorsBtn.textContent = 'Acteurs & Doubleurs';
  actorsBtn.setAttribute('aria-expanded', 'false');
  header.appendChild(actorsBtn);
  section.appendChild(header);

  // Panneau des acteurs (caché par défaut)
  const actorsPanel = document.createElement('div');
  actorsPanel.className = 'actors-panel';
  actorsPanel.hidden = true;
  actorsPanel.style.display = 'none';
  actorsPanel.setAttribute('aria-hidden', 'true');
  const actorsTitle = document.createElement('h3');
  actorsTitle.textContent = 'Acteurs & Doubleurs';
  actorsPanel.appendChild(actorsTitle);
  const actorsGrid = document.createElement('div');
  actorsGrid.className = 'actors-grid';
  actorsPanel.appendChild(actorsGrid);
  section.appendChild(actorsPanel);

  // Episodes panel (hidden by default)
  const episodesPanel = document.createElement('div');
  episodesPanel.className = 'episodes-panel';
  episodesPanel.id = 'episodes-section';
  episodesPanel.hidden = true;
  episodesPanel.style.display = 'none';
  episodesPanel.setAttribute('aria-hidden', 'true');
  const episodesTitle = document.createElement('h3');
  episodesTitle.textContent = 'Épisodes';
  episodesPanel.appendChild(episodesTitle);
  const episodesRail = document.createElement('div');
  episodesRail.className = 'episodes-rail';
  // Stack episode buttons vertically
  episodesRail.style.display = 'flex';
  episodesRail.style.flexDirection = 'column';
  episodesRail.style.gap = '10px';
  episodesRail.style.alignItems = 'flex-start';
  episodesRail.style.padding = '8px 0';
  episodesPanel.appendChild(episodesRail);
  if (hasEpisodes) section.appendChild(episodesPanel);

  const rail = document.createElement('div');
  rail.className = 'rail';
  rail.hidden = false;
  rail.style.display = '';
  rail.setAttribute('aria-hidden', 'false');
  const currentFrom = new URLSearchParams(location.search).get('from');
  // helper to strip trailing number and force portrait like 'La', 'Ur', 'Ka', 'Law', 'Al'
  function deriveBase(src) {
    if (!src) return '';
    const m = src.match(/^(.*?)(\d+)?\.(jpg|jpeg|png|webp)$/i);
    return m ? m[1] : src.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  }

  if (similarItems.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'actors-empty';
    empty.textContent = "Aucun contenu similaire trouvé.";
    rail.appendChild(empty);
  } else {
    similarItems.forEach(it => {
      const card = document.createElement('div');
      card.className = 'card';
      const a = document.createElement('a');
      const extra = currentFrom ? `&from=${encodeURIComponent(currentFrom)}` : '';
      a.href = `fiche.html?id=${encodeURIComponent(it.id)}${extra}`;
      const media = document.createElement('div');
      media.className = 'card-media';
      // Robust thumbnail loader: portrait -> landscape -> image -> derived exts -> apercu
      const img = document.createElement('img');
      let candidates = [];
      // Helpers
      function isDerivable(src){ return /\.(jpg|jpeg|png|webp)$/i.test(src || ''); }
      function derivedList(src){
        const list = [];
        const m = (src || '').match(/^(.*?)(\d+)?\.(jpg|jpeg|png|webp)$/i);
        if (!m) return list;
        const base = m[1];
        const ext = (m[3] || '').toLowerCase();
        const order = ext === 'webp' ? ['webp','jpg','jpeg','png'] : ['jpg','jpeg','png'];
        order.forEach(e => list.push(base + '.' + e));
        return list;
      }
      function dedupe(arr){
        const seen = new Set();
        const out = [];
        for (const s of arr) { if (s && !seen.has(s)) { seen.add(s); out.push(s); } }
        return out;
      }
      // Build ordered candidates:
      // 1) portraitImage
      if (it.portraitImage) candidates.push(it.portraitImage);
      // 2) derived-from image (to target portrait base like Al.jpg before Al1.jpg)
      if (it.image && isDerivable(it.image)) candidates.push(...derivedList(it.image));
      // 3) derived-from landscapeImage if provided
      if (it.landscapeImage && isDerivable(it.landscapeImage)) candidates.push(...derivedList(it.landscapeImage));
      // 4) original image, then landscapeImage
      if (it.image) candidates.push(it.image);
      if (it.landscapeImage) candidates.push(it.landscapeImage);
      candidates = dedupe(candidates);
      // Helper to safely apply src (encode local paths with spaces)
      function applySrc(c){
        if (!c) return 'apercu.png';
        if (/^(data:|https?:)/i.test(c)) return c;
        try { return encodeURI(c); } catch { return c; }
      }
      let cIdx = 0;
      img.src = applySrc(candidates[cIdx]) || 'apercu.png';
      img.onerror = function(){
        cIdx += 1;
        if (cIdx < candidates.length) {
          this.src = applySrc(candidates[cIdx]);
        } else {
          this.onerror = null;
          this.src = 'apercu.png';
        }
      };
      img.alt = 'Affiche de ' + (it.title || '');
      img.loading = 'lazy';
      img.decoding = 'async';
      // onerror handler already set above (multi-candidate)
      
      const badge = document.createElement('div');
      badge.className = 'brand-badge';
      const logo = document.createElement('img');
      // Use configured studio badge if present, otherwise default to absolute URL
      try {
        const src = it.studioBadge || 'https://clipsoustreaming.com/clipsoustudio.png';
        logo.src = src;
      } catch { logo.src = 'https://clipsoustreaming.com/clipsoustudio.png'; }
      logo.alt = 'Clipsou Studio';
      logo.loading = 'lazy';
      logo.decoding = 'async';
      badge.appendChild(logo);
      media.appendChild(img);
      media.appendChild(badge);
      const info = document.createElement('div');
      info.className = 'card-info';
      info.setAttribute('data-type', it.type || 'film');
      if (typeof it.rating === 'number') info.setAttribute('data-rating', String(it.rating));
      a.appendChild(media);
      a.appendChild(info);
      card.appendChild(a);
      rail.appendChild(card);
    });
  }

  section.appendChild(rail);

  // Dynamically place the similar section depending on viewport, like the Watch button
  const mq = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;
  const placeSimilar = () => {
    try {
      const wrapEl = rootEl.querySelector('.fiche-content');
      const buttonGroup = rootEl.querySelector('.button-group');
      if (mq && mq.matches) {
        // Mobile: place right after the buttons if present, otherwise after the fiche content
        if (buttonGroup && buttonGroup.parentElement) {
          buttonGroup.insertAdjacentElement('afterend', section);
        } else if (wrapEl && wrapEl.parentElement) {
          wrapEl.insertAdjacentElement('afterend', section);
        } else {
          rootEl.appendChild(section);
        }
      } else {
        // Desktop/tablet: keep as a normal section inside root (after fiche)
        rootEl.appendChild(section);
      }
    } catch (e) {
      // Fallback: append to root
      rootEl.appendChild(section);
    }
  };

  placeSimilar();
  // Default view: show Similar by default; open Episodes only when explicitly requested.
  // If a leftover hash exists from a previous navigation, clear it to avoid jumping on load.
  try {
    if (location.hash === '#episodes-section') {
      try { history.replaceState(null, '', location.pathname + location.search); }
      catch { location.hash = ''; }
    }
  } catch {}
  showSimilar();
  function openEpisodesIfRequested(scroll){
    if (!hasEpisodes) return;
    try {
      if (window.__wantEpisodes) {
        showEpisodes();
        if (scroll) {
          const el = episodesPanel;
          if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        window.__wantEpisodes = false;
      }
    } catch {}
  }
  openEpisodesIfRequested(true);
  try { window.addEventListener('open-episodes', function(){ openEpisodesIfRequested(true); }); } catch {}
  // Gestion du bouton Acteurs
  function populateActors() {
    actorsGrid.innerHTML = '';
    const title = (currentItem && currentItem.title) || '';
    const norm = normalizeTitleKey(title);
    // Prefer actors attached to the current item (from admin-approved data)
    const fromAdmin = !!(currentItem && Array.isArray(currentItem.actors) && currentItem.actors.length);
    const list = fromAdmin
      ? currentItem.actors
      : (ACTOR_DB[title] || ACTOR_DB_NORM[norm] || []);
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'actors-empty';
      empty.textContent = "Aucun acteur renseigné pour cette fiche pour le moment.";
      actorsGrid.appendChild(empty);
      return;
    }
    // If actors come from admin, KEEP EXACT INPUT ORDER. Otherwise apply custom or generic ordering.
    let orderedActors;
    if (fromAdmin) {
      orderedActors = list.slice();
    } else {
      // Apply custom order if specified for this title; fallback to generic ordering otherwise
      const desired = CUSTOM_ACTOR_ORDER[title] || CUSTOM_ACTOR_ORDER_NORM[norm];
      if (Array.isArray(desired) && desired.length) {
        const byKey = new Map();
        list.forEach(a => byKey.set(normalizeTitleKey(a.name || ''), a));
        orderedActors = [];
        // add in specified order if present
        desired.forEach(name => {
          const key = normalizeTitleKey(name);
          if (byKey.has(key)) {
            orderedActors.push(byKey.get(key));
            byKey.delete(key);
          }
        });
        // append the remaining (not specified) preserving original appearance order
        list.forEach(a => {
          const key = normalizeTitleKey(a.name || '');
          if (byKey.has(key)) {
            orderedActors.push(a);
            byKey.delete(key);
          }
        });
      } else {
        // Generic ordering fallback
        orderedActors = list.slice().map((a, idx) => {
          const nameRaw = String(a.name || '').trim();
          const slug = ACTOR_IMAGE_MAP[nameRaw] || ACTOR_IMAGE_MAP['Unknown'];
          const hasImage = !!slug && slug !== 'unknown';
          const isLiam = nameRaw.toLowerCase() === 'liam roxxor';
          let rank = 1;
          if (hasImage) rank = 0; else rank = 2;
          if (isLiam) rank = -1;
          return { a, idx, rank };
        }).sort((x, y) => (x.rank - y.rank) || (x.idx - y.idx)).map(x => x.a);
      }
    }
    orderedActors.forEach((a) => {
      const card = document.createElement('div');
      card.className = 'actor-card';
      const imgWrap = document.createElement('div');
      imgWrap.className = 'actor-photo';
      // Center content inside photo box to avoid any cropping issues on mobile
      imgWrap.style.display = 'flex';
      imgWrap.style.alignItems = 'center';
      imgWrap.style.justifyContent = 'center';
      const img = document.createElement('img');
      const nameRaw = String(a.name || '').trim();
      const baseSlug = ACTOR_IMAGE_MAP[nameRaw] || ACTOR_IMAGE_MAP['Unknown'];
      // Prefer the explicit photo provided by admin if present; otherwise use slug-based local images
      if (a && a.photo) {
        try { img.src = a.photo; } catch { img.src = a.photo || './unknown.jpeg'; }
        // mark as having explicit photo to skip slug fallback
        img.setAttribute('data-explicit-photo', '1');
      } else {
        // Start with jpeg, then try other extensions
        img.src = './' + baseSlug + '.jpeg';
        // Keep slug for retries with other extensions
        img.setAttribute('data-slug', baseSlug);
      }
      img.alt = a.name;
      // Strong inline sizing to enforce perfect square thumbnails filled by the image
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'cover';
      img.style.objectPosition = 'center center';
      img.style.display = 'block';
      img.decoding = 'async';
      // Fallback automatique multi-extensions puis Unknown (only for slug-based images)
      img.onerror = function(){
        if (this.getAttribute('data-explicit-photo') === '1') {
          // If explicit photo fails, fallback to Unknown directly
          this.onerror = null; this.src = './unknown.jpeg'; return;
        }
        var slug = this.getAttribute('data-slug');
        if (!slug) { this.onerror = null; this.src = './unknown.jpeg'; return; }
        var i = (parseInt(this.dataset.i || '0', 10) || 0) + 1;
        this.dataset.i = i;
        var exts = ['jpeg','jpg','png','webp'];
        if (i < exts.length) {
          this.src = './' + slug + '.' + exts[i];
        } else {
          this.onerror = null;
          this.src = './unknown.jpeg';
        }
      };
      imgWrap.appendChild(img);
      const nameEl = document.createElement('div');
      nameEl.className = 'actor-name';
      nameEl.textContent = a.name;
      const roleEl = document.createElement('div');
      roleEl.className = 'actor-role';
      roleEl.textContent = a.role || '';
      card.appendChild(imgWrap);
      card.appendChild(nameEl);
      card.appendChild(roleEl);
      actorsGrid.appendChild(card);
    });
  }

  function showSimilar() {
    // Afficher uniquement le rail similaire et masquer le panneau des acteurs
    rail.hidden = false;
    rail.style.display = '';
    rail.setAttribute('aria-hidden', 'false');
    actorsPanel.hidden = true;
    actorsPanel.style.display = 'none';
    actorsPanel.setAttribute('aria-hidden', 'true');
    if (hasEpisodes) { episodesPanel.hidden = true; episodesPanel.style.display = 'none'; episodesPanel.setAttribute('aria-hidden','true'); }
    section.classList.remove('actors-open');
    section.classList.remove('episodes-open');
    similarBtn.classList.add('active');
    if (hasEpisodes) episodesBtn.classList.remove('active');
    actorsBtn.classList.remove('active');
    similarBtn.setAttribute('aria-expanded', 'true');
    if (hasEpisodes) episodesBtn.setAttribute('aria-expanded', 'false');
    actorsBtn.setAttribute('aria-expanded', 'false');
  }
  function showActors() {
    populateActors();
    // Afficher uniquement le panneau acteurs et masquer le rail similaire
    rail.hidden = true;
    rail.style.display = 'none';
    rail.setAttribute('aria-hidden', 'true');
    actorsPanel.hidden = false;
    actorsPanel.style.display = '';
    actorsPanel.setAttribute('aria-hidden', 'false');
    if (hasEpisodes) { episodesPanel.hidden = true; episodesPanel.style.display = 'none'; episodesPanel.setAttribute('aria-hidden','true'); }
    section.classList.add('actors-open');
    section.classList.remove('episodes-open');
    actorsBtn.classList.add('active');
    similarBtn.classList.remove('active');
    if (hasEpisodes) episodesBtn.classList.remove('active');
    actorsBtn.setAttribute('aria-expanded', 'true');
    similarBtn.setAttribute('aria-expanded', 'false');
    if (hasEpisodes) episodesBtn.setAttribute('aria-expanded', 'false');
  }
  function populateEpisodes(){
    episodesRail.innerHTML = '';
    const title = (currentItem && currentItem.title) || '';
    const idForMatch = (currentItem && currentItem.id) || '';
    let list = EPISODES_DB_NORM[normalizeTitleKey(title)] || [];
    if (!list.length) list = EPISODES_ID_DB[idForMatch] || [];
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'actors-empty';
      empty.textContent = "Aucun épisode disponible.";
      episodesRail.appendChild(empty);
      return;
    }
    list.forEach(ep => {
      const a = document.createElement('a');
      a.href = ep.url;
      a.className = 'button';
      const label = ep && ep.title ? `Épisode ${ep.n} — ${ep.title}` : `Épisode ${ep.n}`;
      a.textContent = label;
      a.setAttribute('data-title', `${title} – Épisode ${ep.n}` + (ep && ep.title ? ` — ${ep.title}` : ''));
      a.style.display = 'block';
      episodesRail.appendChild(a);
    });
  }
  function showEpisodes(){
    if (!hasEpisodes) return;
    populateEpisodes();
    rail.hidden = true; rail.style.display = 'none'; rail.setAttribute('aria-hidden','true');
    actorsPanel.hidden = true; actorsPanel.style.display = 'none'; actorsPanel.setAttribute('aria-hidden','true');
    episodesPanel.hidden = false; episodesPanel.style.display = ''; episodesPanel.setAttribute('aria-hidden','false');
    section.classList.add('episodes-open');
    section.classList.remove('actors-open');
    similarBtn.classList.remove('active');
    actorsBtn.classList.remove('active');
    episodesBtn.classList.add('active');
    similarBtn.setAttribute('aria-expanded', 'false');
    actorsBtn.setAttribute('aria-expanded', 'false');
    episodesBtn.setAttribute('aria-expanded', 'true');
    // Smooth scroll to the episodes section for a clear animation down the page
    try {
      setTimeout(() => { if (episodesPanel && episodesPanel.scrollIntoView) episodesPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 0);
    } catch {}
  }
  // Expose a global opener so external buttons (e.g., "Voir les épisodes") can invoke it reliably
  try { window.__openEpisodes = function(){ try { showEpisodes(); } catch {} }; } catch {}
  actorsBtn.addEventListener('click', showActors);
  similarBtn.addEventListener('click', showSimilar);
  if (hasEpisodes) episodesBtn.addEventListener('click', showEpisodes);
  if (mq) {
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', placeSimilar);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(placeSimilar);
    }
  } else {
    window.addEventListener('resize', placeSimilar);
    window.addEventListener('orientationchange', placeSimilar);
  }
}

function renderList(container, items, titleText) {
  container.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'fiche-content';
  if (titleText) {
    const h = document.createElement('h3');
    h.textContent = titleText;
    box.appendChild(h);
  }
  const grid = document.createElement('div');
  grid.className = 'rail';
  items.forEach(it => {
    const card = document.createElement('div');
    card.className = 'card';
    const a = document.createElement('a');
    a.href = `fiche.html?id=${encodeURIComponent(it.id)}`;
    const media = document.createElement('div');
    media.className = 'card-media';
    const img = document.createElement('img');
    img.src = it.image || 'apercu.png';
    img.alt = 'Affiche de ' + (it.title || '');
    img.loading = 'lazy';
    img.decoding = 'async';
    const badge = document.createElement('div');
    badge.className = 'brand-badge';
    const logo = document.createElement('img');
    logo.src = 'clipsoustudio.png';
    logo.alt = 'Clipsou Studio';
    logo.loading = 'lazy';
    logo.decoding = 'async';
    badge.appendChild(logo);
    media.appendChild(img);
    media.appendChild(badge);
    const info = document.createElement('div');
    info.className = 'card-info';
    info.setAttribute('data-type', it.type || 'film');
    if (typeof it.rating === 'number') info.setAttribute('data-rating', String(it.rating));
    a.appendChild(media);
    a.appendChild(info);
    card.appendChild(a);
    grid.appendChild(card);
  });
  box.appendChild(grid);
  container.appendChild(box);
}

function updateHeadSEO(item) {
  if (!item) return;
  const baseTitle = 'Clipsou Streaming';
  document.title = `${item.title} – ${baseTitle}`;
  const desc = item.description || 'Fiche du film ou de la série';
  const url = new URL(location.href);
  const imageAbs = new URL(item.image || 'apercu.png', location.origin + location.pathname.replace(/[^\/]+$/, ''));

  setMetaTag('meta[name="description"]', 'content', desc);
  setMetaTag('meta[property="og:title"]', 'content', document.title);
  setMetaTag('meta[property="og:description"]', 'content', desc);
  setMetaTag('meta[property="og:type"]', 'content', 'video.other');
}

document.addEventListener('DOMContentLoaded', async function () {
const params = new URLSearchParams(location.search);
const id = params.get('id');
const container = document.getElementById('fiche-container');

  const items = await buildItemsFromIndex();
  // Prefer the richest duplicate for this id (carry studioBadge and best images/metadata)
  let item = (function pickBestById(list, targetId){
    const cands = list.filter(it => it && it.id === targetId);
    if (!cands.length) return list.find(it => it && it.id === targetId);
    const score = (x) => {
      let s = 0;
      if (x && x.studioBadge) s += 6; // prioritize custom badge strongly
      if (x && (x.landscapeImage || x.portraitImage || x.image)) s += 3;
      if (typeof x.rating === 'number') s += 1;
      if (Array.isArray(x.genres) && x.genres.length) s += 1;
      if (x && x.description) s += 1;
      if (x && x.watchUrl) s += 1;
      if (Array.isArray(x.actors) && x.actors.length) s += 1;
      return s;
    };
    // Reduce to best and merge critical fields so nothing is lost
    const best = cands.reduce((acc, cur) => {
      if (!acc) return { ...cur };
      const chosen = score(cur) >= score(acc) ? { ...cur } : { ...acc };
      const other  = chosen === cur ? acc : cur;
      // Preserve studioBadge if present on either
      if (!chosen.studioBadge && other && other.studioBadge) chosen.studioBadge = other.studioBadge;
      // Prefer explicit portrait/landscape images; keep a generic image as fallback
      chosen.portraitImage = chosen.portraitImage || other.portraitImage || '';
      chosen.landscapeImage = chosen.landscapeImage || other.landscapeImage || '';
      chosen.image = chosen.image || other.image || '';
      // Fill missing metadata
      if (!chosen.description) chosen.description = other.description || '';
      if (!chosen.watchUrl) chosen.watchUrl = other.watchUrl || '';
      if ((!chosen.actors || !chosen.actors.length) && Array.isArray(other.actors) && other.actors.length) chosen.actors = other.actors.slice();
      if (typeof chosen.rating !== 'number' && typeof other.rating === 'number') chosen.rating = other.rating;
      if ((!chosen.genres || !chosen.genres.length) && Array.isArray(other.genres) && other.genres.length) chosen.genres = other.genres.slice();
      return chosen;
    }, null);
    return best;
  })(items, id);

  if (!id) {
    document.title = 'Toutes les fiches – Clipsou Streaming';
    renderList(container, items, 'Choisissez une fiche');
    return;
  }

  if (!item) {
    // Fallback: try to load approved items directly by id
    try {
      const raw = localStorage.getItem('clipsou_items_approved_v1');
      if (raw) {
        const apr = JSON.parse(raw);
        if (Array.isArray(apr)) {
          const alt = apr.find(it => it && it.id === id);
          if (alt) {
            const type = alt.type || 'film';
            const rating = (typeof alt.rating === 'number') ? alt.rating : undefined;
            const genres = Array.isArray(alt.genres) ? alt.genres.filter(Boolean) : [];
            const image = alt.landscapeImage || alt.image || alt.portraitImage || '';
            const description = alt.description || '';
            const watchUrl = alt.watchUrl || '';
            const actors = Array.isArray(alt.actors) ? alt.actors.filter(a=>a && a.name) : [];
            const altItem = { id: alt.id, title: alt.title, type, rating, genres, image, description, watchUrl, actors };
            updateHeadSEO(altItem);
            renderFiche(container, altItem);
            try {
              const similar = computeSimilar(items.concat([altItem]), altItem, 2, 10);
              const root = document.getElementById('fiche');
              renderSimilarSection(root, similar, altItem);
            } catch {}
            return;
          }
        }
      }
    } catch {}

    document.title = 'Fiche introuvable – Clipsou Streaming';
    renderList(container, items, 'Fiche introuvable – choisissez parmi la liste');
    return;
  }

  updateHeadSEO(item);
  renderFiche(container, item);
  // Render similar content below the fiche (require at least 2 shared genres)
  try {
    const renderSimilarNow = async () => {
      let similar = computeSimilar(items, item, 2, 12);
      // Also ensure admin-approved items that match are included
      try {
      const raw = localStorage.getItem('clipsou_items_approved_v1');
      if (raw) {
        const apr = JSON.parse(raw);
        if (Array.isArray(apr)) {
          const norm = (s) => {
            try { return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
            catch { return String(s||'').toLowerCase().trim(); }
          };
          const cur = new Set((item.genres||[]).map(g=>norm(g)).filter(Boolean));
          const matches = apr
            .filter(it => it && it.id && it.id !== item.id)
            .map(it => ({
              it,
              gset: new Set((Array.isArray(it.genres) ? it.genres : []).map(g=>norm(g)).filter(Boolean))
            }))
            .map(x => ({ item: {
                id: x.it.id,
                title: x.it.title,
                type: x.it.type || 'film',
                rating: (typeof x.it.rating==='number')?x.it.rating:undefined,
                genres: Array.isArray(x.it.genres)?x.it.genres:[],
                image: x.it.landscapeImage || x.it.image || x.it.portraitImage || '',
                portraitImage: x.it.portraitImage || '',
                landscapeImage: x.it.landscapeImage || ''
              },
              overlap: Array.from(x.gset).reduce((n,g)=>n + (cur.has(g)?1:0), 0)
            }))
            .filter(x => x.overlap >= 2)
            .sort((a,b)=>(b.overlap-a.overlap)||((b.item.rating||0)-(a.item.rating||0)))
            .map(x=>x.item);
          // Merge and dedupe by id
          const byId = new Map();
          similar.forEach(s => byId.set(s.id, s));
          matches.forEach(s => byId.set(s.id, s));
          similar = Array.from(byId.values()).filter(s => s.id !== item.id).slice(0, 12);
        }
      }
    } catch {}
      const root = document.getElementById('fiche');
      renderSimilarSection(root, similar, item);
    };
    if (window.requestIdleCallback) requestIdleCallback(() => { renderSimilarNow(); }); else setTimeout(renderSimilarNow, 0);
  } catch (e) {
    console.warn('Impossible de générer le contenu similaire', e);
  }

  // On-site player: play intro.mp4 then embed the YouTube video in a full-screen overlay (fiche page)
  (function installOnsitePlayer(){
    try {
      if (window.__introHookInstalled) return; // idempotent across this page
      window.__introHookInstalled = true;

      function isYouTubeUrl(href){
        try {
          if (!href) return false;
          if (/^javascript:/i.test(href)) return false;
          const url = href.startsWith('http') ? new URL(href) : new URL(href, location.href);
          const h = (url.hostname || '').toLowerCase();
          return h.includes('youtube.com') || h.includes('youtu.be');
        } catch { return false; }
      }

      function ensurePlayerOverlay(){
        let overlay = document.querySelector('.player-overlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.className = 'player-overlay';
        const shell = document.createElement('div'); shell.className = 'player-shell';
        const top = document.createElement('div'); top.className = 'player-topbar';
        const titleEl = document.createElement('h4'); titleEl.className = 'player-title'; titleEl.textContent = 'Lecture';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'player-close';
        closeBtn.setAttribute('aria-label','Fermer le film en cours');
        closeBtn.textContent = '✕ Fermer';
        top.appendChild(titleEl); top.appendChild(closeBtn);
        const stage = document.createElement('div'); stage.className = 'player-stage';
        shell.appendChild(top); shell.appendChild(stage);
        overlay.appendChild(shell); document.body.appendChild(overlay);
        const close = ()=>{
          try { if (typeof overlay.__activeCleanup === 'function') overlay.__activeCleanup(); } catch {}
          try { window.__introShowing = false; } catch {}
          try { document.body.classList.remove('player-open'); document.documentElement.classList.remove('player-open'); } catch {}
          overlay.classList.remove('open');
          try { stage.querySelectorAll('video').forEach(v=>{ try { v.pause(); } catch{} }); } catch{}
          try { stage.querySelectorAll('iframe').forEach(f=>{ f.src = 'about:blank'; }); } catch{}
          stage.innerHTML = '';
          try { overlay.classList.remove('intro-mode'); } catch {}
        };
        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', (e)=>{ if (e.target === overlay) close(); });
        document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && overlay.classList.contains('open')) close(); }, { passive: true });
        overlay.__close = close;
        return overlay;
      }

      function toEmbedUrl(href){
        try {
          const url = href.startsWith('http') ? new URL(href) : new URL(href, location.href);
          const h = (url.hostname||'').toLowerCase();
          const params = new URLSearchParams(url.search);
          // Autoplay enabled
          const common = '&autoplay=1&rel=0&modestbranding=1&controls=1&playsinline=1';
          if (h.includes('youtu.be')){
            const id = url.pathname.replace(/^\//,'');
            return 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?enablejsapi=1' + common;
          }
          if (h.includes('youtube.com')){
            if (url.pathname.startsWith('/watch')){
              const id = params.get('v') || '';
              return 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?enablejsapi=1' + common;
            }
            if (url.pathname.startsWith('/playlist')){
              const list = params.get('list') || '';
              return 'https://www.youtube.com/embed/videoseries?list=' + encodeURIComponent(list) + common;
            }
          }
        } catch {}
        return href;
      }

      function showIntroThenPlay(targetHref, linkTitle){
        try { if (window.__introShowing) return; } catch {}
        window.__introShowing = true;
        const overlay = ensurePlayerOverlay();
        const titleEl = overlay.querySelector('.player-title');
        const stage = overlay.querySelector('.player-stage');
        if (titleEl && linkTitle) titleEl.textContent = linkTitle;
        try { document.body.classList.add('player-open'); document.documentElement.classList.add('player-open'); } catch {}
        overlay.classList.add('open');
        try { overlay.classList.add('intro-mode'); } catch {}
        stage.innerHTML = '';
        const intro = document.createElement('video');
        intro.src = 'intro.mp4'; intro.autoplay = true; intro.playsInline = true; intro.controls = false; intro.preload = 'auto';
        try { intro.muted = false; intro.defaultMuted = false; intro.volume = 1.0; } catch {}
        Object.assign(intro.style, { width: '100%', height: '100%', objectFit: (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) ? 'contain' : 'cover', display: 'block' });
        let started = false;
        let cleaned = false;
        function cleanupActive(){
          if (cleaned) return; cleaned = true;
          try { clearTimeout(watchdog); } catch {}
          try { intro.removeEventListener('ended', startMain); } catch {}
          try { intro.removeEventListener('error', startMain); } catch {}
          try { window.__introShowing = false; } catch {}
          started = true;
        }
        function startMain(){
          if (started) return; started = true;
          try { cleanupActive(); } catch {}
          try { intro.pause(); } catch {}
          stage.innerHTML = '';
          const iframe = document.createElement('iframe');
          iframe.allowFullscreen = true;
          iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
          iframe.src = toEmbedUrl(targetHref);
          stage.appendChild(iframe);
          window.__introShowing = false;
        }
        intro.addEventListener('ended', startMain, { once: true });
        intro.addEventListener('error', startMain, { once: true });
        const watchdog = setTimeout(()=>{
          try {
            const progressed = (intro.currentTime||0) > 0.1;
            if (!progressed && !intro.ended && !started) startMain();
          } catch { startMain(); }
        }, 8000);
        try { overlay.__activeCleanup = cleanupActive; } catch {}
        stage.appendChild(intro);
        try { const p = intro.play(); if (p && typeof p.catch === 'function') p.catch(()=>{}); } catch {}
      }

      document.addEventListener('click', function(e){
        try {
          const a = e.target && (e.target.closest ? e.target.closest('a') : null);
          if (!a) return;
          const href = a.getAttribute('href') || '';
          if (!isYouTubeUrl(href)) return;
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || (e.button && e.button !== 0)) return;
          e.preventDefault();
          const title = (a.closest('.fiche-right')?.querySelector('h3')?.textContent || a.getAttribute('data-title') || '').trim();
          showIntroThenPlay(href, title);
        } catch {}
      }, true);
    } catch {}
  })();

});
