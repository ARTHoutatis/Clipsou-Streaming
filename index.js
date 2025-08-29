document.addEventListener('DOMContentLoaded', function () {
  // Ensure lazy/async attrs on all images
  document.querySelectorAll('img').forEach(function (img) {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    if (!img.getAttribute('alt')) img.setAttribute('alt', 'Image – Clipsou Streaming');
  });

  // Carousel indicators: click/keyboard to navigate to a specific slide
  const carousel = document.querySelector('.carousel-container');
  if (carousel) {
    const slidesTrack = carousel.querySelector('.carousel-slides');
    const indicatorsWrap = carousel.querySelector('.carousel-indicators');
    const indicators = carousel.querySelectorAll('.carousel-indicator');

    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    let currentIndex = 0;
    const slideCount = indicators.length || 5;
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

      currentIndex = clamp(index, 0, indicators.length - 1);
      const offsetPercent = currentIndex * 20; // 5 slides => 20% per slide
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
      const next = (currentIndex + 1) % slideCount;
      goToSlide(next);
    }

    function prevSlide() {
      const prev = (currentIndex - 1 + slideCount) % slideCount;
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
    slidesTrack.classList.add('manual');
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
      let type = 'film';
      if (/^serie/i.test(id)) type = 'série';
      else if (/trailer/i.test(title)) type = 'trailer';
      items.push({ id, title, image, genres, rating, type });
    });

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

  // removed scroll buttons logic
});
