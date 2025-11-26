'use strict';

// Utilise les fonctions partagées de utilities.js (pas de duplication)

// Activer le lazy loading optimisé pour toutes les images
installLazyImageLoader();

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
          h.endsWith('tipeee.com') || h.endsWith('fr.tipeee.com')
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

// Episodes database per series title
const EPISODES_DB = {
  'Alex': [
    { n: 1, url: 'https://www.youtube.com/watch?v=Uynd10bGS6I&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=1', title: 'SAUVER Zigzag !' },
    { n: 2, url: 'https://www.youtube.com/watch?v=QfTsODE-HIU&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=2', title: 'EXPLOSION' },
    { n: 3, url: 'https://www.youtube.com/watch?v=up7Q2jBlSOo&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=3', title: 'LA PLANTE' },
    { n: 4, url: 'https://www.youtube.com/watch?v=DmUG8oVmzMk&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=4', title: 'Un petit feu de camp' },
    { n: 5, url: 'https://www.youtube.com/watch?v=JzPlADBeDto&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=5', title: 'Une Banane' },
    { n: 6, url: 'https://www.youtube.com/watch?v=Jm-Mwy6733Y&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=6', title: 'BOOM (8x8x8 X challenge)' },
    { n: 7, url: 'https://www.youtube.com/watch?v=RYM7vH96y1I&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=7', title: 'Alex contre LA MAIN' },
    { n: 8, url: 'https://www.youtube.com/watch?v=yMYoD9I1xs0&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=8', title: 'Casser une vitre animation' },
    { n: 9, url: 'https://www.youtube.com/watch?v=IQXjgoYKyYU&list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf&index=9', title: 'Deadpool lego combat stop motion' }
  ],
  'Lawless Legend': [
    { n: 1, url: 'https://www.youtube.com/watch?v=I21K4Ksf_4A&list=PLljfI9MJr5K2Li687G4dOxjfyDQkIfJn3&index=1', title: "De l'argent volé pour de l'argent gagné" },
    { n: 2, url: 'https://www.youtube.com/watch?v=jfbOQ7kWKw0&list=PLljfI9MJr5K2Li687G4dOxjfyDQkIfJn3&index=2', title: 'Les voleurs ennemis' },
    { n: 3, url: 'https://www.youtube.com/watch?v=JCW8qyJCqbA&list=PLljfI9MJr5K2Li687G4dOxjfyDQkIfJn3&index=3', title: 'Une mauvaise nouvelle' }
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
  'serie2': EPISODES_DB['Lawless Legend']
};

// Cache index.html in-session to avoid repeated network/file reads
let __INDEX_HTML_CACHE = null;
async function fetchIndexHtmlCached() {
  if (__INDEX_HTML_CACHE && typeof __INDEX_HTML_CACHE === 'string') return __INDEX_HTML_CACHE;
  // When running locally via file://, fetching index.html will CORS-fail. Skip and return empty.
  try {
    if (location && location.protocol === 'file:') {
      __INDEX_HTML_CACHE = '';
      return __INDEX_HTML_CACHE;
    }
  } catch {}
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
    image: 'images/La1.webp',
    genres: ['Comédie','Familial','Aventure'],
    rating: 2.5,
    type: 'film',
    description: "Timmy, un enfant espiègle, nous fait visiter son village dans un monde entièrement construit en briques LEGO. Mais chaque coin de rue réserve son lot de gags et de surprises ! Une aventure familiale pleine d'humour et de tendresse qui ravira petits et grands.",
    watchUrl: 'https://youtu.be/XtqzuhtuH2E?si=e-89Qu0t_vrO0RzG'
  },
  {
    id: 'film2',
    title: 'Dédoublement',
    image: 'images/Dé1.webp',
    genres: ['Thriller','Comédie','Action'],
    rating: 4,
    type: 'film',
    description: "Deux frères identiques, l'un vêtu de blanc et l'autre de noir, s'entendent à merveille… jusqu'à ce que l'un finisse en prison. Dans l'univers de Minecraft, ce thriller haletant mêle comédie, suspense et évasion.",
    watchUrl: 'https://www.youtube.com/watch?v=gfbiTpqQDY0'
  },
  {
    id: 'film3',
    title: 'Jackson Goup',
    image: 'images/Ja1.webp',
    genres: ['Aventure','Fantastique','Comédie'],
    rating: 3.5,
    type: 'film',
    description: "Un aventurier un peu maladroit traverse des contrées hostiles remplies de créatures féroces. Tourné en prise de vue réelle (live action), ce périple épique mêle humour et fantastique pour un voyage plein de surprises.",
    watchUrl: 'https://www.youtube.com/watch?v=VUqwvqQ51sg'
  },
  {
    id: 'serie1',
    title: 'Alex',
    image: 'images/Al1.webp',
    genres: ['Action','Comédie','Familial'],
    rating: 3,
    type: 'série',
    description: "Suivez les aventures captivantes d'Alex, un personnage attachant dans un univers en briques LEGO. Cette série brickfilm innovante mêle action, humour et émotion dans des épisodes soigneusement réalisés qui plairont à tous les âges.",
    watchUrl: 'https://www.youtube.com/playlist?list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf'
  },
  {
    id: 'serie2',
    title: 'Lawless Legend',
    image: 'images/Law1.webp',
    genres: ['Western','Comédie','Action'],
    rating: 3,
    type: 'série',
    description: "Plongez dans l'univers du Far West à travers cette série brickfilm unique ! Cowboys en briques LEGO, duels au soleil couchant et esthétique VHS nostalgique : cette série réinvente le western avec humour dans un style rétro irrésistible.",
    watchUrl: 'https://youtube.com/playlist?list=PLljfI9MJr5K2Li687G4dOxjfyDQkIfJn3&si=FQ0ImMc9j-6wvtRk'
  },
  {
    id: 'film4',
    title: 'Karma',
    image: 'images/Ka1.webp',
    genres: ['Horreur','Mystère','Psychologique'],
    rating: 2.5,
    type: 'film',
    description: "Victime de harcèlement scolaire, une adolescente met fin à ses jours. Réalisé en prise de vue réelle, ce récit surnaturel suit le retour d'un esprit tourmenté qui hante son bourreau et le plonge dans une spirale de terreur.",
    watchUrl: 'https://www.youtube.com/watch?v=p79g08Igceo'
  },
  {
    id: 'film5',
    title: 'Trailer BATMAN',
    image: 'images/Ba1.webp',
    genres: ['Action','Drame','Super-héros'],
    type: 'trailer',
    description: "Un nouveau trailer de Batman, sombre et intense, réimaginé dans l'univers Minecraft. Découvrez des premières images qui redéfinissent le chevalier noir avec une approche moderne et spectaculaire.",
    watchUrl: 'https://www.youtube.com/watch?v=SzbqZNObLNU'
  },
  {
    id: 'film6',
    title: 'URBANOS city',
    image: 'images/Ur1.webp',
    genres: ['Comédie','Familial','Enfants'],
    rating: 2,
    type: 'film',
    description: "Le Noob vous présente, avec humour, la ville d'Urbanos créée sur Minecraft.",
    watchUrl: 'https://www.youtube.com/watch?v=ZcnWsRXHLic'
  },
  {
    id: 'film7',
    title: 'Backrooms URBANOS',
    image: 'images/Bac1.webp',
    genres: ['Horreur','Mystère','Ambience'],
    rating: 3.5,
    type: 'film',
    description: "Après avoir chuté à travers le sol, Noob se retrouve piégé dans les Backrooms : un dédale sans fin de couloirs jaunâtres où bourdonnent les néons et où rôdent d’étranges présences...",
    watchUrl: 'https://www.youtube.com/watch?v=b1BSjegjM_s'
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

// Utilise normalizeTitleKey de utilities.js

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
const BASE_FICHE_ITEMS = [];
let ficheLiveApproved = [];
let ficheLocalApproved = [];
let ficheLiveAttached = false;

function mapFicheEntry(entry) {
  if (!entry || !entry.id || !entry.title) return null;
  const type = entry.type || 'film';
  const genres = Array.isArray(entry.genres) ? entry.genres.filter(Boolean) : [];
  const image = optimizeCloudinaryUrl(entry.landscapeImage || entry.image || entry.portraitImage || '');
  const description = entry.description || '';
  const watchUrl = entry.watchUrl || '';
  const actors = Array.isArray(entry.actors) ? entry.actors.filter(a=>a && a.name) : [];
  const episodes = Array.isArray(entry.episodes) ? entry.episodes.slice() : [];
  const studioBadge = optimizeCloudinaryUrlSmall((entry.studioBadge || '').trim());
  return { id: entry.id, title: entry.title, type, rating: typeof entry.rating === 'number' ? entry.rating : undefined, genres, image, description, watchUrl, actors, episodes, portraitImage: entry.portraitImage || '', landscapeImage: entry.landscapeImage || '', studioBadge };
}

function rebuildFicheItems() {
  const merged = [...BASE_FICHE_ITEMS, ...ficheLiveApproved.filter(Boolean), ...ficheLocalApproved.filter(Boolean)];
  const deduped = dedupeByIdAndTitle(merged);
  return deduped.length ? deduped : LOCAL_FALLBACK_DB;
}

async function buildItemsFromIndex() {
  try {
    const html = await fetchIndexHtmlCached();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    BASE_FICHE_ITEMS.length = 0;
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
      BASE_FICHE_ITEMS.push({ id, title, image, genres, rating, type, description, watchUrl });
    });

    await hydrateApprovedSnapshots();
    attachFicheLiveSync();
    return rebuildFicheItems();
  } catch (e) {
    console.error('Failed to build items from index:', e);
    return LOCAL_FALLBACK_DB;
  }
}

