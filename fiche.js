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

// Fallback local complet pour usage hors serveur (file://) ou si index.html est inaccessible
const LOCAL_FALLBACK_DB = [
  {
    id: 'film1',
    title: 'La vie au petit âge',
    image: 'La1.jpg',
    genres: ['Comédie','Familial','Aventure'],
    rating: 2.5,
    type: 'film',
    description: "Timmy, un enfant espiègle, nous fait visiter son village dans un monde entièrement construit en briques LEGO. Mais chaque coin de rue réserve son lot de gags et de surprises ! Une aventure familiale pleine d'humour et de tendresse qui ravira petits et grands.",
    watchUrl: 'https://www.youtube.com/watch?v=XtqzuhtuH2E'
  },
  {
    id: 'film2',
    title: 'Dédoublement',
    image: 'Dé1.jpg',
    genres: ['Thriller','Comédie','Action'],
    rating: 4,
    type: 'film',
    description: "Deux frères identiques, l'un vêtu de blanc et l'autre de noir, s'entendent à merveille… jusqu'à ce que l'un finisse en prison. Dans l'univers de Minecraft, ce thriller haletant mêle comédie, suspense et évasion.",
    watchUrl: 'https://www.youtube.com/watch?v=gfbiTpqQDY0'
  },
  {
    id: 'film3',
    title: 'Jackson Goup',
    image: 'Ja1.jpg',
    genres: ['Aventure','Fantastique','Comédie'],
    rating: 3.5,
    type: 'film',
    description: "Un aventurier un peu maladroit traverse des contrées hostiles remplies de créatures féroces. Tourné en prise de vue réelle (live action), ce périple épique mêle humour et fantastique pour un voyage plein de surprises.",
    watchUrl: 'https://www.youtube.com/watch?v=VUqwvqQ51sg'
  },
  {
    id: 'serie1',
    title: 'Alex',
    image: 'Al1.jpg',
    genres: ['Action','Comédie','Familial'],
    rating: 3,
    type: 'série',
    description: "Suivez les aventures captivantes d'Alex, un personnage attachant dans un univers en briques LEGO. Cette série brickfilm innovante mêle action, humour et émotion dans des épisodes soigneusement réalisés qui plairont à tous les âges.",
    watchUrl: 'https://www.youtube.com/playlist?list=PLljfI9MJr5K3O2tycHZBTUd125kT7Radf'
  },
  {
    id: 'serie2',
    title: 'Lawless Legend',
    image: 'Law1.jpg',
    genres: ['Western','Comédie','Action'],
    rating: 3,
    type: 'série',
    description: "Plongez dans l'univers du Far West à travers cette série brickfilm unique ! Cowboys en briques LEGO, duels au soleil couchant et esthétique VHS nostalgique : cette série réinvente le western avec humour dans un style rétro irrésistible.",
    watchUrl: 'https://youtube.com/playlist?list=PLljfI9MJr5K2Li687G4dOxjfyDQkIfJn3&si=FQ0ImMc9j-6wvtRk'
  },
  {
    id: 'film4',
    title: 'Karma',
    image: 'Ka1.jpg',
    genres: ['Horreur','Mystère','Psychologique'],
    rating: 2.5,
    type: 'film',
    description: "Victime de harcèlement scolaire, une adolescente met fin à ses jours. Réalisé en prise de vue réelle, ce récit surnaturel suit le retour d'un esprit tourmenté qui hante son bourreau et le plonge dans une spirale de terreur.",
    watchUrl: 'https://www.youtube.com/watch?v=p79g08Igceo'
  },
  {
    id: 'film5',
    title: 'Trailer BATMAN',
    image: 'Ba1.jpg',
    genres: ['Action','Drame','Super-héros'],
    type: 'trailer',
    description: "Un nouveau trailer de Batman, sombre et intense, réimaginé dans l'univers Minecraft. Découvrez des premières images qui redéfinissent le chevalier noir avec une approche moderne et spectaculaire.",
    watchUrl: 'https://www.youtube.com/watch?v=SzbqZNObLNU'
  },
  {
    id: 'film6',
    title: 'URBANOS city',
    image: 'Ur1.jpg',
    genres: ['Comédie','Familial','Enfants'],
    rating: 2,
    type: 'film',
    description: "Le Noob vous présente, avec humour, la ville d'Urbanos créée sur Minecraft.",
    watchUrl: 'https://www.youtube.com/watch?v=ZcnWsRXHLic'
  },
  {
    id: 'film7',
    title: 'Backrooms URBANOS',
    image: 'Bac1.png',
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
    const res = await fetch('index.html', { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();
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
      const btn = popup.querySelector('.button-group a[href^="http"]');
      if (btn) watchUrl = btn.getAttribute('href');
      items.push({ id, title, image, genres, rating, type, description, watchUrl });
    });

    // Si aucun item n'est trouvé, utiliser le fallback local
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
    a.href = item.watchUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'button';
    a.textContent = '▶ Regarder';
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
  const curGenres = new Set((current.genres || []).map(g => (g || '').toLowerCase()));
  const scored = [];
  for (const it of allItems) {
    if (!it || it.id === current.id) continue;
    const gset = new Set((it.genres || []).map(x => (x || '').toLowerCase()));
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
  // Header avec boutons de bascule (Contenu similaire / Acteurs)
  const header = document.createElement('div');
  header.className = 'section-header';
  const similarBtn = document.createElement('button');
  similarBtn.type = 'button';
  similarBtn.className = 'button secondary similar-toggle active';
  similarBtn.textContent = 'Contenu similaire';
  similarBtn.setAttribute('aria-expanded', 'true');
  header.appendChild(similarBtn);
  const actorsBtn = document.createElement('button');
  actorsBtn.type = 'button';
  actorsBtn.className = 'button secondary actors-toggle';
  actorsBtn.textContent = 'Acteurs';
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
  actorsTitle.textContent = 'Acteurs';
  actorsPanel.appendChild(actorsTitle);
  const actorsGrid = document.createElement('div');
  actorsGrid.className = 'actors-grid';
  actorsPanel.appendChild(actorsGrid);
  section.appendChild(actorsPanel);

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
      const base = deriveBase(it.image);
      const img = document.createElement('img');
      const initialSrc = base ? `${base}.jpg` : (it.image || 'apercu.png');
      img.src = initialSrc;
      if (base) img.setAttribute('data-base', base);
      img.alt = 'Affiche de ' + (it.title || '');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.setAttribute('onerror', `(function(img){var b=img.getAttribute('data-base'); if(!b){img.onerror=null; img.src='apercu.png'; return;} var i=(parseInt(img.dataset.i||'0',10)||0)+1; img.dataset.i=i; var exts=['jpg','jpeg','png']; if(i<exts.length){ img.src=b+'.'+exts[i]; } else { img.onerror=null; img.src='apercu.png'; }})(this)`);
      
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
  // Gestion du bouton Acteurs
  function populateActors() {
    actorsGrid.innerHTML = '';
    const title = (currentItem && currentItem.title) || '';
    const norm = normalizeTitleKey(title);
    const list = ACTOR_DB[title] || ACTOR_DB_NORM[norm] || [];
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'actors-empty';
      empty.textContent = "Aucun acteur renseigné pour cette fiche pour le moment.";
      actorsGrid.appendChild(empty);
      return;
    }
    list.forEach(a => {
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
      // Start with jpeg, then try other extensions
      img.src = './' + baseSlug + '.jpeg';
      // Keep slug for retries with other extensions
      img.setAttribute('data-slug', baseSlug);
      img.alt = a.name;
      // Strong inline sizing to win against any external CSS and prevent cropping
      img.style.width = 'auto';
      img.style.height = '100%';
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      img.style.objectPosition = 'center center';
      img.style.display = 'block';
      img.decoding = 'async';
      // Fallback automatique multi-extensions puis Unknown
      img.onerror = function(){
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
    section.classList.remove('actors-open');
    similarBtn.classList.add('active');
    actorsBtn.classList.remove('active');
    similarBtn.setAttribute('aria-expanded', 'true');
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
    section.classList.add('actors-open');
    actorsBtn.classList.add('active');
    similarBtn.classList.remove('active');
    actorsBtn.setAttribute('aria-expanded', 'true');
    similarBtn.setAttribute('aria-expanded', 'false');
  }
  actorsBtn.addEventListener('click', showActors);
  similarBtn.addEventListener('click', showSimilar);
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
  const item = items.find(it => it.id === id);

  if (!id) {
    document.title = 'Toutes les fiches – Clipsou Streaming';
    renderList(container, items, 'Choisissez une fiche');
    return;
  }

  if (!item) {
    document.title = 'Fiche introuvable – Clipsou Streaming';
    renderList(container, items, 'Fiche introuvable – choisissez parmi la liste');
    return;
  }

  updateHeadSEO(item);
  renderFiche(container, item);
  // Render similar content below the fiche
  try {
    const similar = computeSimilar(items, item, 2, 10);
    const root = document.getElementById('fiche');
    renderSimilarSection(root, similar, item);
  } catch (e) {
    console.warn('Impossible de générer le contenu similaire', e);
  }
  
  // Intro Netflix-like: play intro.mp4 before opening external watch links
  (function setupIntroOverlay(){
    function showIntroThenNavigate(url, target){
      // Avoid multiple overlays
      if (document.getElementById('intro-overlay')) return;
      const overlay = document.createElement('div');
      overlay.id = 'intro-overlay';
      Object.assign(overlay.style, {
        position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.95)', zIndex: '9999',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      });
      const box = document.createElement('div');
      Object.assign(box.style, {
        position: 'relative', width: 'min(900px, 95vw)', height: 'min(506px, 54vw)',
        background: '#000', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', borderRadius: '8px', overflow: 'hidden'
      });
      const video = document.createElement('video');
      video.src = 'intro.mp4?v=1';
      video.autoplay = true;
      video.playsInline = true; // standard
      video.setAttribute('playsinline', ''); // iOS Safari hint
      video.setAttribute('webkit-playsinline', ''); // legacy iOS
      video.controls = false;
      video.muted = false;
      video.preload = 'auto';
      Object.assign(video.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.textContent = 'Passer l\'intro';
      skip.setAttribute('aria-label', "Passer l'intro");
      Object.assign(skip.style, {
        position: 'absolute', right: '12px', top: '12px', zIndex: '2',
        background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
        padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
      });
      function cleanupAndGo(){
        try { overlay.remove(); } catch{}
        if (target === '_blank') window.open(url, '_blank'); else window.location.href = url;
      }
      skip.addEventListener('click', cleanupAndGo);
      video.addEventListener('ended', cleanupAndGo);
      video.addEventListener('error', cleanupAndGo);
      box.appendChild(video);
      box.appendChild(skip);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      // Play intro robustly and synchronously: if play() rejects, retry muted immediately
      let started = false;
      try {
        const p = video.play();
        if (p && typeof p.then === 'function') {
          p.catch(function(){
            try {
              video.muted = true;
              const p2 = video.play();
              if (p2 && typeof p2.then === 'function') {
                p2.catch(function(){ 
                  // Offer manual playback button as a last resort
                  const manual = document.createElement('button');
                  manual.type = 'button';
                  manual.textContent = '▶ Lire l\'intro';
                  manual.setAttribute('aria-label', "Lire l'intro");
                  Object.assign(manual.style, {
                    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                    zIndex: '2', background: '#e50914', color: '#fff', border: '0',
                    padding: '12px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.5)'
                  });
                  manual.addEventListener('click', function(){
                    try {
                      video.muted = false; // let browser decide; click is a gesture
                      const p3 = video.play();
                      if (p3 && typeof p3.then === 'function') {
                        p3.catch(function(){ cleanupAndGo(); });
                      }
                      manual.remove();
                    } catch { cleanupAndGo(); }
                  });
                  box.appendChild(manual);
                });
              }
            } catch { cleanupAndGo(); }
          });
          p.then(function(){ started = true; }).catch(function(){});
        }
      } catch (_e) {
        // Immediate failure
        try {
          video.muted = true;
          const p2 = video.play();
          if (p2 && typeof p2.then === 'function') {
            p2.catch(function(){
              const manual = document.createElement('button');
              manual.type = 'button';
              manual.textContent = '▶ Lire l\'intro';
              manual.setAttribute('aria-label', "Lire l'intro");
              Object.assign(manual.style, {
                position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                zIndex: '2', background: '#e50914', color: '#fff', border: '0',
                padding: '12px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700',
                boxShadow: '0 6px 18px rgba(0,0,0,0.5)'
              });
              manual.addEventListener('click', function(){
                try {
                  video.muted = false;
                  const p3 = video.play();
                  if (p3 && typeof p3.then === 'function') {
                    p3.catch(function(){ cleanupAndGo(); });
                  }
                  manual.remove();
                } catch { cleanupAndGo(); }
              });
              box.appendChild(manual);
            });
          }
        } catch { cleanupAndGo(); }
      }
      // Watchdog: if not started within 2s, propose manual play
      setTimeout(function(){
        try {
          if (!started && (video.paused || video.currentTime === 0)) {
            const existing = box.querySelector('button[aria-label="Lire l\'intro"]');
            if (!existing) {
              const manual = document.createElement('button');
              manual.type = 'button';
              manual.textContent = '▶ Lire l\'intro';
              manual.setAttribute('aria-label', "Lire l'intro");
              Object.assign(manual.style, {
                position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                zIndex: '2', background: '#e50914', color: '#fff', border: '0',
                padding: '12px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700',
                boxShadow: '0 6px 18px rgba(0,0,0,0.5)'
              });
              manual.addEventListener('click', function(){
                try {
                  video.muted = false;
                  const p3 = video.play();
                  if (p3 && typeof p3.then === 'function') {
                    p3.catch(function(){ cleanupAndGo(); });
                  }
                  manual.remove();
                } catch { cleanupAndGo(); }
              });
              box.appendChild(manual);
            }
          }
        } catch (e) { console.warn('intro watchdog error', e); }
      }, 2000);
    }
    // Intercept clicks on external watch buttons
    document.addEventListener('click', function(e){
      const a = e.target && e.target.closest('.button-group a[href^="http"]');
      if (!a) return;
      // Only intercept left-clicks or keyboard activations
      if (e.button !== 0 && e.type === 'click') return;
      e.preventDefault();
      showIntroThenNavigate(a.href, a.getAttribute('target') || '');
    }, { capture: true });
  })();
});
