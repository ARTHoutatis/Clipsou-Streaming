document.addEventListener('DOMContentLoaded', async function () {
  // Always start at the top on load/refresh (avoid browser restoring scroll)
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch {}
  try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch { window.scrollTo(0,0); }
  try { setTimeout(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, 0); } catch {}
  try {
    window.addEventListener('pageshow', function(e){
      // Always reset to top even on BFCache restore
      try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch { window.scrollTo(0,0); }
    });
  } catch {}
  // Audio unlocker: primes WebAudio on first user gesture so autoplay with sound is allowed later
  (function installAudioUnlocker(){
    try {
      const KEY = 'clipsou_audio_ok';
      if (localStorage.getItem(KEY) === '1') return; // already unlocked
      let ctx = null;
      const unlock = async () => {
        try {
          if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) { cleanup(); return; }
            ctx = new AC();
          }
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          // play ultra-short silent buffer to satisfy engagement policies
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          try { source.start(0); } catch {}
          localStorage.setItem(KEY, '1');
        } catch {}
        cleanup();
      };
      const cleanup = () => {
        try { document.removeEventListener('pointerdown', unlock); } catch {}
        try { document.removeEventListener('touchstart', unlock, { passive: true }); } catch {}
        try { document.removeEventListener('keydown', unlock); } catch {}
      };
      try { document.addEventListener('pointerdown', unlock, { once: true }); } catch {}
      try { document.addEventListener('touchstart', unlock, { once: true, passive: true }); } catch {}
      try { document.addEventListener('keydown', unlock, { once: true }); } catch {}
    } catch {}
  })();
  // Backward-compatibility handling for old hash links removed intentionally.
  // Ensure lazy/async attrs on all images
  document.querySelectorAll('img').forEach(function (img) {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    if (!img.getAttribute('alt')) img.setAttribute('alt', 'Image – Clipsou Streaming');
  });

  // ========== Drawer (hamburger) ==========
  (function setupDrawer(){
    const btn = document.querySelector('.hamburger');
    const drawer = document.getElementById('app-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const closeBtn = drawer ? drawer.querySelector('.close-drawer') : null;
    if (!btn || !drawer || !overlay) return; // Only on homepage where drawer exists

    function open(){
      drawer.classList.add('open');
      overlay.classList.add('open');
      drawer.setAttribute('aria-hidden','false');
      overlay.setAttribute('aria-hidden','false');
      try {
        document.body.style.overflow = 'hidden';
        // On mobile, fix the body to lock scroll entirely
        if (window.innerWidth <= 768) {
          const y = window.pageYOffset || document.documentElement.scrollTop || 0;
          document.body.dataset.lockY = String(y);
          document.body.style.position = 'fixed';
          document.body.style.top = `-${y}px`;
          document.body.style.width = '100%';
          document.body.style.left = '0';
          document.body.style.right = '0';
        }
      } catch {}
      try { document.body.classList.add('drawer-open'); document.documentElement.classList.add('drawer-open'); } catch {}
      try { btn.setAttribute('aria-expanded','true'); } catch {}
    }
    function close(){
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      drawer.setAttribute('aria-hidden','true');
      overlay.setAttribute('aria-hidden','true');
      try {
        document.body.style.overflow = '';
        // Restore scroll when unlocking on mobile
        if (window.innerWidth <= 768) {
          const yStr = document.body.dataset.lockY || '0';
          const y = parseInt(yStr, 10) || 0;
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.left = '';
          document.body.style.right = '';
          delete document.body.dataset.lockY;
          window.scrollTo({ top: y, left: 0, behavior: 'auto' });
        }
      } catch {}
      try { document.body.classList.remove('drawer-open'); document.documentElement.classList.remove('drawer-open'); } catch {}
      try { btn.setAttribute('aria-expanded','false'); } catch {}
    }
    btn.addEventListener('click', () => {
      if (drawer.classList.contains('open')) { close(); return; }
      try { buildDrawerLinks(); } catch {}
      open();
    });
    overlay.addEventListener('click', close);
    if (closeBtn) closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') close(); });

    // Smooth scroll for drawer links (center target section in viewport)
    function enableLink(link){
      link.addEventListener('click', (e)=>{
        const href = link.getAttribute('href')||'';
        if (href.startsWith('#')) {
          e.preventDefault();
          try {
            const target = document.querySelector(href);
            if (target) {
              close();
              // Center the section in the viewport
              const rect = target.getBoundingClientRect();
              const currentY = window.pageYOffset || document.documentElement.scrollTop || 0;
              const targetCenterY = currentY + rect.top + (rect.height / 2) - (window.innerHeight / 2);
              const top = Math.max(0, Math.round(targetCenterY));
              const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              window.scrollTo({ top, left: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
            }
          } catch {}
        }
      });
    }

    // Build section links dynamically (Top Rated + all genre sections built later)
    function buildDrawerLinks(){
      const list = document.getElementById('drawer-sections');
      if (!list) return;
      // Keep first fixed entry (Top Rated) and remove others
      const fixed = Array.from(list.querySelectorAll('li'))[0] || null;
      list.innerHTML = '';
      if (fixed) list.appendChild(fixed);

      // Find genre sections
      const sections = Array.from(document.querySelectorAll('.section[id^="genre-"] h2'));
      sections.forEach(h2 => {
        const section = h2.closest('.section');
        if (!section || !section.id) return;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'link';
        a.href = '#' + section.id;
        a.textContent = h2.textContent || section.id.replace(/^genre-/, '');
        li.appendChild(a);
        list.appendChild(li);
        enableLink(a);
      });

      // Ensure all anchors (including the fixed 'Mieux notés') have handlers
      list.querySelectorAll('a').forEach(a => {
        if (!a.dataset.drawerEnabled) {
          enableLink(a);
          a.dataset.drawerEnabled = '1';
        }
      });
    }
    // Observe DOM for new genre sections and rebuild automatically
    try {
      const mo = new MutationObserver((mutList)=>{
        for (const m of mutList) {
          for (const n of m.addedNodes) {
            if (n && n.nodeType === 1) {
              const el = /** @type {HTMLElement} */(n);
              const id = (el.id || '').toLowerCase();
              if (id.startsWith('genre-') || el.querySelector?.('[id^="genre-"]')) {
                buildDrawerLinks();
                return;
              }
            }
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch {}

    // Expose for later
    window.__rebuildDrawerLinks = buildDrawerLinks;
    // Initial build (will be rebuilt after sections are created)
    buildDrawerLinks();
    // Safety: rebuild shortly after load in case sections arrive asynchronously
    try { setTimeout(buildDrawerLinks, 300); } catch {}
  })();

  // Helper to set up carousel controls once slides/indicators are built
  function setupCarousel() {
    const carousel = document.querySelector('.carousel-container');
    if (!carousel) return;
    const slidesTrack = carousel.querySelector('.carousel-slides');
    const indicatorsWrap = carousel.querySelector('.carousel-indicators');
    const indicators = carousel.querySelectorAll('.carousel-indicator');

    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    let currentIndex = 0;
    let resumeTimeout = null;
    let autoInterval = null;

    function clearResumeTimer() {
      if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null; }
    }

    function stopAuto() {
      if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
    }

    function startAuto() {
      stopAuto();
      autoInterval = setInterval(() => {
        nextSlide();
      }, 5000); // 5s per slide
    }

    function scheduleResume() {
      clearResumeTimer();
      resumeTimeout = setTimeout(() => {
        startAuto();
      }, 10000); // 10s
    }

    function goToSlide(index) {
      if (!slidesTrack) return;
      // Always run in manual mode (CSS keyframes disabled)
      slidesTrack.classList.add('manual');
      if (indicatorsWrap) indicatorsWrap.classList.add('manual');

      const maxIndex = Math.max(0, indicators.length - 1);
      currentIndex = clamp(index, 0, maxIndex);
      // Translate based on slide count
      const count = Math.max(1, indicators.length);
      const step = 100 / count; // percentage per slide
      const offsetPercent = currentIndex * step;
      slidesTrack.style.transform = `translateX(-${offsetPercent}%)`;

      // Update active indicator and aria-current
      indicators.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
        dot.setAttribute('aria-current', i === currentIndex ? 'true' : 'false');
      });

      // Schedule auto-resume after inactivity
      scheduleResume();
    }

    function nextSlide() {
      const count = Math.max(1, indicators.length);
      const next = (currentIndex + 1) % count;
      goToSlide(next);
    }

    function prevSlide() {
      const count = Math.max(1, indicators.length);
      const prev = (currentIndex - 1 + count) % count;
      goToSlide(prev);
    }

    indicators.forEach((dot) => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.getAttribute('data-index') || '0', 10);
        stopAuto();
        goToSlide(idx);
      });
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const idx = parseInt(dot.getAttribute('data-index') || '0', 10);
          stopAuto();
          goToSlide(idx);
        }
      });
    });

    // Mobile arrows
    const prevBtn = carousel.querySelector('.carousel-arrow.prev');
    const nextBtn = carousel.querySelector('.carousel-arrow.next');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        stopAuto();
        prevSlide();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        stopAuto();
        nextSlide();
      });
    }

    // Initialize: disable CSS keyframes and start JS autoplay from slide 0
    if (slidesTrack) slidesTrack.classList.add('manual');
    if (indicatorsWrap) indicatorsWrap.classList.add('manual');
    goToSlide(0);
    startAuto();
  }

  // Auto-populate "Mieux notés" with all films rated >= 3.5
  const topRatedSection = document.querySelector('#top-rated .rail');
  if (topRatedSection) {
    // Collect existing items in Top Rated (by link href) to avoid duplicates
    const existingHrefs = new Set(
      Array.from(topRatedSection.querySelectorAll('.card a'))
        .map(a => a.getAttribute('href') || '')
    );

    // Find all film or series cards with rating >= 3.5 across the page (outside Top Rated)
    const allFilmCards = Array.from(document.querySelectorAll('.section .rail .card'))
      .filter(card => !card.closest('#top-rated'))
      .filter(card => {
        const info = card.querySelector('.card-info');
        if (!info) return false;
        const type = (info.getAttribute('data-type') || card.getAttribute('data-type') || '').toLowerCase();
        const ratingStr = info.getAttribute('data-rating');
        const rating = ratingStr ? parseFloat(ratingStr.replace(',', '.')) : NaN;
        const isFilmOrSerie = type === 'film' || type === 'serie' || type === 'série';
        return isFilmOrSerie && !Number.isNaN(rating) && rating >= 3.5;
      });

    // Append missing ones to Top Rated
    allFilmCards.forEach(card => {
      const a = card.querySelector('a');
      const href = a ? (a.getAttribute('href') || '') : '';
      if (!existingHrefs.has(href) && href) {
        const clone = card.cloneNode(true);
        // Ensure images have lazy/async like above
        clone.querySelectorAll('img').forEach(function (img) {
          if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
          if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
          if (!img.getAttribute('alt')) img.setAttribute('alt', 'Image – Clipsou Streaming');
        });
        topRatedSection.appendChild(clone);
        existingHrefs.add(href);
      }
    });
  }

  // Mobile tweak: hide Partenariats popup title on small screens (defensive in case CSS is overridden)
  function syncMobileUI() {
    const isMobile = window.innerWidth <= 768;
    document.body.classList.toggle('is-mobile', isMobile);
    const partTitle = document.getElementById('partenariats-title');
    if (!partTitle) return;
    if (isMobile) {
      // Force-hide with inline !important in case external CSS overrides
      try { partTitle.style.setProperty('display', 'none', 'important'); } catch {}
      partTitle.setAttribute('aria-hidden', 'true');
    } else {
      try { partTitle.style.removeProperty('display'); } catch {}
      partTitle.removeAttribute('aria-hidden');
    }
  }
  const syncOnNav = () => syncMobileUI();
  syncMobileUI();
  window.addEventListener('resize', syncOnNav);
  window.addEventListener('hashchange', syncOnNav);

  // Auto-build sections from popups so nothing depends on pre-existing cards
  (async function buildFromPopups() {
    // Utility: slugify for ids
    const slug = (name) => (name || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // Collect items from popups
    const items = [];
    document.querySelectorAll('.fiche-popup[id]').forEach(popup => {
      const id = popup.getAttribute('id');
      if (!/^film\d+|^serie\d+/i.test(id)) return;
      const titleEl = popup.querySelector('h3');
      const title = titleEl ? titleEl.textContent.trim().replace(/\s+/g, ' ') : '';
      const imgEl = popup.querySelector('.fiche-left img');
      const image = imgEl ? imgEl.getAttribute('src') : '';
      const genreEls = popup.querySelectorAll('.rating-genres .genres .genre-tag');
      const genres = Array.from(genreEls).map(g => g.textContent.trim()).filter(Boolean);
      const starsText = (popup.querySelector('.rating-genres .stars') || {}).textContent || '';
      const m = starsText.match(/([0-9]+(?:[\.,][0-9]+)?)/);
      const rating = m ? parseFloat(m[1].replace(',', '.')) : undefined;
      let description = '';
      const descEl = popup.querySelector('.fiche-right p');
      if (descEl) description = descEl.textContent.trim();
      const imgName = (image || '').split('/').pop();
      const baseName = (imgName || '').replace(/\.(jpg|jpeg|png|webp)$/i, '').replace(/\d+$/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      let category = 'LEGO';
      if (['ur', 'bac', 'ba', 'de'].includes(baseName)) category = 'Minecraft';
      else if (['ja', 'ka'].includes(baseName)) category = 'Live-action';
      let type = 'film';
      if (/^serie/i.test(id)) type = 'série'; else if (/trailer/i.test(title)) type = 'trailer';
      items.push({ id, title, image, genres, rating, type, category, description, baseName });
    });

    // Merge from shared JSON (visible to all). If it fails, fallback to localStorage only on this device.
    let sharedLoaded = false;
    try {
      const res = await fetch('data/approved.json?v=' + Date.now(), { credentials: 'same-origin', cache: 'no-store' });
      if (res && res.ok) {
        const approved = await res.json();
        if (Array.isArray(approved)) {
          approved.forEach(c => {
            if (!c || !c.id || !c.title) return;
            const type = c.type || 'film';
            const portraitImage = c.portraitImage || c.image || '';
            const landscapeImage = c.landscapeImage || c.image || '';
            const imgName = (landscapeImage || portraitImage || '').split('/').pop();
            const baseName = (imgName || '').replace(/\.(jpg|jpeg|png|webp)$/i, '').replace(/\d+$/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const rating = (typeof c.rating === 'number') ? c.rating : undefined;
            items.push({ id: c.id, title: c.title, image: landscapeImage || portraitImage || 'apercu.png', portraitImage, landscapeImage, genres: Array.isArray(c.genres) ? c.genres.filter(Boolean) : [], rating, type, category: c.category || 'LEGO', description: c.description || '', baseName, watchUrl: c.watchUrl || '' });
          });
          sharedLoaded = true;
        }
      }
    } catch {}

    if (!sharedLoaded) {
      try {
        const approvedRaw = localStorage.getItem('clipsou_items_approved_v1');
        if (approvedRaw) {
          const approved = JSON.parse(approvedRaw);
          if (Array.isArray(approved)) {
            approved.forEach(c => {
              if (!c || !c.id || !c.title) return;
              const type = c.type || 'film';
              const portraitImage = c.portraitImage || c.image || '';
              const landscapeImage = c.landscapeImage || c.image || '';
              const imgName = (landscapeImage || portraitImage || '').split('/').pop();
              const baseName = (imgName || '').replace(/\.(jpg|jpeg|png|webp)$/i, '').replace(/\d+$/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
              const rating = (typeof c.rating === 'number') ? c.rating : undefined;
              items.push({ id: c.id, title: c.title, image: landscapeImage || portraitImage || 'apercu.png', portraitImage, landscapeImage, genres: Array.isArray(c.genres) ? c.genres.filter(Boolean) : [], rating, type, category: c.category || 'LEGO', description: c.description || '', baseName, watchUrl: c.watchUrl || '' });
            });
          }
        }
      } catch {}
    }

    // De-duplicate by id
    {
      const seen = new Set();
      const out = [];
      for (const it of items) { if (!it || !it.id) continue; if (seen.has(it.id)) continue; seen.add(it.id); out.push(it); }
      items.length = 0; items.push(...out);
    }

    // Helper: derive thumbnail and backgrounds
    function deriveThumbnail(src) {
      if (!src) return '';
      try {
        const m = src.match(/^(.*?)(\d+)?\.(jpg|jpeg|png|webp)$/i);
        if (!m) return src;
        const base = m[1];
        const originalExt = m[3].toLowerCase();
        const candidates = [base + '.webp', base + '.jpg', base + '.jpeg', base + '.png', base + '.' + originalExt];
        return candidates.filter((v, i, a) => a.indexOf(v) === i);
      } catch { return [src]; }
    }
    function deriveBackgrounds(src) {
      if (!src) return [];
      try {
        const m = src.match(/^(.*?)(\d+)?\.(jpg|jpeg|png|webp)$/i);
        if (!m) return [src];
        const base = m[1];
        const originalExt = m[3].toLowerCase();
        const withOne = [base + '1.webp', base + '1.jpg', base + '1.jpeg', base + '1.png'];
        const withoutOne = [base + '.webp', base + '.jpg', base + '.jpeg', base + '.png', base + '.' + originalExt];
        const seq = [...withOne, ...withoutOne, src];
        return seq.filter((v, i, a) => a.indexOf(v) === i);
      } catch { return [src]; }
    }

    // Helper to create a card node from item
    function createCard(item) {
      const card = document.createElement('div'); card.className = 'card';
      const a = document.createElement('a'); a.setAttribute('href', `fiche.html?id=${item.id}`);
      const img = document.createElement('img');
      const primaryPortrait = item.portraitImage || '';
      const thumbs = primaryPortrait ? [primaryPortrait] : deriveThumbnail(item.image);
      let idx = 0; img.src = (thumbs && thumbs[0]) || item.image || 'apercu.png';
      img.onerror = function () { if (idx < thumbs.length - 1) { idx += 1; this.src = thumbs[idx]; } else if (this.src !== 'apercu.png') { this.src = 'apercu.png'; } };
      img.setAttribute('alt', `Affiche de ${item.title}`);
      img.setAttribute('loading', 'lazy'); img.setAttribute('decoding', 'async');
      const info = document.createElement('div'); info.className = 'card-info'; info.setAttribute('data-type', item.type || 'film'); if (typeof item.rating !== 'undefined') info.setAttribute('data-rating', String(item.rating));
      const media = document.createElement('div'); media.className = 'card-media';
      const badge = document.createElement('div'); badge.className = 'brand-badge'; const logo = document.createElement('img'); logo.src = 'clipsoustudio.png'; logo.alt = 'Clipsou Studio'; logo.setAttribute('loading', 'lazy'); logo.setAttribute('decoding', 'async'); badge.appendChild(logo);
      media.appendChild(img); media.appendChild(badge); a.appendChild(media); a.appendChild(info); card.appendChild(a); return card;
    }

    // Populate Top Rated (sorted by rating desc)
    const topRated = document.querySelector('#top-rated .rail');
    if (topRated) {
      const sorted = items.filter(it => typeof it.rating === 'number' && it.rating >= 3.5)
        .sort((a, b) => { const ra = (typeof a.rating === 'number') ? a.rating : -Infinity; const rb = (typeof b.rating === 'number') ? b.rating : -Infinity; if (rb !== ra) return rb - ra; return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' }); });
      topRated.innerHTML = ''; sorted.forEach(it => topRated.appendChild(createCard(it)));
    }

    // Helpers to normalize and pretty-print genre names (merge accents/variants)
    const normalizeGenre = (name) => (name || '')
      .trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const PRETTY_MAP = {
      'comedie': 'Comédie',
      'action': 'Action',
      'drame': 'Drame',
      'familial': 'Familial',
      'horreur': 'Horreur',
      'aventure': 'Aventure',
      'thriller': 'Thriller',
      'fantastique': 'Fantastique',
      'western': 'Western',
      'mystere': 'Mystère',
      'ambience': 'Ambience',
      'enfants': 'Enfants',
      'super-heros': 'Super‑héros',
      'psychologique': 'Psychologique',
    };
    const prettyGenre = (name) => PRETTY_MAP[normalizeGenre(name).replace(/\s+/g,'-')] || (function(){
      const n = (name||'').trim();
      return n.charAt(0).toUpperCase() + n.slice(1);
    })();

    // Group by normalized genre and ensure sections
    const firstPopup = document.querySelector('.fiche-popup');
    const byGenre = new Map();
    items.forEach(it => {
      (it.genres || []).forEach(g => {
        if (!g) return;
        const norm = normalizeGenre(g);
        if (!byGenre.has(norm)) byGenre.set(norm, { name: prettyGenre(g), list: [] });
        byGenre.get(norm).list.push(it);
      });
    });
    function genreEmoji(name) { const g = (name || '').toLowerCase(); const map = { 'action':'🔥','comédie':'😂','comedie':'😂','drame':'😢','familial':'👨‍👩‍👧','horreur':'👻','aventure':'🗺️','thriller':'🗡️','fantastique':'✨','western':'🤠','mystère':'🕵️','mystere':'🕵️','ambience':'🌫️','enfants':'🧒','super-héros':'🦸','super heros':'🦸','psychologique':'🧠' }; return map[g] || '🎞️'; }
    // Build only the fixed whitelist of genres
    const ALLOWED_GENRES = new Set(['comedie','familial','aventure','action','horreur']);
    byGenre.forEach((entry, normKey) => {
      const list = entry && entry.list || [];
      const displayName = entry && entry.name ? entry.name : 'Genres';
      const id = 'genre-' + slug(displayName);
      const lowerName = normKey; // already normalized
      // If not in the whitelist, remove any pre-existing section and skip
      if (!ALLOWED_GENRES.has(lowerName)) { const existing = document.getElementById(id); if (existing) existing.remove(); return; }
      if (!list || list.length < 1) { const existingSection = document.getElementById(id); if (existingSection) existingSection.remove(); return; }
      let section = document.getElementById(id);
      if (!section) { section = document.createElement('div'); section.className = 'section'; section.id = id; const h2 = document.createElement('h2'); h2.textContent = `${genreEmoji(displayName)} ${displayName}`; const rail = document.createElement('div'); rail.className = 'rail'; section.appendChild(h2); section.appendChild(rail); if (firstPopup && firstPopup.parentNode) firstPopup.parentNode.insertBefore(section, firstPopup); else (document.querySelector('main') || document.body).appendChild(section); }
      const rail = section.querySelector('.rail'); const header = section.querySelector('h2'); if (header) header.textContent = `${genreEmoji(displayName)} ${displayName}`;
      const sorted = list.slice().sort((a, b) => { const ra = (typeof a.rating === 'number') ? a.rating : -Infinity; const rb = (typeof b.rating === 'number') ? b.rating : -Infinity; if (rb !== ra) return rb - ra; return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' }); });
      rail.innerHTML = ''; const seen = new Set(); sorted.forEach(it => { const href = `#${it.id}`; if (seen.has(href)) return; rail.appendChild(createCard(it)); seen.add(href); });
      if (rail.querySelectorAll('.card').length <= 0) { section.remove(); }
      else { try { window.__genreSectionIds = window.__genreSectionIds || new Set(); window.__genreSectionIds.add(id); } catch {} }
    });

    // After all rails are (re)built, add desktop-only arrows and wire scroll
    function enhanceRailsWithArrows(){
      if (window.innerWidth <= 768) return; // desktop only
      document.querySelectorAll('.section').forEach(section => {
        const rail = section.querySelector('.rail');
        if (!rail) return;
        // Avoid duplicates
        if (!section.querySelector('.rail-arrow.prev')) {
          const prev = document.createElement('button');
          prev.className = 'rail-arrow prev';
          prev.setAttribute('aria-label','Défiler vers la gauche');
          prev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
          prev.classList.add('hidden');
          section.appendChild(prev);
        }
        if (!section.querySelector('.rail-arrow.next')) {
          const next = document.createElement('button');
          next.className = 'rail-arrow next';
          next.setAttribute('aria-label','Défiler vers la droite');
          next.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>';
          next.classList.add('hidden');
          section.appendChild(next);
        }
        // Ensure gradient fades exist (under arrows)
        if (!section.querySelector('.rail-fade.left')) {
          const fadeL = document.createElement('div');
          fadeL.className = 'rail-fade left hidden';
          section.appendChild(fadeL);
        }
        if (!section.querySelector('.rail-fade.right')) {
          const fadeR = document.createElement('div');
          fadeR.className = 'rail-fade right hidden';
          section.appendChild(fadeR);
        }

        const prevBtn = section.querySelector('.rail-arrow.prev');
        const nextBtn = section.querySelector('.rail-arrow.next');
        const fadeLeft = section.querySelector('.rail-fade.left');
        const fadeRight = section.querySelector('.rail-fade.right');
        const card = rail.querySelector('.card');
        const gap = parseInt(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap || '18', 10) || 18;
        const cardWidth = card ? card.getBoundingClientRect().width : 220;
        const step = Math.round(cardWidth + gap);
        function positionArrows(){
          // Position arrows to match exactly the card height (excluding rail padding)
          const secRect = section.getBoundingClientRect();
          const firstCard = rail.querySelector('.card');
          const cardRect = firstCard ? firstCard.getBoundingClientRect() : rail.getBoundingClientRect();
          // Expand fade a bit above/below the card to cover hover-lift (cards move ~6px up on hover)
          const topOffset = Math.max(0, Math.round(cardRect.top - secRect.top - 6));
          const cardH = Math.round(cardRect.height + 12);
          // Fades take full extended height
          [fadeLeft, fadeRight].forEach(el => {
            if (!el) return;
            el.style.top = topOffset + 'px';
            el.style.height = cardH + 'px';
          });
          // Arrows are 3/4 of the original card height and centered vertically
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
          const maxScroll = rail.scrollWidth - rail.clientWidth - 1; // tolerance
          const hasOverflow = rail.scrollWidth > rail.clientWidth + 1;
          // If no overflow: slide both out (keep in DOM for animation)
          if (!hasOverflow) {
            setHidden(prevBtn, true, true);
            setHidden(nextBtn, true, true);
            setHidden(fadeLeft, true, true);
            setHidden(fadeRight, true, true);
            return;
          }
          // Default: make both visible (not hidden)
          setHidden(prevBtn, false);
          setHidden(nextBtn, false);
          setHidden(fadeLeft, false);
          setHidden(fadeRight, false);
          // Hide left side at start, right side at end
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
        // Initial update
        positionArrows();
        updateArrows();
        // Reposition after images load (card heights can change)
        rail.querySelectorAll('img').forEach(img => {
          img.addEventListener('load', () => { positionArrows(); }, { once: true });
        });
        // Observe size changes
        try {
          const ro = new ResizeObserver(() => positionArrows());
          ro.observe(rail);
        } catch {}
      });
    }
    enhanceRailsWithArrows();
    window.addEventListener('resize', ()=>{ try { document.querySelectorAll('.rail-arrow').forEach(b=>b.remove()); } catch{}; enhanceRailsWithArrows(); });
    // Category sections removed per request (LEGO, Minecraft, Live-action)

    // Build carousel with 5 random films/séries (exclude trailers)
    (function buildRandomCarousel() {
      const container = document.querySelector('.carousel-container'); if (!container) return;
      const slidesTrack = container.querySelector('.carousel-slides'); const indicatorsWrap = container.querySelector('.carousel-indicators'); if (!slidesTrack || !indicatorsWrap) return;
      const pool = items.filter(it => { const t = (it.type || '').toLowerCase(); return t === 'film' || t === 'série' || t === 'serie'; }); if (pool.length === 0) return;
      const arr = pool.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      const chosen = arr.slice(0, Math.min(5, arr.length)); slidesTrack.innerHTML = ''; indicatorsWrap.innerHTML = '';
      chosen.forEach((it, idx) => {
        const slide = document.createElement('div'); slide.className = 'carousel-slide';
        const bg = document.createElement('img'); bg.setAttribute('alt', ''); bg.setAttribute('aria-hidden', 'true'); bg.decoding = 'async'; if (idx === 0) { bg.loading = 'eager'; try { bg.fetchPriority = 'high'; } catch {} } else { bg.loading = 'lazy'; try { bg.fetchPriority = 'low'; } catch {} }
        Object.assign(bg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', zIndex: '0' }); if ((it.baseName || '').toLowerCase() === 'bac') { bg.style.objectPosition = 'top center'; }
        const primaryBg = it.landscapeImage || (it.image || ''); const backs = primaryBg ? [primaryBg, ...deriveBackgrounds(primaryBg)] : deriveBackgrounds(it.image || ''); let bIdx = 0; bg.src = backs[bIdx] || (it.image || ''); bg.onerror = function () { if (bIdx < backs.length - 1) { bIdx += 1; this.src = backs[bIdx]; } };
        const content = document.createElement('div'); content.className = 'carousel-content';
        const h2 = document.createElement('h2'); h2.className = 'carousel-title'; h2.textContent = it.title || '';
        const genresWrap = document.createElement('div'); genresWrap.className = 'carousel-genres'; if (typeof it.rating === 'number' && !Number.isNaN(it.rating)) { const ratingSpan = document.createElement('span'); ratingSpan.className = 'carousel-rating'; const rounded = Math.round(it.rating * 10) / 10; let txt = rounded.toFixed(1); if (txt.endsWith('.0')) txt = String(Math.round(rounded)); const star = document.createElement('span'); star.className = 'star'; star.textContent = '★'; star.setAttribute('aria-hidden', 'true'); ratingSpan.appendChild(star); ratingSpan.appendChild(document.createTextNode(`${txt}/5`)); ratingSpan.setAttribute('aria-label', `Note ${txt} sur 5`); ratingSpan.setAttribute('data-rating', String(it.rating)); genresWrap.appendChild(ratingSpan); } (it.genres || []).slice(0, 3).forEach(g => { const tag = document.createElement('span'); tag.className = 'carousel-genre-tag'; tag.textContent = g; genresWrap.appendChild(tag); });
        const p = document.createElement('p'); p.className = 'carousel-description'; p.textContent = it.description || '';
        const link = document.createElement('a'); link.className = 'carousel-btn'; link.href = `fiche.html?id=${it.id}`; link.textContent = 'Voir la fiche';
        content.appendChild(h2); content.appendChild(genresWrap); if (it.description) content.appendChild(p); content.appendChild(link);
        slide.appendChild(bg); slide.appendChild(content); slidesTrack.appendChild(slide);
        const dot = document.createElement('div'); dot.className = 'carousel-indicator' + (idx === 0 ? ' active' : ''); dot.setAttribute('role', 'button'); dot.setAttribute('tabindex', '0'); dot.setAttribute('aria-label', `Aller à la diapositive ${idx + 1}`); dot.setAttribute('data-index', String(idx)); if (idx === 0) dot.setAttribute('aria-current', 'true'); indicatorsWrap.appendChild(dot);
      });
      setupCarousel();
      // Final safety: rebuild after carousel construction
      try { if (typeof window.__rebuildDrawerLinks === 'function') setTimeout(window.__rebuildDrawerLinks, 0); } catch {}
    })();
  })();

  // Ensure any pre-existing cards get a .card-media wrapper and a badge overlay on the image only
  (function ensureCardBadges() {
    document.querySelectorAll('.card a').forEach(a => {
      let media = a.querySelector('.card-media');
      let imgIn = a.querySelector(':scope > img');
      if (!media) {
        // If there is a direct img under <a>, wrap it in .card-media
        if (imgIn) {
          media = document.createElement('div');
          media.className = 'card-media';
          a.insertBefore(media, imgIn);
          media.appendChild(imgIn);
        }
      }
      // If still no media but there is an img somewhere, try to place badge relative to that structure
      if (!media) {
        media = a.querySelector('.card-media');
      }
      if (!media) return;

      // Add badge if missing
      if (!media.querySelector('.brand-badge')) {
        const badge = document.createElement('div');
        badge.className = 'brand-badge';
        const logo = document.createElement('img');
        logo.src = 'clipsoustudio.png';
        logo.alt = 'Clipsou Studio';
        logo.setAttribute('loading', 'lazy');
        logo.setAttribute('decoding', 'async');
        badge.appendChild(logo);
        media.appendChild(badge);
      }
    });
  })();

  // Popup closing behavior: make close buttons work even when landing directly via a hash URL
  (function setupPopupClosing() {
    let lastScrollY = null;
    let lastOpener = null;
    let drawerAutoOpened = false;

    // Intercept clicks that open a popup to remember the current scroll position and opener
    document.addEventListener('click', function (e) {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute('href');
      const id = href ? href.replace(/^#/, '') : '';
      if (!id) return;
      const target = document.getElementById(id);
      if (!target || !target.classList.contains('fiche-popup')) return; // not a popup link

      // Save state and open popup without causing an unwanted scroll jump
      lastScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      lastOpener = a;
      e.preventDefault();
      // Defer to allow event loop to finish before changing hash
      setTimeout(() => { 
        window.location.hash = '#' + id; 
        try { 
          if (window.innerWidth <= 768) {
            document.body.classList.add('popup-open');
            document.documentElement.classList.add('popup-open');
            // Lock scroll like for drawer
            const y = window.pageYOffset || document.documentElement.scrollTop || 0;
            document.body.dataset.popupLockY = String(y);
            document.body.style.position = 'fixed';
            document.body.style.top = `-${y}px`;
            document.body.style.width = '100%';
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.overflow = 'hidden';
          }
        } catch {}
        // Ensure the drawer is visible in the background behind the popup
        try {
          const drawer = document.getElementById('app-drawer');
          const overlay = document.getElementById('drawer-overlay');
          if (drawer && !drawer.classList.contains('open')) {
            drawer.classList.add('open');
            drawerAutoOpened = true;
          }
          // Keep the drawer overlay closed/hidden so it doesn't interfere
          if (overlay) overlay.classList.remove('open');
        } catch {}
      }, 0);
    }, { capture: true });

    function clearHash() {
      // Ensure CSS :target unmatches by actually changing the fragment
      if (window.location.hash) {
        window.location.hash = '';
      }
      // Optionally tidy the URL (remove stray #) without adding history entries
      const url = window.location.pathname + window.location.search;
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, document.title, url);
      }
      // Unlock background scroll on mobile
      try { 
        document.body.classList.remove('popup-open');
        document.documentElement.classList.remove('popup-open');
        if (window.innerWidth <= 768) {
          const yStr = document.body.dataset.popupLockY || '0';
          const y = parseInt(yStr, 10) || 0;
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.left = '';
          document.body.style.right = '';
          document.body.style.overflow = '';
          delete document.body.dataset.popupLockY;
          window.scrollTo({ top: y, left: 0, behavior: 'auto' });
        }
      } catch {}
      // If we auto-opened the drawer for background visibility, close it back
      try {
        if (drawerAutoOpened) {
          const drawer = document.getElementById('app-drawer');
          if (drawer) drawer.classList.remove('open');
          const overlay = document.getElementById('drawer-overlay');
          if (overlay) overlay.classList.remove('open');
        }
        drawerAutoOpened = false;
      } catch {}
    }

    // Handle clicks on any .close-btn (override javascript:history.back())
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.close-btn');
      if (!btn) return;
      e.preventDefault();
      clearHash();
      // Restore scroll and focus if we know where the popup was opened
      if (lastScrollY !== null) {
        window.scrollTo({ top: lastScrollY, left: 0, behavior: 'auto' });
      }
      if (lastOpener && typeof lastOpener.focus === 'function') {
        lastOpener.focus();
      }
    });

    // Close when clicking the dark overlay outside the popup content
    document.querySelectorAll('.fiche-popup').forEach(popup => {
      popup.addEventListener('click', function (e) {
        if (e.target === popup) {
          clearHash();
          if (lastScrollY !== null) {
            window.scrollTo({ top: lastScrollY, left: 0, behavior: 'auto' });
          }
          if (lastOpener && typeof lastOpener.focus === 'function') {
            lastOpener.focus();
          }
        }
      });
    });

    // ESC key closes the currently targeted popup
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && window.location.hash) {
        clearHash();
        if (lastScrollY !== null) {
          window.scrollTo({ top: lastScrollY, left: 0, behavior: 'auto' });
        }
        if (lastOpener && typeof lastOpener.focus === 'function') {
          lastOpener.focus();
        }
      }
    });

    // On hash change (e.g., back button), toggle scroll lock accordingly
    window.addEventListener('hashchange', () => {
      try {
        const targetId = (location.hash || '').replace(/^#/, '');
        const isPopup = !!(targetId && document.getElementById(targetId) && document.getElementById(targetId).classList.contains('fiche-popup'));
        if (isPopup && window.innerWidth <= 768) {
          // Engage lock if not already fixed
          document.body.classList.add('popup-open');
          document.documentElement.classList.add('popup-open');
          if (getComputedStyle(document.body).position !== 'fixed') {
            const y = window.pageYOffset || document.documentElement.scrollTop || 0;
            document.body.dataset.popupLockY = String(y);
            document.body.style.position = 'fixed';
            document.body.style.top = `-${y}px`;
            document.body.style.width = '100%';
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.overflow = 'hidden';
          }
        } else {
          // Release lock if present
          document.body.classList.remove('popup-open');
          document.documentElement.classList.remove('popup-open');
          const yStr = document.body.dataset.popupLockY || '0';
          const y = parseInt(yStr, 10) || 0;
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.left = '';
          document.body.style.right = '';
          document.body.style.overflow = '';
          delete document.body.dataset.popupLockY;
          window.scrollTo({ top: y, left: 0, behavior: 'auto' });
        }
      } catch {}
    });
  })();

  // removed scroll buttons logic
  
  // Note: watch links now open directly to external URLs (YouTube, playlists, etc.).
  // No intro interstitial or click interception is used anymore.
});