async function hydrateApprovedSnapshots() {
  try {
    let isFile = false;
    try { isFile = (location && location.protocol === 'file:'); } catch {}
    if (!isFile) {
      let approvedUrl = 'data/approved.json';
      try {
        const cfgUrl = window?.ClipsouConfig?.publicApprovedUrl;
        if (cfgUrl) approvedUrl = cfgUrl;
      } catch {}
      try {
        approvedUrl = new URL(approvedUrl, location.href).toString();
      } catch {}
      const res = await fetch(approvedUrl, { cache: 'no-store', credentials: 'omit' });
      if (res && res.ok) {
        const approved = await res.json();
        if (Array.isArray(approved)) {
          ficheLiveApproved = approved.map(mapFicheEntry).filter(Boolean);
        }
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem('clipsou_items_approved_v1');
    if (raw) {
      const approved = JSON.parse(raw);
      if (Array.isArray(approved)) {
        ficheLocalApproved = approved.map(mapFicheEntry).filter(Boolean);
      }
    }
  } catch {}
}

function attachFicheLiveSync() {
  if (ficheLiveAttached) return;
  ficheLiveAttached = true;
  try {
    if (window.ClipsouLiveSync && typeof window.ClipsouLiveSync.ensureDefaultSources === 'function') {
      window.ClipsouLiveSync.ensureDefaultSources();
    }
  } catch {}

  window.addEventListener('clipsou-live-data', function(event) {
    const detail = event && event.detail;
    if (!detail || !detail.key) return;
    if (detail.key === 'approved' && Array.isArray(detail.data)) {
      ficheLiveApproved = detail.data.map(mapFicheEntry).filter(Boolean);
      refreshFicheIfVisible();
    }
  });

  window.addEventListener('storage', function(e) {
    if (e && e.key === 'clipsou_items_approved_v1') {
      try {
        const raw = localStorage.getItem('clipsou_items_approved_v1');
        if (raw) {
          const approved = JSON.parse(raw);
          if (Array.isArray(approved)) {
            ficheLocalApproved = approved.map(mapFicheEntry).filter(Boolean);
            refreshFicheIfVisible();
          }
        }
      } catch {}
    }
  });
}

function refreshFicheIfVisible() {
  try {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (!id) return;
    const container = document.getElementById('fiche-container');
    if (!container) return;
    const merged = rebuildFicheItems();
    const item = merged.find(it => it && it.id === id);
    if (!item) return;
    container.innerHTML = '';
    updateHeadSEO(item);
    renderFiche(container, item);
    try {
      const similar = computeSimilar(merged, item, 2, 12);
      const root = document.getElementById('fiche');
      renderSimilarSection(root, similar, item);
    } catch {}
  } catch {}
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

function clampFicheTitleLines(el, options = {}) {
  if (!el) return;
  const maxLines = Number.isFinite(options.maxLines) ? options.maxLines : 3;
  const minSize = Number.isFinite(options.minSize) ? options.minSize : 18;
  const step = Number.isFinite(options.step) ? options.step : 1;
  const baseRatio = Number.isFinite(options.lineHeightRatio) ? options.lineHeightRatio : 1.12;
  const watch = options.watch !== false;

  const measure = () => {
    if (!el || !el.isConnected) return;
    el.style.fontSize = '';
    el.style.lineHeight = '';
    const computed = window.getComputedStyle(el);
    let fontSize = parseFloat(computed.fontSize) || 40;
    let ratio = baseRatio;
    const computedLineHeight = parseFloat(computed.lineHeight);
    if (Number.isFinite(computedLineHeight) && computedLineHeight > 0 && fontSize > 0) {
      ratio = computedLineHeight / fontSize;
    }
    const allowed = () => (fontSize * ratio * maxLines) + 0.5;
    let guard = 0;
    const min = Math.max(10, minSize);
    while (el.scrollHeight > allowed() && fontSize > min && guard < 80) {
      fontSize = Math.max(min, fontSize - step);
      el.style.fontSize = fontSize + 'px';
      el.style.lineHeight = (fontSize * ratio).toFixed(2) + 'px';
      guard++;
    }
    if (!el.style.lineHeight) {
      el.style.lineHeight = (fontSize * ratio).toFixed(2) + 'px';
    }
  };

  const run = () => {
    if (!el || !el.isConnected) return;
    window.requestAnimationFrame(measure);
  };

  run();

  if (watch) {
    const handler = () => {
      if (!el || !el.isConnected) {
        window.removeEventListener('resize', handler);
        window.removeEventListener('orientationchange', handler);
        window.removeEventListener('languageChanged', handler);
        return;
      }
      run();
    };
    window.addEventListener('resize', handler, { passive: true });
    window.addEventListener('orientationchange', handler);
    window.addEventListener('languageChanged', handler);
  }
}

function renderFiche(container, item) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'fiche-content landscape-layout';
  const titlesToClamp = [];

  const left = document.createElement('div');
  left.className = 'fiche-left';
  // Wrap media so overlay can be positioned relative to the image bounds
  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'fiche-media-wrap';
  const img = document.createElement('img');
  if (item.image) { try { img.src = item.image; } catch {} }
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
  titlesToClamp.push({ el: h3 });

  const rg = document.createElement('div');
  rg.className = 'rating-genres';
  let stars = null;
  let ratingBadge = null;
  const ensureRatingBadge = () => {
    if (!ratingBadge && stars && mediaWrap) {
      ratingBadge = document.createElement('div');
      ratingBadge.className = 'mobile-rating-badge';
      mediaWrap.appendChild(ratingBadge);
    }
  };
  const applyStarMarkup = (node, displayText) => {
    try {
      if (!node || !displayText) return;
      const safe = String(displayText);
      const rest = safe.startsWith('★') ? safe.slice(1) : safe;
      node.innerHTML = `<span class="star-symbol" aria-hidden="true">★</span>${rest}`;
      node.setAttribute('data-rating-text', safe);
    } catch {}
  };
  const syncRatingBadge = () => {
    try {
      if (stars && stars.textContent) {
        ensureRatingBadge();
        if (ratingBadge) {
          const markup = stars.innerHTML || stars.textContent;
          ratingBadge.innerHTML = markup;
          ratingBadge.setAttribute('aria-label', stars.textContent || '');
        }
      } else if (ratingBadge) {
        ratingBadge.remove();
        ratingBadge = null;
      }
    } catch {}
  };
  const ratingInfo = (function(){
    try {
      if (window.__ClipsouRatings && typeof window.__ClipsouRatings.resolveRatingValue === 'function') {
        const res = window.__ClipsouRatings.resolveRatingValue(item.id, item.rating, item.ratingCount);
        if (res && typeof res.rating === 'number' && !Number.isNaN(res.rating)) {
          return res;
        }
      }
    } catch {}
    if (typeof item.rating === 'number' && !Number.isNaN(item.rating)) {
      return { rating: item.rating, count: item.ratingCount };
    }
    return null;
  })();

  if (ratingInfo && typeof ratingInfo.rating === 'number' && !Number.isNaN(ratingInfo.rating)) {
    stars = document.createElement('div');
    const formatted = window.__ClipsouRatings && typeof window.__ClipsouRatings.format === 'function'
      ? window.__ClipsouRatings.format(ratingInfo.rating)
      : (function(){
          const rounded = Math.round(ratingInfo.rating * 2) / 2;
          let txt = rounded.toFixed(1);
          if (txt.endsWith('.0')) txt = String(Math.round(rounded));
          return txt;
        })();
    stars.className = 'stars';
    const displayText = '★' + formatted + '/5';
    applyStarMarkup(stars, displayText);
    syncRatingBadge();
    rg.appendChild(stars);
    item.rating = ratingInfo.rating;
    if (typeof ratingInfo.count === 'number' && Number.isFinite(ratingInfo.count)) {
      item.ratingCount = ratingInfo.count;
    }
  }
  const genresDiv = document.createElement('div');
  genresDiv.className = 'genres';
  (item.genres || []).forEach(g => {
    const tag = document.createElement('span');
    tag.className = 'genre-tag';
    // Traduire le genre si possible
    const translatedGenre = window.i18n ? window.i18n.translateGenre(g) : g;
    tag.textContent = translatedGenre;
    tag.setAttribute('data-original-genre', g); // Stocker l'original pour retraduction
    genresDiv.appendChild(tag);
  });
  rg.appendChild(genresDiv);

  // ----- Affichage de la moyenne des notes (lecture seule) -----
  try {
    const loadUserRatings = async () => {
      try {
        const response = await fetch('data/ratings.json', { cache: 'no-store' });
        if (response.ok) {
          const ratingsData = await response.json();
          const itemRatings = ratingsData.find(r => r.id === item.id);
          
          if (itemRatings && Array.isArray(itemRatings.ratings)) {
            const userRatings = itemRatings.ratings;
            let total = userRatings.reduce((sum, r) => sum + r, 0);
            let count = userRatings.length;

            const baseFromRatings = (typeof itemRatings.baseRating === 'number' && !Number.isNaN(itemRatings.baseRating))
              ? itemRatings.baseRating
              : null;
            const baseFromItem = (typeof item.rating === 'number' && !Number.isNaN(item.rating))
              ? item.rating
              : null;

            const effectiveBase = baseFromRatings !== null ? baseFromRatings : baseFromItem;
            if (effectiveBase !== null) {
              total += effectiveBase;
              count += 1;
            }

            if (count > 0) {
              const average = total / count;
              const rounded = Math.round(average * 2) / 2;
              let txt = rounded.toFixed(1);
              if (txt.endsWith('.0')) txt = String(Math.round(rounded));

              if (!stars) {
                stars = document.createElement('div');
                stars.className = 'stars';
                rg.insertBefore(stars, genresDiv);
              }

              const displayText = '★' + txt + '/5';
              applyStarMarkup(stars, displayText);
              syncRatingBadge();

              try {
                if (window.__ClipsouRatings && typeof window.__ClipsouRatings.updateSnapshotEntry === 'function') {
                  window.__ClipsouRatings.updateSnapshotEntry(item.id, average, count);
                }
              } catch {}

              item.rating = average;
              item.ratingCount = count;
            }
          }
        }
      } catch (e) {
      }
    };
    loadUserRatings();
  } catch {}

  // ----- Durée du film (en minutes), à droite -----
  const durationChip = document.createElement('div');
  durationChip.className = 'duration-chip';
  durationChip.setAttribute('aria-label', 'Durée');
  // caché par défaut pour éviter un espacement inutile sur les séries
  try { durationChip.style.display = 'none'; } catch {}
  // N'afficher que pour les films (pas séries / playlists)
  try {
    const isFilm = (item.type || '').toLowerCase() === 'film';
    const watchUrl = String(item.watchUrl || '');
    const isYouTube = /youtu\.be\//i.test(watchUrl) || /youtube\.com\//i.test(watchUrl);
    if (isFilm && isYouTube) {
      // Helper: format seconds as m:ss
      const formatMMSS = (sec)=>{
        const total = Math.max(0, Math.floor(Number(sec)||0));
        const m = Math.floor(total / 60);
        const s = String(total % 60).padStart(2, '0');
        return `${m}:${s}`;
      };
      // Extraire l'id vidéo YouTube
      const extractVid = (href)=>{
        try {
          const s = String(href||'');
          const m = s.match(/[?&]v=([\w-]{6,})/i) || s.match(/embed\/([\w-]{6,})/i) || s.match(/youtu\.be\/([\w-]{6,})/i);
          return m ? m[1] : '';
        } catch { return ''; }
      };
      const vid = extractVid(watchUrl);
      if (vid) {
        // Cache local pour accélérer l'affichage
        const readDurCache = () => {
          try {
            const raw = localStorage.getItem('clipsou_video_duration_v1');
            const obj = raw ? JSON.parse(raw) : {};
            return (obj && typeof obj === 'object') ? obj : {};
          } catch { return {}; }
        };
        const writeDurCache = (obj) => {
          try { localStorage.setItem('clipsou_video_duration_v1', JSON.stringify(obj||{})); } catch {}
        };
        const cache = readDurCache();
        const cachedSeconds = cache && cache[vid] && typeof cache[vid].duration === 'number' ? cache[vid].duration : 0;
        if (cachedSeconds > 0) {
          durationChip.textContent = formatMMSS(cachedSeconds) + ' min';
          try { durationChip.style.display = ''; } catch {}
        } else {
          durationChip.textContent = '';
          durationChip.classList.add('loading');
          try { durationChip.style.display = ''; } catch {}
        }
        // Charger l'API si besoin puis créer un player caché pour obtenir la durée
        const ensureYT = ()=> new Promise((resolve)=>{
          try {
            if (window.YT && window.YT.Player) { resolve(); return; }
            const prev = document.querySelector('script[src*="youtube.com/iframe_api"]');
            if (!prev) {
              const s = document.createElement('script');
              s.src = 'https://www.youtube.com/iframe_api';
              document.head.appendChild(s);
            }
            const check = ()=>{ if (window.YT && window.YT.Player) resolve(); else setTimeout(check, 100); };
            check();
          } catch { resolve(); }
        });
        ensureYT().then(()=>{
          try {
            const container = document.createElement('div');
            const pid = 'yt_tmp_' + Date.now() + '_' + Math.floor(Math.random()*1e6);
            container.id = pid;
            Object.assign(container.style, { width:'0', height:'0', overflow:'hidden', position:'absolute', left:'-9999px', top:'-9999px' });
            document.body.appendChild(container);
            let player = null;
            const cleanup = ()=>{ try { if (player && player.destroy) player.destroy(); } catch {} try { container.remove(); } catch {} };
            player = new window.YT.Player(pid, {
              videoId: vid,
              events: {
                onReady: function(){
                  try {
                    const d = player && player.getDuration ? Number(player.getDuration()) : 0;
                    durationChip.textContent = formatMMSS(d) + ' min';
                    durationChip.classList.remove('loading');
                    try { durationChip.style.display = ''; } catch {}
                    // MAJ cache
                    try {
                      const c2 = readDurCache();
                      c2[vid] = { duration: d, updatedAt: Date.now() };
                      writeDurCache(c2);
                    } catch {}
                  } catch {
                    durationChip.textContent = '';
                  }
                  cleanup();
                },
                onError: function(){ cleanup(); }
              }
            });
            // Sécurité: timeout fallback
            setTimeout(()=>{ try { if (durationChip.classList.contains('loading')) { durationChip.textContent = cachedSeconds>0 ? (formatMMSS(cachedSeconds) + ' min') : ''; if (cachedSeconds>0) { durationChip.style.display = ''; } else { durationChip.style.display = 'none'; } durationChip.classList.remove('loading'); cleanup(); } } catch {} }, 5000);
          } catch {}
        });
      }
    }
  } catch {}
  // Toujours ajouter l'élément pour les films afin de permettre la MAJ asynchrone,
  // mais masquer pour les séries (aucune durée) pour ne pas créer d'espacement.
  try {
    const isFilmForAppend = (item.type || '').toLowerCase() === 'film';
    if (isFilmForAppend) {
      rg.appendChild(durationChip);
    } else {
      // Pour les séries, on l'ajoute aussi mais caché pour éviter un double gap.
      durationChip.style.display = 'none';
      rg.appendChild(durationChip);
    }
  } catch { rg.appendChild(durationChip); }

  // ----- Nombre d'épisodes (séries), même emplacement que la durée -----
  try {
    const isSerie = (item.type || '').toLowerCase() === 'série' || /^serie/i.test(item.id || '');
    if (isSerie) {
      const episodesChip = document.createElement('div');
      episodesChip.className = 'episodes-chip';
      episodesChip.setAttribute('aria-label', "Nombre d'épisodes");
      // Rechercher la liste des épisodes: 1) item.episodes, 2) titre normalisé, 3) id fiche
      let eps = [];
      if (Array.isArray(item.episodes) && item.episodes.length) {
        eps = item.episodes;
      } else {
        try {
          const byTitle = EPISODES_DB_NORM[normalizeTitleKey(item.title || '')];
          if (Array.isArray(byTitle)) eps = byTitle;
        } catch {}
        if (!Array.isArray(eps) || eps.length === 0) {
          try {
            const byId = EPISODES_ID_DB[item.id];
            if (Array.isArray(byId)) eps = byId;
          } catch {}
        }
      }
      const count = Array.isArray(eps) ? eps.length : 0;
      if (count > 0) {
        // Format complet: "N épisode(s)" sans point final
        const label = (count === 1) ? 'épisode' : 'épisodes';
        episodesChip.textContent = `${count} ${label}`;
      } else {
        episodesChip.textContent = '';
      }
      rg.appendChild(episodesChip);
    }
  } catch {}

  const p = document.createElement('p');
  p.textContent = item.description || '';
  
  // Stocker le texte original pour permettre la retraduction lors du changement de langue
  if (item.description) {
    p.setAttribute('data-original-text', item.description);
  }
  
  // Traduire automatiquement la description si la langue n'est pas français
  if (window.i18n && item.description) {
    const currentLang = window.i18n.getCurrentLanguage();
    if (currentLang !== 'fr') {
      // Afficher temporairement la version française avec indicateur de chargement
      p.textContent = item.description;
      p.style.opacity = '0.6';
      p.title = 'Traduction en cours...';
      
      // Traduire automatiquement en arrière-plan
      window.i18n.autoTranslate(item.description, currentLang).then(translatedText => {
        if (translatedText && p) {
          p.textContent = translatedText;
          p.style.opacity = '1';
          p.title = '';
        }
      }).catch(err => {
        console.warn('Translation failed for description:', err);
        p.style.opacity = '1';
        p.title = '';
      });
    }
  }

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
    titlesToClamp.push({ el: overlayTitle, options: { watch: false } });
  } catch (e) {
    // no-op if cloning fails
  }

  const buttons = document.createElement('div');
  buttons.className = 'button-group';
  
  // Check if it's a series
  const isSerie = (item.type === 'série') || /^serie/i.test(item.id || '');
  const hasEpisodesData = Array.isArray(item.episodes) && item.episodes.length > 0;
  
  // Check if there are episodes in fallback databases for old series
  const titleForCheck = item.title || '';
  const idForCheck = item.id || '';
  const hasEpisodesFallback = !!(EPISODES_DB_NORM[normalizeTitleKey(titleForCheck)] || EPISODES_ID_DB[idForCheck]);
  
  // For series with episodes (from data or fallback), show "Voir les épisodes" button
  if (isSerie && (hasEpisodesData || hasEpisodesFallback)) {
    const a = document.createElement('a');
    a.className = 'button';
    a.href = '#episodes-section';
    a.textContent = 'Voir les épisodes';
    a.addEventListener('click', function(e){
      // Open the episodes panel immediately
      try { e.preventDefault(); } catch {}
      try { window.__wantEpisodes = true; } catch {}
      try { window.dispatchEvent(new CustomEvent('open-episodes')); } catch { try { window.dispatchEvent(new Event('open-episodes')); } catch {} }
    });
    buttons.appendChild(a);
  }
  // For non-series or series with watchUrl, show regular watch button
  else if (item.watchUrl) {
    const a = document.createElement('a');
    a.className = 'button watch-button';
    try { a.href = item.watchUrl; } catch { a.href = item.watchUrl || ''; }
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('data-i18n', 'button.watch');
    a.textContent = window.i18n ? '▶ ' + window.i18n.translate('button.watch') : '▶ Regarder';
    
    
    // Marquer le clic sur Regarder avec timestamp
    a.addEventListener('click', function(e) {
      try {
        const watchData = {
          itemId: item.id,
          timestamp: Date.now()
        };
        localStorage.setItem('clipsou_watching', JSON.stringify(watchData));
        
        // Vérifier immédiatement
        const verify = localStorage.getItem('clipsou_watching');
      } catch (e) {
      }
    });
    
    // Mettre à jour le texte lors du changement de langue - optimized with once flag
    const updateWatchText = () => {
      a.textContent = window.i18n ? '▶ ' + window.i18n.translate('button.watch') : '▶ Regarder';
    };
    window.addEventListener('languageChanged', updateWatchText, { passive: true });
    
    buttons.appendChild(a);
  }

  // Favorites primary button (gradient red/pink)
  (function addFavoritesButton(){
    try {
      const FAV_KEY = 'clipsou_favorites_v1';
      const readFavorites = ()=>{ try { const raw = localStorage.getItem(FAV_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr)?arr:[]; } catch { return []; } };
      const saveFavorites = (list)=>{ try { localStorage.setItem(FAV_KEY, JSON.stringify((list||[]).filter(Boolean))); } catch {} };
      const isFavorite = (id)=>{ try { return new Set(readFavorites()).has(String(id)); } catch { return false; } };
      const toggleFavorite = (id)=>{ const s=String(id); const list=readFavorites(); const i=list.indexOf(s); if(i>=0){list.splice(i,1);} else {list.unshift(s);} saveFavorites(list); return i<0; };

      const favBtn = document.createElement('button');
      favBtn.type = 'button';
      favBtn.className = 'button fav-primary';
      const ICON_ADDED = '<svg class="fav-heart-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M1.24264 8.24264L8 15L14.7574 8.24264C15.553 7.44699 16 6.36786 16 5.24264V5.05234C16 2.8143 14.1857 1 11.9477 1C10.7166 1 9.55233 1.55959 8.78331 2.52086L8 3.5L7.21669 2.52086C6.44767 1.55959 5.28338 1 4.05234 1C1.8143 1 0 2.8143 0 5.05234V5.24264C0 6.36786 0.44699 7.44699 1.24264 8.24264Z" fill="#FF4D88"></path></svg>';
      const ICON_REMOVED = '<svg class="fav-heart-icon" viewBox="-0.96 -0.96 17.92 17.92" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#FF4D88" stroke-width="1.552" aria-hidden="true" focusable="false"><path d="M1.24264 8.24264L8 15L14.7574 8.24264C15.553 7.44699 16 6.36786 16 5.24264V5.05234C16 2.8143 14.1857 1 11.9477 1C10.7166 1 9.55233 1.55959 8.78331 2.52086L8 3.5L7.21669 2.52086C6.44767 1.55959 5.28338 1 4.05234 1C1.8143 1 0 2.8143 0 5.05234V5.24264C0 6.36786 0.44699 7.44699 1.24264 8.24264Z" fill="none"></path></svg>';
      const renderButton = (active, textContent) => {
        try {
          favBtn.innerHTML = active ? ICON_ADDED : ICON_REMOVED;
          const labelSpan = document.createElement('span');
          labelSpan.className = 'fav-label-text';
          labelSpan.textContent = String(textContent || '');
          favBtn.appendChild(labelSpan);
        } catch {
          favBtn.textContent = String(textContent || '');
        }
      };
      const setLabel = (active)=>{ 
        const addText = window.i18n ? window.i18n.translate('button.add.favorites') : 'Mettre en favoris';
        const removeText = window.i18n ? window.i18n.translate('button.remove.favorites') : 'Retirer des favoris';
        const labelText = active ? removeText : addText;
        renderButton(active, labelText);
        favBtn.setAttribute('data-i18n', active ? 'button.remove.favorites' : 'button.add.favorites');
        favBtn.setAttribute('aria-label', labelText);
        favBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
        favBtn.classList.toggle('is-active', !!active);
      };
      let active = isFavorite(item.id);
      setLabel(active);
      favBtn.addEventListener('click', function(e){
        try { e.preventDefault(); e.stopPropagation(); } catch {}
        active = toggleFavorite(item.id);
        setLabel(active);
      });
      
      // Mettre à jour le label lors du changement de langue - passive listener
      window.addEventListener('languageChanged', () => setLabel(active), { passive: true });
      
      buttons.appendChild(favBtn);
    } catch {}
  })();

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
        mq.addListener(placeButtons);
      }
    } else {
      // Throttled fallback on resize - prevent excessive calls
      let resizeTimeout;
      const throttledPlace = () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(placeButtons, 100);
      };
      window.addEventListener('resize', throttledPlace, { passive: true });
      window.addEventListener('orientationchange', throttledPlace, { passive: true });
    }
  } catch (e) {
    right.appendChild(buttons);
  }

  wrap.appendChild(left);
  wrap.appendChild(right);
  container.appendChild(wrap);
  titlesToClamp.forEach(entry => {
    try {
      if (entry && entry.el) clampFicheTitleLines(entry.el, entry.options || {});
    } catch {}
  });
  try { window.__currentFicheItem = item; } catch {}
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

