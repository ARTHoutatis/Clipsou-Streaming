document.addEventListener('DOMContentLoaded', function () {
  // Ensure lazy/async attrs on all images
  document.querySelectorAll('img').forEach(function (img) {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    if (!img.getAttribute('alt')) img.setAttribute('alt', 'Image – Clipsou Streaming');
  });

  // Helper to set up carousel controls once slides/indicators are built
  function setupCarousel() {
    const carousel = document.querySelector('.carousel-container');
    if (!carousel) return;
    const slidesTrack = carousel.querySelector('.carousel-slides');
    const slides = slidesTrack ? Array.from(slidesTrack.children) : [];
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

      // Update active slide class for CSS effects
      if (slides && slides.length) {
        slides.forEach((s, i) => s.classList.toggle('active', i === currentIndex));
      }

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
  (function buildFromPopups() {
    // Utility: slugify for ids
    const slug = (name) => (name || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // Collect items from popups
    const items = [];
    document.querySelectorAll('.fiche-popup[id]').forEach(popup => {
      const id = popup.getAttribute('id');
      // Skip non-content popups like partenariat/submit
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
      // Extract a short description (first paragraph inside fiche-right)
      let description = '';
      const descEl = popup.querySelector('.fiche-right p');
      if (descEl) description = descEl.textContent.trim();
      // Detect category from popup image filename (basename without trailing digits/extension)
      // Examples:
      //  - Ur1.jpg -> base "ur" => Minecraft
      //  - Bac1.png -> base "bac" => Minecraft
      //  - Ja1.jpg -> base "ja" => Live-action (Jackson Goup)
      //  - Ba1.jpg -> base "ba" => Live-action (Batman trailer)
      const imgName = (image || '').split('/').pop();
      const baseName = (imgName || '')
        .replace(/\.(jpg|jpeg|png|webp)$/i, '')
        .replace(/\d+$/g, '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
        .toLowerCase();
      let category = 'LEGO';
      // Minecraft: Urbanos (ur), Backrooms Urbanos (bac), Batman trailer (ba), Dédoublement (de)
      if (['ur', 'bac', 'ba', 'de'].includes(baseName)) {
        category = 'Minecraft';
      // Live-action: Jackson Goup (ja), Karma (ka)
      } else if (['ja', 'ka'].includes(baseName)) {
        category = 'Live-action';
      }
      let type = 'film';
      if (/^serie/i.test(id)) type = 'série';
      else if (/trailer/i.test(title)) type = 'trailer';
      items.push({ id, title, image, genres, rating, type, category, description, baseName });
    });

    // Auto-annotation of descriptions disabled by request. Descriptions are managed directly in index.html.

    // Helper: derive thumbnail from popup image (remove trailing digits and prefer .jpg/.jpeg/.png)
    function deriveThumbnail(src) {
      if (!src) return '';
      try {
        const m = src.match(/^(.*?)(\d+)?\.(jpg|jpeg|png|webp)$/i);
        if (!m) return src;
        const base = m[1];
        const originalExt = m[3].toLowerCase();
        const candidates = [
          base + '.jpg',
          base + '.jpeg',
          base + '.png',
          // fallback to original without digit if it already had none
          base + '.' + originalExt
        ];
        // Remove duplicates while preserving order
        return candidates.filter((v, i, a) => a.indexOf(v) === i);
      } catch { return [src]; }
    }

    // Helper: derive preferred BACKGROUND poster list.
    // Tries base+"1".(jpg|jpeg|png) first (e.g., Al1, Law1), then base.(jpg|jpeg|png), then original src.
    function deriveBackgrounds(src) {
      if (!src) return [];
      try {
        const m = src.match(/^(.*?)(\d+)?\.(jpg|jpeg|png|webp)$/i);
        if (!m) return [src];
        const base = m[1];
        const originalExt = m[3].toLowerCase();
        const withOne = [
          base + '1.jpg',
          base + '1.jpeg',
          base + '1.png'
        ];
        const withoutOne = [
          base + '.jpg',
          base + '.jpeg',
          base + '.png',
          base + '.' + originalExt
        ];
        const seq = [...withOne, ...withoutOne, src];
        return seq.filter((v, i, a) => a.indexOf(v) === i);
      } catch { return [src]; }
    }

    // Helper to create a card node from item
    function createCard(item) {
      const card = document.createElement('div');
      card.className = 'card';
      const a = document.createElement('a');
      a.setAttribute('href', `#${item.id}`);
      const img = document.createElement('img');
      const thumbs = deriveThumbnail(item.image);
      let idx = 0;
      img.src = (thumbs && thumbs[0]) || item.image || 'apercu.png';
      img.onerror = function () {
        if (idx < thumbs.length - 1) {
          idx += 1;
          this.src = thumbs[idx];
        } else if (this.src !== 'apercu.png') {
          this.src = 'apercu.png';
        }
      };
      img.setAttribute('alt', `Affiche de ${item.title}`);
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
      const info = document.createElement('div');
      info.className = 'card-info';
      info.setAttribute('data-type', item.type || 'film');
      if (typeof item.rating !== 'undefined') info.setAttribute('data-rating', String(item.rating));
      // Media wrapper to overlay badge on the image only
      const media = document.createElement('div');
      media.className = 'card-media';
      // Brand badge overlay (bottom-left of the image)
      const badge = document.createElement('div');
      badge.className = 'brand-badge';
      const logo = document.createElement('img');
      logo.src = 'clipsoustudio.png';
      logo.alt = 'Clipsou Studio';
      logo.setAttribute('loading', 'lazy');
      logo.setAttribute('decoding', 'async');
      badge.appendChild(logo);

      media.appendChild(img);
      media.appendChild(badge);
      a.appendChild(media);
      a.appendChild(info);
      card.appendChild(a);
      return card;
    }

    // Populate Top Rated (sorted by rating desc)
    const topRated = document.querySelector('#top-rated .rail');
    if (topRated) {
      const sorted = items
        .filter(it => typeof it.rating === 'number' && it.rating >= 3.5)
        .sort((a, b) => {
          const ra = (typeof a.rating === 'number') ? a.rating : -Infinity;
          const rb = (typeof b.rating === 'number') ? b.rating : -Infinity;
          if (rb !== ra) return rb - ra;
          return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
        });
      topRated.innerHTML = '';
      sorted.forEach(it => topRated.appendChild(createCard(it)));
    }

    // Group by genre and ensure sections
    const firstPopup = document.querySelector('.fiche-popup');
    const byGenre = new Map();
    items.forEach(it => {
      (it.genres || []).forEach(g => {
        if (!g) return;
        const key = g.trim();
        if (!byGenre.has(key)) byGenre.set(key, []);
        byGenre.get(key).push(it);
      });
    });

    // Emoji mapping for genre headers
    function genreEmoji(name) {
      const g = (name || '').toLowerCase();
      const map = {
        'action': '🔥',
        'comédie': '😂',
        'comedie': '😂',
        'drame': '😢',
        'familial': '👨‍👩‍👧',
        'horreur': '👻',
        'aventure': '🗺️',
        'thriller': '🗡️',
        'fantastique': '✨',
        'western': '🤠',
        'mystère': '🕵️',
        'mystere': '🕵️',
        'ambience': '🌫️',
        'enfants': '🧒',
        'super-héros': '🦸',
        'super heros': '🦸',
        'psychologique': '🧠'
      };
      return map[g] || '🎞️';
    }

    byGenre.forEach((list, genreName) => {
      const id = 'genre-' + slug(genreName);
      // TEMP: Skip 'Mystère' section to avoid duplicates with Backrooms/Karma
      const lowerName = (genreName || '').toLowerCase();
      if (lowerName === 'mystère' || lowerName === 'mystere') {
        const existing = document.getElementById(id);
        if (existing) existing.remove();
        return; // do not build this genre section
      }
      // If only one item for this genre, remove existing section if present and skip creation
      if (!list || list.length <= 1) {
        const existingSection = document.getElementById(id);
        if (existingSection) existingSection.remove();
        return;
      }

      let section = document.getElementById(id);
      if (!section) {
        section = document.createElement('div');
        section.className = 'section';
        section.id = id;
        const h2 = document.createElement('h2');
        h2.textContent = `${genreEmoji(genreName)} ${genreName}`;
        const rail = document.createElement('div');
        rail.className = 'rail';
        section.appendChild(h2);
        section.appendChild(rail);
        if (firstPopup && firstPopup.parentNode) firstPopup.parentNode.insertBefore(section, firstPopup);
        else (document.querySelector('main') || document.body).appendChild(section);
      }

      const rail = section.querySelector('.rail');
      // Ensure existing header has emoji
      const header = section.querySelector('h2');
      if (header) header.textContent = `${genreEmoji(genreName)} ${genreName}`;
      // Sort by rating desc then title, rebuild rail to enforce order
      const sorted = list.slice().sort((a, b) => {
        const ra = (typeof a.rating === 'number') ? a.rating : -Infinity;
        const rb = (typeof b.rating === 'number') ? b.rating : -Infinity;
        if (rb !== ra) return rb - ra;
        return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
      });
      rail.innerHTML = '';
      const seen = new Set();
      sorted.forEach(it => {
        const href = `#${it.id}`;
        if (seen.has(href)) return;
        rail.appendChild(createCard(it));
        seen.add(href);
      });

      // After population, if the section ends up with <= 1 card, remove it
      const cardCount = rail.querySelectorAll('.card').length;
      if (cardCount <= 1) {
        section.remove();
      }
    });

    // Build requested category sections: LEGO, Minecraft, Live-action (always shown when >=1)
    function categoryEmoji(name) {
      const g = (name || '').toLowerCase();
      const map = {
        'lego': '🧱',
        'minecraft': '⛏️',
        'live-action': '🎬'
      };
      return map[g] || '🎞️';
    }

    function buildCategorySection(name, list) {
      const id = 'category-' + slug(name);
      let section = document.getElementById(id);
      if (!section) {
        section = document.createElement('div');
        section.className = 'section';
        section.id = id;
        const h2 = document.createElement('h2');
        h2.textContent = `${categoryEmoji(name)} ${name}`;
        const rail = document.createElement('div');
        rail.className = 'rail';
        section.appendChild(h2);
        section.appendChild(rail);
        if (firstPopup && firstPopup.parentNode) firstPopup.parentNode.insertBefore(section, firstPopup);
        else (document.querySelector('main') || document.body).appendChild(section);
      }
      const rail = section.querySelector('.rail');
      rail.innerHTML = '';
      const seen = new Set();
      list.forEach(it => {
        const href = `#${it.id}`;
        if (seen.has(href)) return;
        rail.appendChild(createCard(it));
        seen.add(href);
      });
    }

    const cats = ['LEGO', 'Minecraft', 'Live-action'];
    const byCat = new Map();
    cats.forEach(c => byCat.set(c, []));
    items.forEach(it => {
      const c = it.category || 'LEGO';
      if (!byCat.has(c)) byCat.set(c, []);
      byCat.get(c).push(it);
    });
    cats.forEach(c => {
      const list = byCat.get(c) || [];
      if (list.length >= 1) buildCategorySection(c, list);
    });

    // Build carousel with 5 random films/séries (exclude trailers)
    (function buildRandomCarousel() {
      const container = document.querySelector('.carousel-container');
      if (!container) return;
      const slidesTrack = container.querySelector('.carousel-slides');
      const indicatorsWrap = container.querySelector('.carousel-indicators');
      if (!slidesTrack || !indicatorsWrap) return;

      // Pool: films + séries only
      const pool = items.filter(it => {
        const t = (it.type || '').toLowerCase();
        return t === 'film' || t === 'série' || t === 'serie';
      });
      if (pool.length === 0) return;

      // Shuffle (Fisher-Yates)
      const arr = pool.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      const chosen = arr.slice(0, Math.min(5, arr.length));

      // Clear existing
      slidesTrack.innerHTML = '';
      indicatorsWrap.innerHTML = '';

      // Build slide DOM for each chosen item
      chosen.forEach((it, idx) => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        // Use an <img> as visual background to allow robust fallbacks
        const bg = document.createElement('img');
        bg.setAttribute('alt', '');
        bg.setAttribute('aria-hidden', 'true');
        bg.decoding = 'async';
        // Prioritize the first slide image for better LCP, keep others lazy
        if (idx === 0) {
          bg.loading = 'eager';
          try { bg.fetchPriority = 'high'; } catch {}
        } else {
          bg.loading = 'lazy';
          try { bg.fetchPriority = 'low'; } catch {}
        }
        Object.assign(bg.style, {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: '0'
        });
        // For Backrooms Urbanos, keep top visible (crop bottom) instead of centering
        if ((it.baseName || '').toLowerCase() === 'bac') {
          bg.style.objectPosition = 'top center';
        }
        const backs = deriveBackgrounds(it.image || '');
        let bIdx = 0;
        bg.src = backs[bIdx] || (it.image || '');
        bg.onerror = function () {
          if (bIdx < backs.length - 1) {
            bIdx += 1;
            this.src = backs[bIdx];
          }
        };

        const content = document.createElement('div');
        content.className = 'carousel-content';

        const h2 = document.createElement('h2');
        h2.className = 'carousel-title';
        h2.textContent = it.title || '';

        const genresWrap = document.createElement('div');
        genresWrap.className = 'carousel-genres';
        // Rating inline with genres like on fiche: ★3/5 or ★3.5/5 (dot, no trailing .0)
        if (typeof it.rating === 'number' && !Number.isNaN(it.rating)) {
          const ratingSpan = document.createElement('span');
          ratingSpan.className = 'carousel-rating';
          const rounded = Math.round(it.rating * 10) / 10; // one decimal
          let txt = rounded.toFixed(1);
          if (txt.endsWith('.0')) txt = String(Math.round(rounded));
          const star = document.createElement('span');
          star.className = 'star';
          star.textContent = '★';
          star.setAttribute('aria-hidden', 'true');
          ratingSpan.appendChild(star);
          ratingSpan.appendChild(document.createTextNode(`${txt}/5`));
          ratingSpan.setAttribute('aria-label', `Note ${txt} sur 5`);
          ratingSpan.setAttribute('data-rating', String(it.rating));
          genresWrap.appendChild(ratingSpan);
        }
        (it.genres || []).slice(0, 3).forEach(g => {
          const tag = document.createElement('span');
          tag.className = 'carousel-genre-tag';
          tag.textContent = g;
          genresWrap.appendChild(tag);
        });

        const p = document.createElement('p');
        p.className = 'carousel-description';
        p.textContent = it.description || '';

        const link = document.createElement('a');
        link.className = 'carousel-btn';
        link.href = `#${it.id}`;
        link.textContent = 'Voir la fiche';

        content.appendChild(h2);
        content.appendChild(genresWrap);
        if (it.description) content.appendChild(p);
        content.appendChild(link);
        slide.appendChild(bg);
        slide.appendChild(content);
        slidesTrack.appendChild(slide);

        // Indicator
        const dot = document.createElement('div');
        dot.className = 'carousel-indicator' + (idx === 0 ? ' active' : '');
        dot.setAttribute('role', 'button');
        dot.setAttribute('tabindex', '0');
        dot.setAttribute('aria-label', `Aller à la diapositive ${idx + 1}`);
        dot.setAttribute('data-index', String(idx));
        if (idx === 0) dot.setAttribute('aria-current', 'true');
        indicatorsWrap.appendChild(dot);
      });

      // After dynamic build, (re)setup the carousel controls
      setupCarousel();
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

    function lockScroll() {
      // memorize current scrollY and lock body
      if (lastScrollY === null) {
        lastScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      }
      // compensate scrollbar width to avoid layout shift
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbar > 0) {
        document.body.style.paddingRight = scrollbar + 'px';
      }
      document.body.style.position = 'fixed';
      document.body.style.top = `-${lastScrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }

    function unlockScroll() {
      const y = lastScrollY || 0;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      // remove scrollbar compensation
      document.body.style.paddingRight = '';
      // restore scroll on the next frame to ensure styles are applied
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, left: 0, behavior: 'auto' });
        lastScrollY = y;
      });
    }

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
      // Lock background scroll immediately, then open via hash
      lockScroll();
      // Defer to allow event loop to finish before changing hash
      setTimeout(() => { window.location.hash = '#' + id; }, 0);
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
    }

    // Handle clicks on any .close-btn (override javascript:history.back())
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.close-btn');
      if (!btn) return;
      e.preventDefault();
      clearHash();
      // Restore scroll and focus if we know where the popup was opened
      unlockScroll();
      if (lastOpener && typeof lastOpener.focus === 'function') {
        lastOpener.focus();
      }
    });

    // Close when clicking the dark overlay outside the popup content
    document.querySelectorAll('.fiche-popup').forEach(popup => {
      popup.addEventListener('click', function (e) {
        if (e.target === popup) {
          clearHash();
          unlockScroll();
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
        unlockScroll();
        if (lastOpener && typeof lastOpener.focus === 'function') {
          lastOpener.focus();
        }
      }
    });

    // If a popup is opened via direct hash or future hash changes, lock scroll
    function maybeLockOnHash() {
      const id = (window.location.hash || '').replace(/^#/, '');
      if (!id) return;
      const target = document.getElementById(id);
      if (target && target.classList && target.classList.contains('fiche-popup')) {
        // Capture current scroll if not captured yet
        if (lastScrollY === null) {
          lastScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
        }
        lockScroll();
      }
    }
    // On load (if landing on a fiche), and on hash changes
    if (window.location.hash) {
      setTimeout(maybeLockOnHash, 0);
    }
    window.addEventListener('hashchange', maybeLockOnHash);
  })();

  // Side menu (hamburger) behavior
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
      // Focus first link for accessibility
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
      // Return focus to the hamburger button
      if (typeof btn.focus === 'function') btn.focus();
    }

    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (expanded) closeMenu(); else openMenu();
    });
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        closeMenu();
      }
    });

    // Handle menu link clicks: center-scroll to in-page sections
    function centerScrollToId(id, updateHash = true) {
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      } catch {
        const rect = el.getBoundingClientRect();
        const targetTop = (window.pageYOffset || document.documentElement.scrollTop || 0)
          + rect.top - (window.innerHeight - rect.height) / 2;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }
      if (updateHash) {
        if (window.history && typeof window.history.replaceState === 'function') {
          window.history.replaceState(null, document.title, '#' + id);
        } else {
          window.location.hash = '#' + id;
        }
      }
    }

    menu.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('#')) {
        e.preventDefault();
        const id = href.replace(/^#/, '');
        closeMenu();
        // Defer a tick to allow menu close animation to start
        setTimeout(() => centerScrollToId(id), 10);
        return;
      }
      // For external links, still close the menu
      closeMenu();
    });

    // Center on existing hash after load
    if (location.hash) {
      const id = location.hash.replace(/^#/, '');
      // Only center for our sections
      if (/^(top-rated|genre-|category-)/.test(id)) {
        setTimeout(() => centerScrollToId(id, false), 0);
      }
    }

    // Center on future hash changes
    window.addEventListener('hashchange', () => {
      const id = location.hash.replace(/^#/, '');
      if (/^(top-rated|genre-|category-)/.test(id)) {
        centerScrollToId(id, false);
      }
    });
  })();
  
});
