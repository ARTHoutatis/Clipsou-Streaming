'use strict';

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
  const img = document.createElement('img');
  img.src = item.image || 'apercu.png';
  img.alt = 'Image de ' + (item.title || 'la fiche');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.className = 'landscape';
  left.appendChild(img);

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
  right.appendChild(buttons);

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

function renderSimilarSection(rootEl, similarItems) {
  if (!rootEl || !Array.isArray(similarItems) || similarItems.length === 0) return;
  const section = document.createElement('section');
  section.className = 'section';
  const h2 = document.createElement('h2');
  h2.textContent = 'Contenu similaire';
  section.appendChild(h2);

  const rail = document.createElement('div');
  rail.className = 'rail';
  const currentFrom = new URLSearchParams(location.search).get('from');
  // helper to strip trailing number and force portrait like 'La', 'Ur', 'Ka', 'Law', 'Al'
  function deriveBase(src) {
    if (!src) return '';
    const m = src.match(/^(.*?)(\d+)?\.(jpg|jpeg|png|webp)$/i);
    return m ? m[1] : src.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  }

  similarItems.forEach(it => {
    const card = document.createElement('div');
    card.className = 'card';
    const a = document.createElement('a');
    const extra = currentFrom ? `&from=${encodeURIComponent(currentFrom)}` : '';
    a.href = `fiche.html?id=${encodeURIComponent(it.id)}${extra}`;
    const media = document.createElement('div');
    media.className = 'card-media';
    const img = document.createElement('img');
    const base = deriveBase(it.image);
    const initialSrc = base ? `${base}.jpg` : (it.image || 'apercu.png');
    img.src = initialSrc;
    img.setAttribute('data-base', base);
    img.alt = 'Affiche de ' + (it.title || '');
    img.loading = 'lazy';
    img.decoding = 'async';
    // try jpg -> jpeg -> png then fallback to apercu
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

  section.appendChild(rail);
  rootEl.appendChild(section);
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
    renderSimilarSection(root, similar);
  } catch (e) {
    console.warn('Impossible de générer le contenu similaire', e);
  }
});