// Helper function to detect local assets (Clipsou Studio content)
function isLocalAsset(value) {
  if (!value || typeof value !== 'string') return false;
  return !/^(?:https?:|\/\/|data:|blob:)/i.test(value);
}

function isClipsouOwnedItem(item) {
  if (!item) return false;
  return isLocalAsset(item.portraitImage) || isLocalAsset(item.landscapeImage) || isLocalAsset(item.image);
}

// ===== NOUVELLE VERSION PROPRE : Section Contenu similaire UNIQUEMENT =====
function renderSimilarSection(rootEl, similarItems, currentItem) {
  if (!rootEl) return;
  try {
    const prev = rootEl.querySelectorAll('[data-dynamic-fiche-section="similar"]');
    prev.forEach(section => {
      if (!section) return;
      if (typeof section.remove === 'function') section.remove();
      else if (section.parentNode) section.parentNode.removeChild(section);
    });
  } catch {}
  if (!Array.isArray(similarItems)) similarItems = [];
  
  // Créer la section principale
  const section = document.createElement('section');
  section.className = 'section similar-section';
  section.id = 'similar-section';
  try { section.dataset.dynamicFicheSection = 'similar'; } catch {}
  
  // Header avec les 3 boutons: Contenu similaire / Épisodes / Acteurs
  const header = document.createElement('div');
  header.className = 'section-header';
  
  // Bouton Contenu similaire (actif par défaut)
  const similarBtn = document.createElement('button');
  similarBtn.type = 'button';
  similarBtn.className = 'button secondary active';
  similarBtn.setAttribute('data-i18n', 'fiche.similar');
  similarBtn.textContent = window.i18n ? window.i18n.translate('fiche.similar') : 'Contenu similaire';
  header.appendChild(similarBtn);
  
  // Bouton Épisodes (seulement pour les séries)
  const titleForMatch = (currentItem && currentItem.title) || '';
  const idForMatch = (currentItem && currentItem.id) || '';
  const hasEpisodes = !!(currentItem && (currentItem.type === 'série' || /serie/i.test(idForMatch)) && 
    ((Array.isArray(currentItem.episodes) && currentItem.episodes.length) || EPISODES_DB_NORM[normalizeTitleKey(titleForMatch)] || EPISODES_ID_DB[idForMatch]));
  
  const episodesBtn = document.createElement('button');
  episodesBtn.type = 'button';
  episodesBtn.className = 'button secondary';
  episodesBtn.setAttribute('data-i18n', 'fiche.episodes');
  episodesBtn.textContent = window.i18n ? window.i18n.translate('fiche.episodes') : 'Épisodes';
  if (hasEpisodes) header.appendChild(episodesBtn);
  
  // Bouton Acteurs
  const actorsBtn = document.createElement('button');
  actorsBtn.type = 'button';
  actorsBtn.className = 'button secondary';
  actorsBtn.setAttribute('data-i18n', 'fiche.actors');
  actorsBtn.textContent = window.i18n ? window.i18n.translate('fiche.actors') : 'Acteurs & Doubleurs';
  header.appendChild(actorsBtn);
  
  section.appendChild(header);

  // Panneau des acteurs (caché par défaut)
  const actorsPanel = document.createElement('div');
  actorsPanel.className = 'actors-panel';
  actorsPanel.hidden = true;
  actorsPanel.style.display = 'none';
  actorsPanel.setAttribute('aria-hidden', 'true');
  const actorsTitle = document.createElement('h3');
  actorsTitle.setAttribute('data-i18n', 'fiche.actors');
  actorsTitle.textContent = window.i18n ? window.i18n.translate('fiche.actors') : 'Acteurs & Doubleurs';
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
  episodesTitle.setAttribute('data-i18n', 'fiche.episodes');
  episodesTitle.textContent = window.i18n ? window.i18n.translate('fiche.episodes') : 'Épisodes';
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

  // Rail pour le contenu similaire (visible par défaut)
  const rail = document.createElement('div');
  rail.className = 'rail similar-rail';
  
  // Créer les cartes de contenu similaire
  if (similarItems.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-message';
    empty.textContent = "Aucun contenu similaire trouvé.";
    rail.appendChild(empty);
  } else {
    similarItems.forEach(it => {
      // Carte simple et propre
      const card = document.createElement('div');
      card.className = 'card';
      
      const a = document.createElement('a');
      a.href = `fiche.html?id=${encodeURIComponent(it.id)}`;
      
      // Media container
      const media = document.createElement('div');
      media.className = 'card-media';
      
      // Image avec priorité portrait (même logique que l'index: data-src + fallback progressif)
      const img = document.createElement('img');
      const primaryPortrait = optimizeCloudinaryUrlCard(it.portraitImage || '');
      let thumbs = [];
      if (primaryPortrait) {
        thumbs = [primaryPortrait];
      } else {
        // Fallback: dériver des extensions depuis image ou landscapeImage
        const base = optimizeCloudinaryUrlCard(it.image || it.landscapeImage || '');
        try { thumbs = deriveExts(base); } catch { thumbs = base ? [base] : []; }
      }
      let idx = 0;
      const first = thumbs[0] || '';
      if (first) img.setAttribute('data-src', first);
      img.onerror = function(){
        if (idx < thumbs.length - 1) { idx += 1; this.src = thumbs[idx]; }
        else { this.onerror = null; try { this.removeAttribute('src'); } catch {} }
      };
      img.alt = it.title || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      
      // Badge studio (badge personnalisé ou clipsoustudio pour films locaux)
      const hasCustomBadge = Boolean(it.studioBadge && String(it.studioBadge).trim());
      const isClipsouOwned = isClipsouOwnedItem(it) || LOCAL_FALLBACK_DB.some(local => local.id === it.id);
      const badgeSrc = hasCustomBadge ? String(it.studioBadge).trim() : (isClipsouOwned ? 'images/clipsoustudio.webp' : '');
      
      if (badgeSrc) {
        const badge = document.createElement('div');
        badge.className = 'brand-badge';
        const logo = document.createElement('img');
        logo.src = badgeSrc;
        logo.alt = hasCustomBadge ? 'Logo du studio' : 'Clipsou Studio';
        logo.loading = 'lazy';
        logo.decoding = 'async';
        badge.appendChild(logo);
        media.appendChild(badge);
      }
      
      media.appendChild(img);
      
      // Info bar
      const info = document.createElement('div');
      info.className = 'card-info';
      const itemType = it.type || 'film';
      info.setAttribute('data-type', itemType);
      
      // Ajouter data-type-display pour la traduction
      if (window.i18n) {
        const lang = window.i18n.getCurrentLanguage();
        const typeLower = itemType.toLowerCase();
        let translatedType = itemType;
        
        if (lang === 'en') {
          if (typeLower === 'film') translatedType = 'Movie';
          else if (typeLower === 'série' || typeLower === 'serie') translatedType = 'Series';
          else if (typeLower === 'trailer') translatedType = 'Trailer';
        } else {
          if (typeLower === 'film') translatedType = 'Film';
          else if (typeLower === 'série' || typeLower === 'serie') translatedType = 'Série';
          else if (typeLower === 'trailer') translatedType = 'Trailer';
        }
        
        info.setAttribute('data-type-display', translatedType);
      }
      
      const ratingData = (function(){
        try {
          if (window.__ClipsouRatings && typeof window.__ClipsouRatings.resolveRatingValue === 'function') {
            const res = window.__ClipsouRatings.resolveRatingValue(it.id, it.rating, it.ratingCount);
            if (res && typeof res.rating === 'number' && !Number.isNaN(res.rating)) {
              return res;
            }
          }
        } catch {}
        if (typeof it.rating === 'number' && !Number.isNaN(it.rating)) {
          return { rating: it.rating, count: it.ratingCount };
        }
        return null;
      })();

      if (ratingData && typeof ratingData.rating === 'number' && !Number.isNaN(ratingData.rating)) {
        const formatted = window.__ClipsouRatings && typeof window.__ClipsouRatings.format === 'function'
          ? window.__ClipsouRatings.format(ratingData.rating)
          : String(ratingData.rating);
        info.setAttribute('data-rating', formatted);
        if (typeof ratingData.count === 'number' && Number.isFinite(ratingData.count)) {
          info.dataset.ratingCount = String(ratingData.count);
        }
        it.rating = ratingData.rating;
        if (typeof ratingData.count === 'number' && Number.isFinite(ratingData.count)) it.ratingCount = ratingData.count;
      }
      
      a.appendChild(media);
      a.appendChild(info);
      card.appendChild(a);
      rail.appendChild(card);
    });
  }

  section.appendChild(rail);
  
  // Ajouter la section au DOM (simplement à la fin du rootEl)
  rootEl.appendChild(section);
  
  // Appliquer les traductions sur les cartes créées
  if (window.i18n && typeof window.i18n.updateCardTypes === 'function') {
    const lang = window.i18n.getCurrentLanguage();
    window.i18n.updateCardTypes(lang);
  }
  try { if (typeof installLazyImageLoader === 'function') installLazyImageLoader(); } catch {}
  
  // Fonctions de switching simples et propres
  function scheduleEnhance(){
    try {
      if (typeof window === 'undefined') return;
      setTimeout(() => {
        try {
          if (window.innerWidth > 768 && typeof window.__enhanceFicheRails === 'function') {
            window.__enhanceFicheRails();
          }
        } catch {}
      }, 0);
    } catch {}
  }

  function showSimilar() {
    rail.hidden = false;
    actorsPanel.hidden = true;
    if (hasEpisodes) episodesPanel.hidden = true;
    // Classes compatibles avec le système global
    section.classList.remove('actors-open');
    section.classList.remove('episodes-open');

    similarBtn.classList.add('active');
    actorsBtn.classList.remove('active');
    if (hasEpisodes) episodesBtn.classList.remove('active');

    scheduleEnhance();
  }
  
  function showActors() {
    populateActors();
    rail.hidden = true;
    actorsPanel.hidden = false;
    if (hasEpisodes) episodesPanel.hidden = true;
    // Classes compatibles avec le système global
    section.classList.add('actors-open');
    section.classList.remove('episodes-open');
    
    similarBtn.classList.remove('active');
    actorsBtn.classList.add('active');
    if (hasEpisodes) episodesBtn.classList.remove('active');
  }
  
  function showEpisodes(shouldScroll) {
    if (!hasEpisodes) return;
    populateEpisodes();
    rail.hidden = true;
    actorsPanel.hidden = true;
    episodesPanel.hidden = false;
    // Classes compatibles avec le système global
    section.classList.add('episodes-open');
    section.classList.remove('actors-open');
    
    similarBtn.classList.remove('active');
    actorsBtn.classList.remove('active');
    episodesBtn.classList.add('active');
    
    if (shouldScroll) {
      setTimeout(() => {
        if (episodesPanel.scrollIntoView) {
          episodesPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 0);
    }
  }
  
  // Event listeners
  similarBtn.addEventListener('click', showSimilar);
  actorsBtn.addEventListener('click', showActors);
  if (hasEpisodes) {
    episodesBtn.addEventListener('click', () => showEpisodes(false));
  }
  
  // Afficher le contenu similaire par défaut
  showSimilar();

  scheduleEnhance();

  let openEpisodesHandler = null;
  if (hasEpisodes) {
    openEpisodesHandler = () => {
      try { window.__wantEpisodes = false; } catch {}
      showEpisodes(true);
    };
    try { window.addEventListener('open-episodes', openEpisodesHandler); } catch {}
  }

  if (hasEpisodes) {
    let shouldOpen = false;
    try { if (window.__wantEpisodes) shouldOpen = true; } catch {}
    if (!shouldOpen) {
      try { if (location && location.hash === '#episodes-section') shouldOpen = true; } catch {}
    }
    if (shouldOpen) {
      setTimeout(() => {
        if (openEpisodesHandler) openEpisodesHandler();
      }, 0);
    }
  }

  // Gestion du bouton Acteurs - fonction populateActors()
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
    // Read global actor photo map from admin (localStorage) for cross-film consistency
    function getGlobalActorPhotoMap(){
      try { return JSON.parse(localStorage.getItem('clipsou_admin_actor_photos_v1')||'{}') || {}; } catch { return {}; }
    }
    function normalizeActorKey(s){
      try { return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim(); }
      catch { return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim(); }
    }
    function resolveActorPhoto(map, name){
      if (!name) return '';
      try { const k = normalizeActorKey(name); return (map && map[k]) || ''; } catch { return ''; }
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
    const photoMap = getGlobalActorPhotoMap();
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
      const globalPhoto = resolveActorPhoto(photoMap, nameRaw);
      if (a && a.photo) {
        // If photo is a local path (not http/https), prepend images/
        let photoSrc = a.photo;
        if (photoSrc && !/^https?:\/\//i.test(photoSrc) && !photoSrc.startsWith('images/')) {
          photoSrc = 'images/' + photoSrc;
        }
        // Optimize Cloudinary URLs for actor photos (low quality)
        photoSrc = optimizeCloudinaryUrlSmall(photoSrc);
        try { img.src = photoSrc; } catch { img.src = photoSrc || 'images/unknown.webp'; }
        img.setAttribute('data-explicit-photo', '1');
      } else if (globalPhoto) {
        // If globalPhoto is a local path (not http/https), prepend images/
        let globalPhotoSrc = globalPhoto;
        if (globalPhotoSrc && !/^https?:\/\//i.test(globalPhotoSrc) && !globalPhotoSrc.startsWith('images/')) {
          globalPhotoSrc = 'images/' + globalPhotoSrc;
        }
        // Optimize Cloudinary URLs for actor photos (low quality)
        globalPhotoSrc = optimizeCloudinaryUrlSmall(globalPhotoSrc);
        try { img.src = globalPhotoSrc; } catch { img.src = globalPhotoSrc || 'images/unknown.webp'; }
        img.setAttribute('data-explicit-photo', '1');
      } else {
        img.src = 'images/' + baseSlug + '.webp';
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
          this.onerror = null; this.src = 'images/unknown.webp'; return;
        }
        var slug = this.getAttribute('data-slug');
        if (!slug) { this.onerror = null; this.src = 'images/unknown.webp'; return; }
        var i = (parseInt(this.dataset.i || '0', 10) || 0) + 1;
        this.dataset.i = i;
        // Only try webp once
        if (i === 1) { this.src = 'images/' + slug + '.webp'; }
        else { this.onerror = null; this.src = 'images/unknown.webp'; }
      };
      imgWrap.appendChild(img);
      const nameEl = document.createElement('div');
      nameEl.className = 'actor-name';
      // Build label: name text + inline edit anchor inside the same badge
      const nameText = document.createElement('span');
      nameText.className = 'actor-name-text';
      nameText.textContent = a.name;
      nameEl.appendChild(nameText);
      const roleEl = document.createElement('div');
      roleEl.className = 'actor-role';
      roleEl.textContent = a.role || '';
      roleEl.setAttribute('data-original-role', a.role || ''); // Pour retraduction
      
      // Traduire le rôle si nécessaire (asynchrone)
      if (window.i18n && a.role) {
        const lang = window.i18n.getCurrentLanguage();
        if (lang !== 'fr') {
          window.i18n.translateRole(a.role, lang).then(translated => {
            if (translated && roleEl) {
              roleEl.textContent = translated;
            }
          }).catch(() => {});
        }
      }
      
      card.appendChild(imgWrap);
      card.appendChild(nameEl);
      card.appendChild(roleEl);
      actorsGrid.appendChild(card);
    });
  }

  function populateEpisodes(){
    episodesRail.innerHTML = '';
    const title = (currentItem && currentItem.title) || '';
    const idForMatch = (currentItem && currentItem.id) || '';
    
    
    // Priority: 1) episodes from currentItem data, 2) EPISODES_DB_NORM, 3) EPISODES_ID_DB
    let list = [];
    if (currentItem && Array.isArray(currentItem.episodes) && currentItem.episodes.length) {
      list = currentItem.episodes;
    } else {
      list = EPISODES_DB_NORM[normalizeTitleKey(title)] || [];
      if (!list.length) list = EPISODES_ID_DB[idForMatch] || [];
    }
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'actors-empty';
      empty.textContent = "Aucun épisode disponible.";
      episodesRail.appendChild(empty);
      return;
    }
    
    function readProgressList(){
      try { const raw = localStorage.getItem('clipsou_watch_progress_v1'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
    }
    function readDurCache(){
      try { const raw = localStorage.getItem('clipsou_video_duration_v1'); const obj = raw ? JSON.parse(raw) : {}; return (obj && typeof obj === 'object') ? obj : {}; } catch { return {}; }
    }

    const progressList = readProgressList();
    const durCache = readDurCache();
    
    
    // Reliable duration fetching using YouTube IFrame API (slower but works!)
    function writeDurCache(obj){
      try { localStorage.setItem('clipsou_video_duration_v1', JSON.stringify(obj||{})); } catch {}
    }
    
    function ensureYT(){
      return new Promise((resolve)=>{
        if (window.YT && window.YT.Player) { resolve(); return; }
        if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const check = ()=>{ if (window.YT && window.YT.Player) resolve(); else setTimeout(check, 50); };
          check();
          return;
        }
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.onload = ()=>{ const check = ()=>{ if (window.YT && window.YT.Player) resolve(); else setTimeout(check, 50); }; check(); };
        document.head.appendChild(s);
      });
    }
    
    function fetchDurationIfMissing(vid){
      if (!vid) return;
      if (durCache[vid] && typeof durCache[vid].duration === 'number' && durCache[vid].duration > 0) return;
      
      ensureYT().then(()=>{
        const container = document.createElement('div');
        container.id = 'yt-temp-' + vid;
        container.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
        document.body.appendChild(container);
        
        const player = new window.YT.Player(container.id, {
          height: '1',
          width: '1',
          videoId: vid,
          playerVars: { autoplay: 0, controls: 0 },
          events: {
            onReady: function(e){
              try {
                const d = e.target.getDuration();
                if (d > 0) {
                  const c = readDurCache();
                  c[vid] = { duration: d, updatedAt: Date.now() };
                  writeDurCache(c);
                  setTimeout(()=> populateEpisodes(), 10);
                }
              } catch(err) { }
              try { e.target.destroy(); } catch {}
              try { container.remove(); } catch {}
            },
            onError: function(){
              try { container.remove(); } catch {}
            }
          }
        });
        
        setTimeout(()=>{ try { player.destroy(); container.remove(); } catch {} }, 8000);
      });
    }
    
    // Fetch durations for all episodes that don't have them yet (in parallel with small delay)
    const extractVidSimple = (url)=>{
      try {
        const s = String(url || '');
        const m = s.match(/[?&]v=([\w-]{6,})/i) || s.match(/embed\/([\w-]{6,})/i) || s.match(/youtu\.be\/([\w-]{6,})/i);
        return m ? m[1] : '';
      } catch { return ''; }
    };
    // Load episodes in small batches to avoid overwhelming the browser
    const batchSize = 2; // 2 at a time
    list.forEach((ep, i) => {
      const vid = extractVidSimple(ep.url);
      if (vid) {
        // Load 2 episodes at a time with 300ms between batches
        const batchIndex = Math.floor(i / batchSize);
        setTimeout(() => fetchDurationIfMissing(vid), batchIndex * 300);
      }
    });

    list.forEach((ep, idx) => {
      const a = document.createElement('a');
      a.href = ep.url || '';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'button';
      const epNum = (typeof ep.n === 'number') ? ep.n : (idx + 1);
      const episodeText = window.i18n ? window.i18n.translate('episode.label') : 'Épisode';
      const baseLabel = ep && ep.title ? `${episodeText} ${epNum} — ${ep.title}` : `${episodeText} ${epNum}`;

      let statusText = '';
      const ensureFormat = (sec)=>{
        try {
          if (typeof formatMMSS === 'function') return formatMMSS(sec);
        } catch {}
        const total = Math.max(0, Math.floor(Number(sec)||0));
        const m = Math.floor(total / 60);
        const s = String(total % 60).padStart(2, '0');
        return `${m}:${s}`;
      };
      const extractVid = (url)=>{
        try {
          const s = String(url || '');
          const m = s.match(/[?&]v=([\w-]{6,})/i) || s.match(/embed\/([\w-]{6,})/i) || s.match(/youtu\.be\/([\w-]{6,})/i);
          return m ? m[1] : '';
        } catch { return ''; }
      };
      try {
        const vid = extractVid(ep && ep.url);
        if (vid) {
          const keyId = idForMatch + '::' + vid;
          let entry = progressList.find(x => x && x.id === keyId);
          if (!entry) {
            entry = progressList.find(x => x && typeof x.id === 'string' && x.id.endsWith('::' + vid));
          }
          const seconds = entry && typeof entry.seconds === 'number' ? Math.max(0, entry.seconds) : 0;
          let duration = entry && typeof entry.duration === 'number' ? Math.max(0, entry.duration) : 0;
          if (!duration && durCache[vid] && typeof durCache[vid].duration === 'number') {
            duration = Math.max(0, durCache[vid].duration);
          }
          const remaining = duration > 0 ? Math.max(0, duration - seconds) : 0;
          const finished = !!(entry && entry.finished) || (duration > 0 && remaining <= 5) || (duration > 0 && seconds / duration >= 0.99);
          if (finished) {
            statusText = 'déjà vu ✔';
          } else if (duration > 0 && seconds > 0) {
            statusText = `${ensureFormat(seconds)} / ${ensureFormat(duration)} ⏳`;
          } else if (duration > 0 && seconds === 0) {
            statusText = `${ensureFormat(duration)}`;
          } else {
            // No duration yet - show skeleton loader
            statusText = 'SKELETON_LOADER';
          }
        }
      } catch (e) {
      }

      a.textContent = baseLabel;
      if (statusText) {
        const st = document.createElement('span');
        st.className = 'episode-status';
        
        // Show skeleton loader while duration is loading
        if (statusText === 'SKELETON_LOADER') {
          const skeleton = document.createElement('span');
          skeleton.className = 'skeleton-loader';
          st.appendChild(skeleton);
        }
        // Separate hourglass from text for animation (in-progress episodes)
        else if (statusText.includes('⏳')) {
          const textPart = statusText.replace('⏳', '').trim();
          if (textPart) {
            st.textContent = ` ${textPart} `;
          } else {
            st.textContent = ' ';
          }
          
          const hourglass = document.createElement('span');
          hourglass.className = 'hourglass-icon';
          hourglass.textContent = '⏳';
          st.appendChild(hourglass);
        } else {
          st.textContent = ` ${statusText}`;
        }
        
        a.appendChild(st);
      }
      episodesRail.appendChild(a);
    });
  }
  
  // Auto-refresh when progress or durations are updated - Optimized with longer debounce
  let refreshTimeout = null;
  function scheduleRefresh(){
    if (refreshTimeout) clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(()=> {
      if (!episodesPanel.hidden) populateEpisodes();
    }, 150); // Increased from 30ms to 150ms to reduce CPU load
  }
  
  // Consolidate all refresh listeners into one handler
  const refreshHandler = (e) => {
    if (!e || !e.key || e.key === 'clipsou_watch_progress_v1' || e.key === 'clipsou_video_duration_v1') {
      scheduleRefresh();
    }
  };
  
  // Single listener setup - reduced from 5 to 2 listeners
  try { 
    window.addEventListener('clipsou-progress-updated', scheduleRefresh, { passive: true }); 
    window.addEventListener('clipsou-duration-updated', scheduleRefresh, { passive: true }); 
    window.addEventListener('storage', refreshHandler, { passive: true }); 
    window.addEventListener('pageshow', scheduleRefresh, { passive: true, once: true }); 
    document.addEventListener('visibilitychange', ()=> { if (!document.hidden) scheduleRefresh(); }, { passive: true }); 
  } catch {}
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
    if (it.image) { try { img.src = optimizeCloudinaryUrlCard(it.image); } catch {} }
    img.alt = 'Affiche de ' + (it.title || '');
    img.loading = 'lazy';
    img.decoding = 'async';
    
    // Badge studio (badge personnalisé ou clipsoustudio pour films locaux)
    const hasCustomBadge = Boolean(it.studioBadge && String(it.studioBadge).trim());
    const isClipsouOwned = isClipsouOwnedItem(it) || LOCAL_FALLBACK_DB.some(local => local.id === it.id);
    const badgeSrc = hasCustomBadge ? String(it.studioBadge).trim() : (isClipsouOwned ? 'images/clipsoustudio.webp' : '');
    
    if (badgeSrc) {
      const badge = document.createElement('div');
      badge.className = 'brand-badge';
      const logo = document.createElement('img');
      logo.src = badgeSrc;
      logo.alt = hasCustomBadge ? 'Logo du studio' : 'Clipsou Studio';
      logo.loading = 'lazy';
      logo.decoding = 'async';
      badge.appendChild(logo);
      media.appendChild(badge);
    }
    
    media.appendChild(img);
    const info = document.createElement('div');
    info.className = 'card-info';
    const itemType = it.type || 'film';
    info.setAttribute('data-type', itemType);
    
    // Ajouter data-type-display pour la traduction
    if (window.i18n) {
      const lang = window.i18n.getCurrentLanguage();
      const typeLower = itemType.toLowerCase();
      let translatedType = itemType;
      
      if (lang === 'en') {
        if (typeLower === 'film') translatedType = 'Movie';
        else if (typeLower === 'série' || typeLower === 'serie') translatedType = 'Series';
        else if (typeLower === 'trailer') translatedType = 'Trailer';
      } else {
        if (typeLower === 'film') translatedType = 'Film';
        else if (typeLower === 'série' || typeLower === 'serie') translatedType = 'Série';
        else if (typeLower === 'trailer') translatedType = 'Trailer';
      }
      
      info.setAttribute('data-type-display', translatedType);
    }
    
    if (typeof it.rating === 'number') info.setAttribute('data-rating', String(it.rating));
    a.appendChild(media);
    a.appendChild(info);
    card.appendChild(a);
    grid.appendChild(card);
  });
  box.appendChild(grid);
  container.appendChild(box);
  
  // Appliquer les traductions sur les cartes créées
  if (window.i18n && typeof window.i18n.updateCardTypes === 'function') {
    const lang = window.i18n.getCurrentLanguage();
    window.i18n.updateCardTypes(lang);
  }
}

function updateHeadSEO(item) {
  if (!item) return;
  const baseTitle = 'Clipsou Streaming';
  document.title = `${item.title} – ${baseTitle}`;
  const desc = item.description || 'Fiche du film ou de la série';
  const url = new URL(location.href);
  const imageAbs = new URL(item.image || 'images/apercu.webp', location.origin + location.pathname.replace(/[^\/]+$/, ''));

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
      const curScore = score(cur);
      const accScore = score(acc);
      let chosen;
      let other;
      if (curScore >= accScore) {
        chosen = { ...cur };
        other = acc;
      } else {
        chosen = { ...acc };
        other = cur;
      }
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
      if ((!chosen.episodes || !chosen.episodes.length) && Array.isArray(other.episodes) && other.episodes.length) chosen.episodes = other.episodes.slice();
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
            const episodes = Array.isArray(alt.episodes) ? alt.episodes.slice() : [];
            const altItem = { id: alt.id, title: alt.title, type, rating, genres, image, description, watchUrl, actors, episodes };
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
                landscapeImage: x.it.landscapeImage || '',
                studioBadge: (x.it.studioBadge || '').trim()
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
    // Génération du contenu similaire échouée silencieusement
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

      // --- Shared helpers (extract video id, progress list IO, meta builder) ---
      function extractVideoId(hrefOrSrc){
        try {
          const s = String(hrefOrSrc || '');
          const m = s.match(/[?&]v=([\w-]{6,})/i) || s.match(/embed\/([\w-]{6,})/i) || s.match(/youtu\.be\/([\w-]{6,})/i);
          return m ? m[1] : '';
        } catch { return ''; }
      }
      function readProgressList(){
        try { const raw = localStorage.getItem('clipsou_watch_progress_v1'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
      }
      function writeProgressList(list){
        try { localStorage.setItem('clipsou_watch_progress_v1', JSON.stringify(list||[])); } catch {}
      }
      function buildProgressMeta(ficheId, item, iframeOrHref){
        const it = item || {};
        const vid = extractVideoId(iframeOrHref && iframeOrHref.src ? iframeOrHref.src : iframeOrHref);
        const id = (ficheId || (it.id || '')) + (vid ? ('::' + vid) : '');
        // Try to resolve episode number from DB using current item and video id
        let episode = null;
        try {
          const seriesList = EPISODES_DB_NORM[normalizeTitleKey(it.title || '')] || EPISODES_ID_DB[(it.id||'')] || [];
          if (vid && Array.isArray(seriesList)) {
            const found = seriesList.find(ep => (ep.url||'').includes(vid));
            if (found && typeof found.n === 'number') episode = found.n;
          }
        } catch {}
        return {
          id,
          title: it.title || '',
          image: it.image || '',
          landscapeImage: it.landscapeImage || it.image || '',
          type: it.type || '',
          studioBadge: it.studioBadge || '',
          episode
        };
      }

      // --- Final flush helper used on page hide/close/back ---
      function flushOverlayProgress(){
        try {
          const overlay = document.querySelector('.player-overlay');
          if (!overlay) return;
          const iframeEl = overlay.querySelector('.player-stage iframe');
          const player = overlay.__playerRef;
          if (!player || typeof player.getCurrentTime !== 'function') return;
          const ficheId = new URLSearchParams(location.search).get('id') || '';
          const meta = buildProgressMeta(ficheId, (window.__currentFicheItem || {}), iframeEl || document.querySelector('iframe') || '');
          if (!meta || !meta.id) return;
          const d = (player.getDuration ? Number(player.getDuration()) : 0) || 0;
          const c = (player.getCurrentTime ? Number(player.getCurrentTime()) : 0) || 0;
          const now = Date.now();
          const readList = ()=>{ try { const raw = localStorage.getItem('clipsou_watch_progress_v1'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } };
          const writeList = (list)=>{ try { localStorage.setItem('clipsou_watch_progress_v1', JSON.stringify(list||[])); } catch {} };
          let list = readList(); list = list.filter(x=>x && x.id);
          const finished = (d > 0) && ((d - c) <= 5);
          let updated = false;
          for (let i=0;i<list.length;i++){
            if (list[i].id === meta.id) {
              const prev = list[i] || {};
              const sEff = finished ? d : c;
              const dEff = Math.max(d, prev.duration||0);
              const percent = dEff > 0 ? (sEff / dEff) : 0;
              list[i] = { ...prev, ...meta, seconds: sEff, duration: dEff, percent: finished ? 1 : percent, finished, updatedAt: now };
              updated = true; break;
            }
          }
          if (!updated) {
            const sEff = finished ? d : c;
            const percent = d > 0 ? (sEff / d) : 0;
            list.unshift({ ...meta, seconds: sEff, duration: d, percent: finished ? 1 : percent, finished, updatedAt: now });
          }
          if (list.length > 50) list = list.slice(0,50);
          writeList(list);
          try { window.dispatchEvent(new Event('clipsou-progress-updated')); } catch {}
        } catch {}
      }

      // Install once: auto-flush handlers on page lifecycle to not lose progress
      try {
        if (!window.__clipsouProgressFlushInstalled) {
          window.__clipsouProgressFlushInstalled = true;
          // Flush on tab/page hide and before unload
          window.addEventListener('beforeunload', function(){ try { flushOverlayProgress(); } catch {} }, { capture: true });
          window.addEventListener('pagehide', function(){ try { flushOverlayProgress(); } catch {} }, { capture: true });
          document.addEventListener('visibilitychange', function(){ try { if (document.hidden) flushOverlayProgress(); } catch {} }, { capture: true });
          // Also flush when history navigation occurs (back/forward)
          window.addEventListener('popstate', function(){ try { flushOverlayProgress(); } catch {} }, { capture: true });
        }
      } catch {}

      // Small confirm dialog to resume from last position
      function askResume(seconds){
        return new Promise((resolve)=>{
          try {
            let done = false;
            const finish = (val)=>{
              if (done) return; done = true;
              try { overlay.classList.remove('open'); } catch {}
              try { setTimeout(()=>{ try { overlay.remove(); } catch {} }, 0); } catch {}
              resolve(val);
            };
            // Always rebuild the dialog so we get fresh handlers and avoid any stale state
            let overlay = document.querySelector('.resume-dialog-overlay');
            if (overlay && overlay.parentNode) { try { overlay.parentNode.removeChild(overlay); } catch {} }
            overlay = document.createElement('div');
            overlay.className = 'resume-dialog-overlay';
            // Safety: make sure resume overlay is always above everything and clickable
            try {
              overlay.style.position = 'fixed';
              overlay.style.inset = '0';
              overlay.style.width = '100%';
              overlay.style.height = '100%';
              overlay.style.display = 'flex';
              overlay.style.alignItems = 'center';
              overlay.style.justifyContent = 'center';
              overlay.style.background = 'rgba(0,0,0,0.6)';
              overlay.style.zIndex = '13000';
              overlay.style.pointerEvents = 'auto';
            } catch {}
            const box = document.createElement('div'); box.className = 'resume-dialog-box';
            try {
              box.style.background = '#0b1117';
              box.style.borderRadius = '10px';
              box.style.padding = '16px';
              box.style.maxWidth = '90%';
              box.style.width = '420px';
              box.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
              box.style.color = 'white';
            } catch {}
            const h = document.createElement('h4'); h.textContent = 'Reprendre la lecture ?';
            const p = document.createElement('p'); p.className = 'resume-dialog-text';
            const actions = document.createElement('div'); actions.className = 'resume-dialog-actions';
            const noBtn = document.createElement('button'); noBtn.type = 'button'; noBtn.className = 'button secondary'; noBtn.textContent = 'Non, depuis le début'; noBtn.setAttribute('autofocus','');
            const yesBtn = document.createElement('button'); yesBtn.type = 'button'; yesBtn.className = 'button'; yesBtn.textContent = 'Oui, reprendre';
            try {
              [noBtn, yesBtn].forEach(b=>{ b.style.pointerEvents='auto'; b.tabIndex = 0; b.setAttribute('aria-pressed','false'); });
              actions.style.display = 'flex'; actions.style.gap = '10px'; actions.style.marginTop = '10px';
            } catch {}
            actions.appendChild(noBtn); actions.appendChild(yesBtn);
            box.appendChild(h); box.appendChild(p); box.appendChild(actions);
            overlay.appendChild(box); document.body.appendChild(overlay);
            // Block clicks from bubbling to any global handlers
            [noBtn, yesBtn, box].forEach(el => {
              try {
                el.addEventListener('click', (ev)=>{ ev.stopPropagation(); }, { capture: true });
              } catch {}
            });
            // Click outside: close without starting playback (cancel)
            overlay.addEventListener('click', (e)=>{ if (e.target === overlay) { try { e.stopPropagation(); e.stopImmediatePropagation(); } catch {} finish(null); } }, { capture: true });
            // Escape key also cancels
            overlay.addEventListener('keydown', (e)=>{ try { if (e.key === 'Escape') { finish(null); } } catch {} });
            // Explicit choices
            const bind = (el, val)=>{
              const handler = (e)=>{ try { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); } catch {} finish(val); };
              el.addEventListener('click', handler, { passive: false, capture: true });
              try { el.addEventListener('touchend', handler, { passive: false }); } catch {}
              try { el.addEventListener('pointerup', handler, { passive: false }); } catch {}
              // Keyboard support
              try {
                el.addEventListener('keydown', (e)=>{ if (e.key === 'Enter' || e.key === ' ') { handler(e); } });
              } catch {}
            };
            bind(noBtn, false);
            bind(yesBtn, true);

            const total = Math.max(0, Math.floor(seconds||0));
            const m = Math.floor(total / 60);
            const s = String(total % 60).padStart(2, '0');
            p.textContent = `Voulez-vous reprendre à ${m}:${s} min ?`;
            overlay.classList.add('open');
            try { overlay.setAttribute('tabindex','-1'); overlay.focus(); } catch {}
            try { noBtn.focus(); } catch {}
          } catch { resolve(false); }
        });
      }

      function ensurePlayerOverlay(){
        let overlay = document.querySelector('.player-overlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.className = 'player-overlay';
        const shell = document.createElement('div'); shell.className = 'player-shell';
        const top = document.createElement('div'); top.className = 'player-topbar';
        const titleEl = document.createElement('h4'); titleEl.className = 'player-title';
        titleEl.setAttribute('data-i18n', 'player.title');
        const closeBtn = document.createElement('button');
        closeBtn.className = 'player-close';
        closeBtn.setAttribute('data-i18n-aria', 'player.close');
        // Skip Intro button (hidden by default; only visible during intro)
        const skipBtn = document.createElement('button');
        skipBtn.className = 'player-skip';
        skipBtn.type = 'button';
        skipBtn.setAttribute('data-i18n', 'player.skip');
        skipBtn.hidden = true;
        // Expose on overlay for lifecycle control
        try { overlay.__skipBtn = skipBtn; } catch {}
        top.appendChild(titleEl); top.appendChild(closeBtn);
        const stage = document.createElement('div'); stage.className = 'player-stage';
        shell.appendChild(top); shell.appendChild(stage);
        // Place Skip Intro button inside the stage so it overlays bottom-right of the video
        try { stage.appendChild(skipBtn); } catch {}
        overlay.appendChild(shell); document.body.appendChild(overlay);
        const mqClose = (window.matchMedia ? window.matchMedia('(max-width: 768px)') : null);
        const applyPlayerTexts = () => {
          const translate = (key, fallback) => {
            try {
              return (window.i18n && typeof window.i18n.translate === 'function') ? window.i18n.translate(key) : fallback;
            } catch { return fallback; }
          };
          const titleText = translate('player.title', 'Lecture');
          titleEl.textContent = titleText;
          const closeText = translate('player.close', 'Fermer');
          try { closeBtn.setAttribute('aria-label', closeText); } catch {}
          if (mqClose && mqClose.matches) {
            closeBtn.textContent = '✕';
          } else {
            closeBtn.textContent = `✕ ${closeText}`;
          }
          const skipText = translate('player.skip', 'Passer l\'intro');
          try { skipBtn.textContent = `⏭ ${skipText}`; } catch {}
        };
        applyPlayerTexts();
        if (mqClose) {
          const mqHandler = () => applyPlayerTexts();
          if (typeof mqClose.addEventListener === 'function') {
            mqClose.addEventListener('change', mqHandler);
          } else if (typeof mqClose.addListener === 'function') {
            mqClose.addListener(mqHandler);
          }
        }
        try {
          const onLanguageChange = () => applyPlayerTexts();
          window.addEventListener('languageChanged', onLanguageChange);
          overlay.__playerLocaleListener = onLanguageChange;
        } catch {}
        const close = ()=>{
          try { if (typeof overlay.__activeCleanup === 'function') overlay.__activeCleanup(); } catch {}
          try { window.__introShowing = false; } catch {}
          try { document.body.classList.remove('player-open'); document.documentElement.classList.remove('player-open'); } catch {}
          overlay.classList.remove('open');
          try { stage.querySelectorAll('video').forEach(v=>{ try { v.pause(); } catch{} }); } catch{}
          try { stage.querySelectorAll('iframe').forEach(f=>{ f.src = 'about:blank'; }); } catch{}
          stage.innerHTML = '';
          try { overlay.classList.remove('intro-mode'); } catch {}
          // Hide and detach skip button
          try {
            if (overlay.__skipBtn) {
              overlay.__skipBtn.hidden = true;
              overlay.__skipBtn.onclick = null;
              overlay.__skipBtn.disabled = false;
            }
            delete overlay.__skipIntro;
          } catch {}
          
          // Afficher la popup de notation
          try {
            const ficheId = new URLSearchParams(location.search).get('id') || '';
            if (ficheId) {
              // Vérifier si l'utilisateur a déjà noté ce contenu
              const userRatings = JSON.parse(localStorage.getItem('clipsou_user_ratings') || '{}');
              if (!userRatings[ficheId]) {
                // Afficher la popup de notation
                setTimeout(() => {
                  if (typeof window.showRatingModal === 'function') {
                    window.showRatingModal(ficheId);
                  }
                }, 500);
                return;
              }
            }
          } catch (e) {
            console.error('Erreur affichage popup notation:', e);
          }
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
          // Some browsers require an explicit origin when enablejsapi=1 is set
          const isWebOrigin = (function(){ try { return location && (location.protocol === 'http:' || location.protocol === 'https:'); } catch { return false; } })();
          const originParam = isWebOrigin ? ('&origin=' + encodeURIComponent(location.origin)) : '';
          const apiParam = isWebOrigin ? ('?enablejsapi=1' + originParam) : '?';
          if (h.includes('youtu.be')){
            const id = url.pathname.replace(/^\//,'');
            return 'https://www.youtube.com/embed/' + encodeURIComponent(id) + apiParam + common;
          }
          if (h.includes('youtube.com')){
            if (url.pathname.startsWith('/watch')){
              const id = params.get('v') || '';
              return 'https://www.youtube.com/embed/' + encodeURIComponent(id) + apiParam + common;
            }
            if (url.pathname.startsWith('/playlist')){
              const list = params.get('list') || '';
              return isWebOrigin
                ? ('https://www.youtube.com/embed/videoseries?enablejsapi=1&list=' + encodeURIComponent(list) + common + originParam)
                : ('https://www.youtube.com/embed/videoseries?list=' + encodeURIComponent(list) + common);
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
        // Decide if we should bypass intro before attaching any skip button
        let shouldBypassIntro = false;
        try { shouldBypassIntro = (window.__resumeOverride === 'yes') && ((window.__resumeSeconds||0) > 0); } catch {}
        // If resuming, bypass the intro and start main content directly
        try {
          if (shouldBypassIntro) {
            const iframe = document.createElement('iframe');
            iframe.allowFullscreen = true;
            iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
            iframe.src = toEmbedUrl(targetHref);
            try { iframe.id = 'ytp_' + Date.now(); } catch {}
            stage.appendChild(iframe);
            window.__introShowing = false;
            try { if (overlay.__skipBtn) { overlay.__skipBtn.hidden = true; overlay.__skipBtn.onclick = null; } } catch {}
            // Prevent intro mode visuals
            try { overlay.classList.remove('intro-mode'); } catch {}
            // Install progress tracking and resume seek via existing setup
            (function setupWatchProgressImmediate(){
              try {
                const ficheId = new URLSearchParams(location.search).get('id') || '';
                const meta = buildProgressMeta(ficheId, (window.__currentFicheItem || {}), document.querySelector('.player-stage iframe') || document.querySelector('iframe'));
                if (!meta.id) return;
                function readList(){ return readProgressList(); }
                function writeList(list){ return writeProgressList(list); }
                function upsertProgress(seconds, duration){
                  const now = Date.now();
                  const d = Math.max(0, duration||0);
                  const s = Math.max(0, seconds||0);
                  if (s < 1) return;
                  let list = readList();
                  // If finished, keep entry and mark as finished
                  if (d > 0 && (d - s) <= 5) {
                    let found = false; list = list.filter(x => x && x.id);
                    for (let i=0;i<list.length;i++) {
                      if (list[i].id === meta.id) {
                        list[i] = { ...list[i], ...meta, seconds: d, duration: d, percent: 1, finished: true, updatedAt: now };
                        found = true; break;
                      }
                    }
                    if (!found) list.unshift({ ...meta, seconds: d, duration: d, percent: 1, finished: true, updatedAt: now });
                    if (list.length > 50) list = list.slice(0,50); writeList(list); return;
                  }
                  let found = false; list = list.filter(x => x && x.id);
                  for (let i=0;i<list.length;i++) {
                    if (list[i].id === meta.id) {
                      const prev = list[i] || {};
                      const sEff = s;
                      const dEff = Math.max(d, prev.duration||0);
                      const percent = dEff > 0 ? (sEff / dEff) : 0;
                      list[i] = { ...prev, ...meta, seconds: sEff, duration: dEff, percent, finished: false, updatedAt: now };
                      found = true; break;
                    }
                  }
                  if (!found) {
                    const percent = d > 0 ? (s / d) : 0;
                    list.unshift({ ...meta, seconds: s, duration: d, percent, finished: false, updatedAt: now });
                  }
                  if (list.length > 50) list = list.slice(0,50); writeList(list);
                  try { window.dispatchEvent(new Event('clipsou-progress-updated')); } catch {}
                }
                function writeFinalProgress(seconds, duration){
                  const now = Date.now();
                  const d = Math.max(0, duration||0);
                  const s = Math.max(0, seconds||0);
                  if (s < 1) return;
                  let list = readList();
                  if (d > 0 && (d - s) <= 5) {
                    let updated = false; list = list.filter(x => x && x.id);
                    for (let i=0;i<list.length;i++) {
                      if (list[i].id === meta.id) {
                        const percent = d > 0 ? (s / d) : 0;
                        list[i] = { ...list[i], ...meta, seconds: d, duration: d, percent: 1, finished: true, updatedAt: now };
                        updated = true; break;
                      }
                    }
                    if (!updated) {
                      list.unshift({ ...meta, seconds: d, duration: d, percent: 1, finished: true, updatedAt: now });
                    }
                    if (list.length > 50) list = list.slice(0,50); writeList(list);
                    try { window.dispatchEvent(new Event('clipsou-progress-updated')); } catch {}
                    return;
                  }
                  let updated = false; list = list.filter(x => x && x.id);
                  for (let i=0;i<list.length;i++) {
                    if (list[i].id === meta.id) {
                      const percent = d > 0 ? (s / d) : 0;
                      list[i] = { ...list[i], ...meta, seconds: s, duration: d, percent, finished: false, updatedAt: now };
                      updated = true; break;
                    }
                  }
                  if (!updated) {
                    const percent = d > 0 ? (s / d) : 0;
                    list.unshift({ ...meta, seconds: s, duration: d, percent, finished: false, updatedAt: now });
                  }
                  if (list.length > 50) list = list.slice(0,50); writeList(list);
                  try { window.dispatchEvent(new Event('clipsou-progress-updated')); } catch {}
                }
                function ensureYT(){ return new Promise((resolve)=>{ try { if (window.YT && window.YT.Player) { resolve(); return; } const prev = document.querySelector('script[src*="youtube.com/iframe_api"]'); if (!prev) { const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s); } const check = ()=>{ if (window.YT && window.YT.Player) resolve(); else setTimeout(check, 100); }; check(); } catch { resolve(); } }); }
                ensureYT().then(()=>{
                  try {
                    const pid = iframe.id; if (!pid || !(window.YT && window.YT.Player)) return;
                    setTimeout(()=>{
                      try {
                        const player = new window.YT.Player(pid, { events: { onReady: function(){ try { const d = player.getDuration?player.getDuration():0; const c = player.getCurrentTime?player.getCurrentTime():0; upsertProgress(c,d); const resumeAt = Math.max(0, Math.min((window.__resumeSeconds||0), (player.getDuration?player.getDuration():d) - 1)); if (resumeAt > 0 && player.seekTo) player.seekTo(resumeAt, true); } catch {} }, onStateChange: function(e){ try { if (e && typeof e.data === 'number' && window.YT && e.data === window.YT.PlayerState.ENDED) { if (overlay && overlay.__close) overlay.__close(); } } catch {} } } });
                        // Expose player to overlay for final flush
                        try { overlay.__playerRef = player; } catch {}
                        let stopped = false; overlay.__activeCleanup = (function(prev){ return function(){
                          try {
                            // Flush last known time instantly on close
                            const p = overlay.__playerRef;
                            if (p && p.getCurrentTime) {
                              const d = p.getDuration ? p.getDuration() : 0;
                              const c = p.getCurrentTime();
                              writeFinalProgress(c, d);
                            }
                          } catch {}
                          stopped = true; if (typeof prev === 'function') try { prev(); } catch {}
                        }; })(overlay.__activeCleanup);
                        const tick = ()=>{ if (stopped) return; try { const d = player.getDuration?player.getDuration():0; const c = player.getCurrentTime?player.getCurrentTime():0; upsertProgress(c,d); if (d>0 && c/d>=0.995) { try { overlay.__close && overlay.__close(); } catch {} return; } } catch {} setTimeout(tick, 5000); };
                        setTimeout(tick, 5000);
                      } catch {}
                    }, 50);
                  } catch {}
                });
              } catch {}
            })();
            return; // Do not create or play intro
          }
        } catch {}

        // Not resuming: attach Skip Intro button now
        try { if (overlay.__skipBtn && !overlay.__skipBtn.parentNode) stage.appendChild(overlay.__skipBtn); } catch {}

        const intro = document.createElement('video');
        intro.src = 'images/intro.mp4'; intro.autoplay = true; intro.playsInline = true; intro.controls = false; intro.preload = 'auto';
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
          // Give it an id so YT API can attach to it
          try { iframe.id = 'ytp_' + Date.now(); } catch {}
          stage.appendChild(iframe);
          window.__introShowing = false;
          // Hide skip when main starts
          try { if (overlay.__skipBtn) { overlay.__skipBtn.hidden = true; overlay.__skipBtn.onclick = null; } } catch {}

          // ----- Watch progress tracking -----
          (function setupWatchProgress(){
            try {
              const ficheId = new URLSearchParams(location.search).get('id') || '';
              const meta = buildProgressMeta(ficheId, (window.__currentFicheItem || {}), document.querySelector('.player-stage iframe') || document.querySelector('iframe'));
              if (!meta.id) return;

              function readList(){ return readProgressList(); }
              function writeList(list){ return writeProgressList(list); }
              function upsertProgress(seconds, duration){
                const now = Date.now();
                const d = Math.max(0, duration||0);
                const s = Math.max(0, seconds||0);
                // Ignore noisy near-zero writes
                if (s < 1) return;
                let list = readList();
                // If finished, keep entry and mark as finished
                if (d > 0 && s / d >= 0.99) {
                  let updated = false; list = list.filter(x => x && x.id);
                  for (let i=0;i<list.length;i++) {
                    if (list[i].id === meta.id) {
                      list[i] = { ...list[i], ...meta, seconds: d, duration: d, percent: 1, finished: true, updatedAt: now };
                      updated = true; break;
                    }
                  }
                  if (!updated) list.unshift({ ...meta, seconds: d, duration: d, percent: 1, finished: true, updatedAt: now });
                  if (list.length > 50) list = list.slice(0,50);
                  writeList(list);
                  try { window.dispatchEvent(new Event('clipsou-progress-updated')); } catch {}
                  return;
                }
                // Insert/update keeping the maximum progressed time
                let found = false;
                list = list.filter(x => x && x.id); // sanitize
                for (let i=0;i<list.length;i++) {
                  if (list[i].id === meta.id) {
                    const prev = list[i] || {};
                    const sEff = s;
                    const dEff = Math.max(d, prev.duration||0);
                    const percent = dEff > 0 ? (sEff / dEff) : 0;
                    list[i] = { ...prev, ...meta, seconds: sEff, duration: dEff, percent, finished: false, updatedAt: now };
                    found = true; break;
                  }
                }
                if (!found) {
                  const percent = d > 0 ? (s / d) : 0;
                  list.unshift({ ...meta, seconds: s, duration: d, percent, finished: false, updatedAt: now });
                }
                // Trim
                if (list.length > 50) list = list.slice(0,50);
                writeList(list);
                try { window.dispatchEvent(new Event('clipsou-progress-updated')); } catch {}
              }

              function ensureYT(){
                return new Promise((resolve)=>{
                  try {
                    if (window.YT && window.YT.Player) { resolve(); return; }
                    const prev = document.querySelector('script[src*="youtube.com/iframe_api"]');
                    if (!prev) {
                      const s = document.createElement('script');
                      s.src = 'https://www.youtube.com/iframe_api';
                      document.head.appendChild(s);
                    }
                    const check = () => { if (window.YT && window.YT.Player) resolve(); else setTimeout(check, 100); };
                    check();
                  } catch { resolve(); }
                });
              }

              ensureYT().then(()=>{
                try {
                  // Attach player to the existing iframe
                  const pid = iframe.id;
                  if (!pid || !(window.YT && window.YT.Player)) return;
                  // Some browsers need a tiny delay for iframe to be fully ready
                  setTimeout(()=>{
                    try {
                      const player = new window.YT.Player(pid, {
                        events: {
                          onReady: function(){
                            try {
                              // Initial write after ready
                              const d = player.getDuration ? player.getDuration() : 0;
                              const c = player.getCurrentTime ? player.getCurrentTime() : 0;
                              upsertProgress(c, d);
                              // Resume from saved position if exists and not explicitly declined
                              try {
                                if (window.__resumeOverride !== 'no') {
                                  const ficheId2 = new URLSearchParams(location.search).get('id') || '';
                                  // Include episode key to target the right entry
                                  let vid2 = '';
                                  try {
                                    const src2 = iframe ? (iframe.src || '') : '';
                                    const m2 = src2.match(/[?&]v=([\w-]{6,})/i) || src2.match(/embed\/([\w-]{6,})/i);
                                    if (m2) vid2 = m2[1];
                                  } catch {}
                                  const keyId = ficheId2 + (vid2 ? ('::' + vid2) : '');
                                  const raw = localStorage.getItem('clipsou_watch_progress_v1');
                                  const list = raw ? JSON.parse(raw) : [];
                                  if (Array.isArray(list)) {
                                    const entry = list.find(x => x && x.id === keyId);
                                    const d = player.getDuration ? player.getDuration() : (entry && entry.duration) || 0;
                                    // Determine resume target:
                                    // - if finished, start at 0
                                    // - else if explicit override seconds provided (>0), use it
                                    // - else use saved seconds if >5
                                    let target = 0;
                                    const finished = !!(entry && entry.finished) || (entry && entry.duration > 0 && (entry.duration - entry.seconds) <= 5);
                                    if (!finished) {
                                      if (typeof window.__resumeSeconds === 'number' && window.__resumeSeconds > 5) {
                                        target = Math.max(0, Math.min(window.__resumeSeconds, d - 1));
                                      } else if (entry && typeof entry.seconds === 'number' && entry.seconds > 5) {
                                        target = Math.max(0, Math.min(entry.seconds, d - 1));
                                      }
                                    }
                                    if (player.seekTo) player.seekTo(target, true);
                                  }
                                }
                              } catch {}
                            } catch {}
                          },
                          onStateChange: function(e){ try { if (e && typeof e.data === 'number' && window.YT && e.data === window.YT.PlayerState.ENDED) { if (overlay && overlay.__close) overlay.__close(); } } catch {} }
                        }
                      });
                      // Expose player to overlay for final flush
                      try { overlay.__playerRef = player; } catch {}
                      // Poll current time every 5s
                      let stopped = false;
                      overlay.__activeCleanup = (function(prev){ return function(){
                        try {
                          const p = overlay.__playerRef;
                          if (p && p.getCurrentTime) {
                            const d = p.getDuration ? p.getDuration() : 0;
                            const c = p.getCurrentTime();
                            upsertProgress(c, d);
                          }
                        } catch {}
                        stopped = true; if (typeof prev === 'function') try { prev(); } catch {}
                      }; })(overlay.__activeCleanup);
                      const tick = () => {
                        if (stopped) return;
                        try {
                          const d = player.getDuration ? player.getDuration() : 0;
                          const c = player.getCurrentTime ? player.getCurrentTime() : 0;
                          upsertProgress(c, d);
                          // If nearly finished, also close overlay automatically
                          if (d > 0 && c/d >= 0.995) { try { overlay.__close && overlay.__close(); } catch {} return; }
                        } catch {}
                        setTimeout(tick, 5000);
                      };
                      setTimeout(tick, 5000);
                    } catch {}
                  }, 50);
                } catch {}
              });
            } catch {}
          })();
        }
        intro.addEventListener('ended', startMain, { once: true });
        intro.addEventListener('error', startMain, { once: true });
        const watchdog = setTimeout(()=>{
          try {
            const progressed = (intro.currentTime||0) > 0.1;
            if (!progressed && !intro.ended && !started) startMain();
          } catch { startMain(); }
        }, 8000);
        try {
          overlay.__activeCleanup = cleanupActive;
          // Wire the skip button for this session
          overlay.__skipIntro = startMain;
          if (overlay.__skipBtn) {
            overlay.__skipBtn.hidden = false;
            overlay.__skipBtn.disabled = false;
            overlay.__skipBtn.onclick = (e)=>{ try { e.preventDefault(); e.stopPropagation(); } catch{} startMain(); };
          }
        } catch {}
        stage.appendChild(intro);
        try { const p = intro.play(); if (p && typeof p.catch === 'function') p.catch(()=>{}); } catch {}
      }

      function handleYouTubeClick(e){
        try {
          const a = e.target && (e.target.closest ? e.target.closest('a') : null);
          if (!a) return;
          const href = a.getAttribute('href') || '';
          if (!isYouTubeUrl(href)) return;
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || (e.button && e.button !== 0)) return;
          e.preventDefault();
          try { e.stopPropagation(); e.stopImmediatePropagation(); } catch {}
          // Get title: for episodes use button text, otherwise use series title
          let title = '';
          try {
            // Check if this is an episode button
            if (a.classList.contains('button') && a.closest('.episodes-rail')) {
              // Get the base label from the button's first text node (before status span)
              const baseText = Array.from(a.childNodes)
                .filter(n => n.nodeType === Node.TEXT_NODE)
                .map(n => n.textContent)
                .join('');
              // Convert "Épisode 3 — EXPLOSION" to "Ep 3 - EXPLOSION"
              title = baseText.trim().replace(/^Épisode\s+(\d+)\s*—\s*/, 'Ep $1 - ');
            } else {
              // Use series title or data-title attribute
              title = (a.closest('.fiche-right')?.querySelector('h3')?.textContent || a.getAttribute('data-title') || '').trim();
            }
          } catch {
            title = (a.closest('.fiche-right')?.querySelector('h3')?.textContent || a.getAttribute('data-title') || '').trim();
          }
          // Check saved progress and ask before starting
          try {
            const ficheId = new URLSearchParams(location.search).get('id') || '';
            // Include episode key using the TARGET href (the episode being launched)
            let vid3 = '';
            try {
              // Support full YouTube URL patterns: watch?v=, embed/, and youtu.be/
              const m3 = href.match(/[?&]v=([\w-]{6,})/i) || href.match(/embed\/([\w-]{6,})/i) || href.match(/youtu\.be\/([\w-]{6,})/i);
              if (m3) vid3 = m3[1];
            } catch {}
            const keyId3 = ficheId + (vid3 ? ('::' + vid3) : '');
            const raw = localStorage.getItem('clipsou_watch_progress_v1');
            const list = raw ? JSON.parse(raw) : [];
            const entry = Array.isArray(list) ? list.find(x => x && x.id === keyId3) : null;
            const seconds = entry && typeof entry.seconds === 'number' ? entry.seconds : 0;
            const duration = entry && typeof entry.duration === 'number' ? entry.duration : 0;
            const isFinished = !!(entry && entry.finished) || (duration > 0 && (duration - seconds) <= 5);
            if (isFinished) {
              // For already-watched content, always restart from the beginning
              try { window.__resumeOverride = 'yes'; } catch {}
              try { window.__resumeSeconds = 0; } catch {}
              showIntroThenPlay(href, title);
            } else if (seconds > 0) {
              askResume(seconds).then((res)=>{
                // If user clicked outside or pressed Escape, cancel entirely
                if (res === null) return;
                const yes = !!res;
                try { window.__resumeOverride = yes ? 'yes' : 'no'; } catch {}
                try { window.__resumeSeconds = yes ? seconds : 0; } catch {}
                // If user chose "Non, depuis le début", drop any previous saved progress for this key
                if (!yes) {
                  try {
                    const raw2 = localStorage.getItem('clipsou_watch_progress_v1');
                    const list2 = raw2 ? JSON.parse(raw2) : [];
                    if (Array.isArray(list2)) {
                      const next = list2.filter(x => x && x.id !== keyId3);
                      localStorage.setItem('clipsou_watch_progress_v1', JSON.stringify(next));
                    }
                  } catch {}
                }
                // Safety: clear any stale intro state before attempting to start
                try { window.__introShowing = false; } catch {}
                // Try to start immediately; if something blocks, retry shortly after
                try { showIntroThenPlay(href, title); } catch {}
                try { setTimeout(() => { if (window && window.__introShowing !== true) showIntroThenPlay(href, title); }, 50); } catch {}
                // Last resort: if overlay didn't open, open YouTube in a new tab so user isn't stuck
                try {
                  setTimeout(() => {
                    try {
                      const openOverlay = document.querySelector('.player-overlay.open');
                      if (!openOverlay) {
                        const w = window.open(href, '_blank', 'noopener');
                        if (w && w.focus) w.focus();
                      }
                    } catch {}
                  }, 250);
                } catch {}
              });
            } else {
              try { window.__resumeOverride = 'yes'; } catch {}
              try { window.__resumeSeconds = 0; } catch {}
              showIntroThenPlay(href, title);
            }
          } catch {
            showIntroThenPlay(href, title);
          }
        } catch {}
      }
      // Register in both capture and bubble phases to maximize reliability
      document.addEventListener('click', handleYouTubeClick, true);
      document.addEventListener('click', handleYouTubeClick, false);
    } catch {}
  })();

  // Add desktop-only arrows for similar content rail
  window.__enhanceFicheRails = function enhanceRailsWithArrows(){
    try {
      const section = document.querySelector('#fiche .section');
      if (!section) return;
      const rail = section.querySelector('.rail');
      if (!rail) return;

      // Always remove existing arrows/fades before evaluating state
      section.querySelectorAll('.rail-arrow, .rail-fade').forEach(el => el.remove());

      if (window.innerWidth <= 768) return; // desktop only

      const isHidden = rail.hidden === true || rail.getAttribute('aria-hidden') === 'true';
      let isDisplayed = true;
      try {
        const display = window.getComputedStyle(rail).display;
        if (!display || display === 'none') isDisplayed = false;
      } catch { isDisplayed = !rail.hidden; }
      if (isHidden || !isDisplayed) return;

      // Create prev arrow
      const prev = document.createElement('button');
      prev.className = 'rail-arrow prev';
      prev.setAttribute('aria-label', 'Défiler vers la gauche');
      prev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
      prev.classList.add('hidden');
      section.appendChild(prev);

      // Create next arrow
      const next = document.createElement('button');
      next.className = 'rail-arrow next';
      next.setAttribute('aria-label', 'Défiler vers la droite');
      next.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>';
      next.classList.add('hidden');
      section.appendChild(next);

      // Create gradient fades
      const fadeL = document.createElement('div');
      fadeL.className = 'rail-fade left hidden';
      section.appendChild(fadeL);

      const fadeR = document.createElement('div');
      fadeR.className = 'rail-fade right hidden';
      section.appendChild(fadeR);

      const prevBtn = prev;
      const nextBtn = next;
      const fadeLeft = fadeL;
      const fadeRight = fadeR;
      const card = rail.querySelector('.card');
      const gap = parseInt(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap || '18', 10) || 18;
      const cardWidth = card ? card.getBoundingClientRect().width : 220;
      const step = Math.round(cardWidth + gap);

      function positionArrows(){
        const secRect = section.getBoundingClientRect();
        const firstCard = rail.querySelector('.card');
        const cardRect = firstCard ? firstCard.getBoundingClientRect() : rail.getBoundingClientRect();
        const topOffset = Math.max(0, Math.round(cardRect.top - secRect.top - 6));
        const cardH = Math.round(cardRect.height + 12);
        [fadeLeft, fadeRight].forEach(el => {
          if (!el) return;
          el.style.top = topOffset + 'px';
          el.style.height = cardH + 'px';
        });
        const arrowH = Math.round(cardRect.height * 0.75);
        const arrowTop = Math.max(0, Math.round((cardRect.top - secRect.top) + (cardRect.height - arrowH) / 2));
        [prevBtn, nextBtn].forEach(btn => {
          btn.style.top = arrowTop + 'px';
          btn.style.height = arrowH + 'px';
          btn.style.alignItems = 'center';
        });
      }

      function setHidden(el, hide, immediate){
        if (!el) return;
        if (hide) {
          if (immediate) el.classList.add('immediate');
          el.classList.add('hidden');
          if (immediate) requestAnimationFrame(()=>{ try { el.classList.remove('immediate'); } catch {} });
        } else {
          el.classList.remove('hidden');
        }
      }

      function updateArrows(){
        const maxScroll = rail.scrollWidth - rail.clientWidth - 1;
        const hasOverflow = rail.scrollWidth > rail.clientWidth + 1;
        if (!hasOverflow) {
          setHidden(prevBtn, true, true);
          setHidden(nextBtn, true, true);
          setHidden(fadeLeft, true, true);
          setHidden(fadeRight, true, true);
          return;
        }
        setHidden(prevBtn, false);
        setHidden(nextBtn, false);
        setHidden(fadeLeft, false);
        setHidden(fadeRight, false);
        const atStart = rail.scrollLeft <= 0;
        const atEnd = rail.scrollLeft >= maxScroll;
        setHidden(prevBtn, atStart, true);
        setHidden(fadeLeft, atStart, true);
        setHidden(nextBtn, atEnd, true);
        setHidden(fadeRight, atEnd, true);
      }

      function perPage(){ return Math.max(1, Math.floor(rail.clientWidth / step)); }
      function scrollByPage(dir){
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const firstIndex = Math.max(0, Math.floor(rail.scrollLeft / step));
        const page = perPage();
        const maxFirst = Math.max(0, Math.ceil((rail.scrollWidth - rail.clientWidth) / step));
        let newFirst = dir > 0 ? firstIndex + page : firstIndex - page;
        if (newFirst < 0) newFirst = 0;
        if (newFirst > maxFirst) newFirst = maxFirst;
        const target = Math.round(newFirst * step);
        rail.scrollTo({ left: target, behavior: prefersReduced ? 'auto' : 'smooth' });
        setTimeout(updateArrows, 300);
      }

      prevBtn.onclick = ()=>scrollByPage(-1);
      nextBtn.onclick = ()=>scrollByPage(1);
      rail.addEventListener('scroll', updateArrows, { passive: true });

      // Initial update with deferred overflow check to allow layout recalculation
      positionArrows();
      requestAnimationFrame(() => {
        setTimeout(() => updateArrows(), 50);
      });

      // Reposition after images load
      rail.querySelectorAll('img').forEach(img => {
        img.addEventListener('load', () => { 
          positionArrows(); 
          updateArrows(); 
        }, { once: true });
      });

      // Observe size changes
      try {
        const ro = new ResizeObserver(() => {
          positionArrows();
          updateArrows();
        });
        ro.observe(rail);
      } catch {}
    } catch (e) {
      // Enhancement des rails échoué silencieusement
    }
  };

  // Re-enhance on window resize (single listener)
  window.addEventListener('resize', ()=>{
    try {
      if (window.innerWidth <= 768) {
        document.querySelectorAll('#fiche .rail-arrow, #fiche .rail-fade').forEach(el => el.remove());
      } else if (window.__enhanceFicheRails) {
        window.__enhanceFicheRails();
      }
    } catch {}
  });

});

// ===== POPUP DE NOTATION POST-VISIONNAGE =====
// Exécuté en dehors du DOMContentLoaded pour fonctionner avec le cache
(function initRatingPopup() {
  // Attendre que le DOM soit prêt
  function init() {
    try {
      // Récupérer l'ID du film actuel depuis l'URL
      const urlParams = new URLSearchParams(window.location.search);
      const currentItemId = urlParams.get('id');
      
      
      if (!currentItemId) {
        return;
      }
      
      // Vérifier si l'utilisateur vient de regarder un film (depuis watch.html)
      let watchedItemId = sessionStorage.getItem('clipsou_just_watched');
      
      if (!watchedItemId) {
        // Vérifier si l'utilisateur a cliqué sur "Regarder" pour CE film
        try {
          const watchingData = localStorage.getItem('clipsou_watching');
          
          if (watchingData) {
            const parsed = JSON.parse(watchingData);
            
            // Si c'est le même film, afficher instantanément
            if (parsed.itemId === currentItemId) {
              watchedItemId = parsed.itemId;
              localStorage.removeItem('clipsou_watching');
            } else {
            }
          }
        } catch (e) {
        }
      } else {
        // Nettoyer le flag
        sessionStorage.removeItem('clipsou_just_watched');
      }
      
      // Vérifier que c'est bien pour le film actuel
      if (!watchedItemId || watchedItemId !== currentItemId) {
        return;
      }
      
      
      // Vérifier les états dans localStorage
      const getRatingStates = () => {
        try {
          const raw = localStorage.getItem('clipsou_rating_states_v1');
          return raw ? JSON.parse(raw) : {};
        } catch {
          return {};
        }
      };
      
      const saveRatingState = (itemId, state) => {
        try {
          const states = getRatingStates();
          states[itemId] = { state, timestamp: Date.now() };
          localStorage.setItem('clipsou_rating_states_v1', JSON.stringify(states));
        } catch {}
      };
      
      const states = getRatingStates();
      const itemState = states[watchedItemId];
      
      // Si déjà noté ou ignoré, ne pas afficher
      if (itemState && (itemState.state === 'rated' || itemState.state === 'ignored')) {
        return;
      }
      
      // Créer la popup
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease;
      `;
      
      const popup = document.createElement('div');
      popup.style.cssText = `
        background: linear-gradient(135deg, #1a1f2e 0%, #0d1117 100%);
        border-radius: 16px;
        padding: 32px;
        max-width: 450px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        animation: slideUp 0.4s ease;
      `;
      
      // Titre
      const title = document.createElement('h2');
      title.style.cssText = `
        margin: 0 0 12px 0;
        font-size: 1.6em;
        color: #fff;
        text-align: center;
      `;
      title.textContent = 'Avez-vous aimé ce contenu ?';
      
      // Sous-titre
      const subtitle = document.createElement('p');
      subtitle.style.cssText = `
        margin: 0 0 24px 0;
        font-size: 0.95em;
        color: rgba(255, 255, 255, 0.7);
        text-align: center;
      `;
      subtitle.textContent = 'Votre avis compte ! Notez ce contenu pour aider les autres.';
      
      // Container des étoiles
      const starsContainer = document.createElement('div');
      starsContainer.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-bottom: 28px;
        cursor: pointer;
      `;
      
      let selectedRating = 0;
      
      // Créer 5 étoiles
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'popup-rating-star';
        star.dataset.value = i;
        star.textContent = '★';
        star.style.cssText = `
          font-size: 42px;
          color: rgba(255, 255, 255, 0.2);
          transition: all 0.2s ease;
          cursor: pointer;
        `;
        
        star.addEventListener('mouseenter', function() {
          const value = parseInt(this.dataset.value);
          starsContainer.querySelectorAll('.popup-rating-star').forEach((s, idx) => {
            if (idx + 1 <= value) {
              s.style.color = '#ffa500';
              s.style.transform = 'scale(1.15)';
            } else {
              s.style.color = 'rgba(255, 255, 255, 0.2)';
              s.style.transform = 'scale(1)';
            }
          });
        });
        
        star.addEventListener('click', async function() {
          const value = parseInt(this.dataset.value);
          selectedRating = value;
          
          // Désactiver les étoiles pendant l'envoi
          starsContainer.style.pointerEvents = 'none';
          starsContainer.style.opacity = '0.5';
          
          // Envoyer au serveur
          try {
            const workerUrl = (window.ClipsouConfig && window.ClipsouConfig.workerUrl) || 'https://clipsou-publish.arthurcapon54.workers.dev';
            const response = await fetch(workerUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'rate_item',
                itemId: watchedItemId,
                rating: value
              })
            });
            
            if (response.ok) {
              // Marquer comme noté
              saveRatingState(watchedItemId, 'rated');
              
              // Afficher feedback de succès
              popup.innerHTML = `
                <div style="text-align: center;">
                  <div style="font-size: 64px; margin-bottom: 16px;">✓</div>
                  <h2 style="color: #4ade80; margin: 0 0 12px 0;">Merci !</h2>
                  <p style="color: rgba(255, 255, 255, 0.7); margin: 0;">Votre note a été enregistrée avec succès.</p>
                </div>
              `;
              
              setTimeout(() => {
                overlay.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => overlay.remove(), 300);
              }, 2000);
            } else {
              throw new Error('Server error');
            }
          } catch (e) {
            console.error('Error saving rating:', e);
            starsContainer.style.pointerEvents = '';
            starsContainer.style.opacity = '1';
            
            // Afficher message d'erreur
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = 'color: #f87171; text-align: center; margin-top: 12px; font-size: 0.9em;';
            errorMsg.textContent = '✗ Erreur lors de l\'enregistrement. Veuillez réessayer.';
            popup.insertBefore(errorMsg, buttonsContainer);
            setTimeout(() => errorMsg.remove(), 3000);
          }
        });
        
        starsContainer.appendChild(star);
      }
      
      starsContainer.addEventListener('mouseleave', function() {
        starsContainer.querySelectorAll('.popup-rating-star').forEach((s, idx) => {
          if (idx + 1 <= selectedRating) {
            s.style.color = '#ffa500';
          } else {
            s.style.color = 'rgba(255, 255, 255, 0.2)';
          }
          s.style.transform = 'scale(1)';
        });
      });
      
      // Boutons d'action
      const buttonsContainer = document.createElement('div');
      buttonsContainer.style.cssText = `
        display: flex;
        gap: 12px;
        flex-direction: column;
      `;
      
      // Bouton "Plus tard"
      const laterBtn = document.createElement('button');
      laterBtn.style.cssText = `
        padding: 14px 24px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: #fff;
        font-size: 1em;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      laterBtn.textContent = '🕒 Plus tard';
      laterBtn.addEventListener('mouseenter', () => {
        laterBtn.style.background = 'rgba(255, 255, 255, 0.15)';
        laterBtn.style.transform = 'translateY(-2px)';
      });
      laterBtn.addEventListener('mouseleave', () => {
        laterBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        laterBtn.style.transform = 'translateY(0)';
      });
      laterBtn.addEventListener('click', () => {
        // Ne rien sauvegarder, la popup pourra réapparaître
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
      });
      
      // Bouton "Ne plus demander"
      const ignoreBtn = document.createElement('button');
      ignoreBtn.style.cssText = `
        padding: 14px 24px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.9em;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      ignoreBtn.textContent = 'Ne plus demander pour ce contenu';
      ignoreBtn.addEventListener('mouseenter', () => {
        ignoreBtn.style.color = 'rgba(255, 255, 255, 0.8)';
      });
      ignoreBtn.addEventListener('mouseleave', () => {
        ignoreBtn.style.color = 'rgba(255, 255, 255, 0.5)';
      });
      ignoreBtn.addEventListener('click', () => {
        saveRatingState(watchedItemId, 'ignored');
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
      });
      
      buttonsContainer.appendChild(laterBtn);
      buttonsContainer.appendChild(ignoreBtn);
      
      // Assembler la popup
      popup.appendChild(title);
      popup.appendChild(subtitle);
      popup.appendChild(starsContainer);
      popup.appendChild(buttonsContainer);
      overlay.appendChild(popup);
      
      // Ajouter les animations CSS
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
      
      // Ajouter au DOM avec un petit délai pour l'effet
      setTimeout(() => {
        document.body.appendChild(overlay);
      }, 500);
      
      // Fermer en cliquant sur l'overlay (comme "Plus tard")
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.style.animation = 'fadeOut 0.3s ease';
          setTimeout(() => overlay.remove(), 300);
        }
      });
      
    } catch (e) {
      console.error('Error initializing rating popup:', e);
    }
  }
  
  // Appeler init immédiatement si le DOM est prêt, sinon attendre
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Écouter le changement de langue pour mettre à jour les types des cartes
window.addEventListener('languageChanged', function(e) {
  const lang = e.detail && e.detail.language;
  if (lang && window.i18n && typeof window.i18n.updateCardTypes === 'function') {
    window.i18n.updateCardTypes(lang);
  }
});
