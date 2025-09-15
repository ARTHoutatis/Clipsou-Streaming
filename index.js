    // --- Shared small helpers (scoped) ---
    function getVid2Ep(){
      // Memoize on window so we don't recreate it
      if (window.__VID2EP) return window.__VID2EP;
      const map = {
        // Lawless Legend
        'I21K4Ksf_4A': 1,
        'jfbOQ7kWKw0': 2,
        'JCW8qyJCqbA': 3,
        // Alex
        'Uynd10bGS6I': 1,
        'QfTsODE-HIU': 2,
        'up7Q2jBlSOo': 3,
        'DmUG8oVmzMk': 4,
        'JzPlADBeDto': 5,
        'Jm-Mwy6733Y': 6,
        'RYM7vH96y1I': 7,
        'yMYoD9I1xs0': 8,
        'IQXjgoYKyYU': 9,
        // Les Aventures de Jean‑Michel Content
        'OgLRqt_iRkI': 1,
        'Sa_3VceEqaI': 2
      };
      try { window.__VID2EP = map; } catch {}
      return map;
    }
    function applyCwCacheBuster(src){
      if (!src) return 'apercu.webp';
      if (/^(data:|https?:)/i.test(src)) return src;
      const v = (window.__cw_ver || (window.__cw_ver = Date.now())) + '';
      return src + (src.includes('?') ? '&' : '?') + 'cw=' + v;
    }
    function deriveExts(src){
      const m = (src||'').match(/^(.*?)(\d+)?\.(jpg|jpeg|png|webp)$/i);
      if (!m) return [];
      const base = m[1]; const ext = (m[3]||'').toLowerCase();
      const order = ext === 'webp' ? ['webp','jpg','jpeg','png'] : ['jpg','jpeg','png'];
      return order.map(e => base + '.' + e);
    }
    function prependLandscapeVariants(list, src){
      const m = (src||'').match(/^(.*?)(\.(?:jpg|jpeg|png|webp))$/i);
      if (!m) return;
      const base = m[1];
      ['webp','jpg','jpeg','png'].slice().reverse().forEach(e => { list.unshift(base + '1.' + e); });
    }
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
  // ===== Preserve scroll position when opening/closing popups =====
  // ===== Preserve scroll position when opening/closing popups =====
  (function setupPopupScrollKeeper(){
    let lastPopupScrollY = null;
    let lastWasAtBottom = false;
    function lockBodyAt(y){
      try {
        const b = document.body; const de = document.documentElement;
        b.classList.add('popup-open'); de.classList.add('popup-open');
        // Lock body visually at the opening position
        b.style.position = 'fixed';
        b.style.top = (-y) + 'px';
        b.style.left = '0';
        b.style.right = '0';
        b.style.width = '100%';
        // Compensate for scrollbar to avoid horizontal layout shift
        const sw = (window.innerWidth || 0) - (de.clientWidth || 0);
        if (sw > 0) { b.style.paddingRight = sw + 'px'; }
        // Keep scrollbar space reserved to avoid reflow that can nudge bottom position
        try { de.style.overflowY = 'scroll'; } catch {}
        // Hard-lock window scroll to eliminate any tiny jumps
        try {
          if (window.__lockScrollHandler) window.removeEventListener('scroll', window.__lockScrollHandler, { capture: true });
        } catch {}
        window.__lockScrollY = y;
        window.__lockScrollHandler = function(){
          try {
            const targetY = window.__lockScrollY || 0;
            const curY = window.pageYOffset || document.documentElement.scrollTop || 0;
            if (curY !== targetY) { window.scrollTo(0, targetY); }
          } catch {}
        };
        try { window.addEventListener('scroll', window.__lockScrollHandler, { passive: true, capture: true }); } catch { window.addEventListener('scroll', window.__lockScrollHandler, true); }
        // Also force scrollBehavior to auto to avoid any smooth scroll artifacts
        try { de.style.scrollBehavior = 'auto'; b.style.scrollBehavior = 'auto'; } catch {}
      } catch {}
    }

  // ===== Continue Watching Section =====
  (function buildContinueWatching(){
    try {
      const wrap = document.querySelector('#continue-watching');
      const rail = wrap ? wrap.querySelector('.rail') : null;
      if (!wrap || !rail) return;

      function readProgress(){
        try {
          const raw = localStorage.getItem('clipsou_watch_progress_v1');
          const arr = raw ? JSON.parse(raw) : [];
          if (Array.isArray(arr)) return arr;
        } catch {}
        return [];
      }
      function saveProgressList(list){
        try { localStorage.setItem('clipsou_watch_progress_v1', JSON.stringify(list||[])); } catch {}
      }
      // Cleanup any fully-watched or invalid entries
      let items = readProgress()
        .filter(it => it && it.id && typeof it.percent === 'number' && it.percent > 0 && it.percent < 0.99)
        .sort((a,b)=> (b.updatedAt||0) - (a.updatedAt||0));

      // Deduplicate by id (keep latest)
      const seen = new Set();
      items = items.filter(it => { if (seen.has(it.id)) return false; seen.add(it.id); return true; });

      // Remove legacy non-episode entries when per-episode ones exist for the same base id
      (function dropLegacyIfCompositeExists(){
        try {
          const baseHasComposite = new Map(); // base -> boolean
          for (const it of items) {
            if (!it || !it.id) continue;
            const base = String(it.id).split('::')[0];
            if (String(it.id).includes('::')) baseHasComposite.set(base, true);
            if (!baseHasComposite.has(base)) baseHasComposite.set(base, false);
          }
          items = items.filter(it => {
            const id = String(it.id||'');
            const base = id.split('::')[0];
            const hasComposite = !!baseHasComposite.get(base);
            // If there is at least one composite for this base, drop the plain id entry
            if (hasComposite && !id.includes('::')) return false;
            return true;
          });
        } catch {}
      })();

      // Episode enrichment: map known video IDs to episode numbers
      (function enrichEpisodes(){
        try {
          const VID2EP = getVid2Ep();
          for (const it of items) {
            if (!it) continue;
            if (it.episode !== undefined && it.episode !== null && it.episode !== '' && it.episode !== 0) continue;
            const m = String(it.id||'').match(/::([\w-]{6,})$/);
            const vid = m ? m[1] : '';
            if (vid && VID2EP[vid]) it.episode = VID2EP[vid];
          }
        } catch {}
      })();

      // If nothing to show, hide the section
      if (!items.length) { wrap.style.display = 'none'; return; }

      wrap.style.display = '';
      rail.innerHTML = '';

      // Helper: build card
      function createCard(it){
        const card = document.createElement('div');
        card.className = 'card';
        const a = document.createElement('a');
        const baseId = String(it.id || '').split('::')[0];
        a.href = `fiche.html?id=${encodeURIComponent(baseId)}&from=continue`;
        const media = document.createElement('div');
        media.className = 'card-media';
        try { media.style.aspectRatio = '16 / 9'; } catch {}
        // Image candidates: stored image -> derived extensions -> fallback
        const img = document.createElement('img');
        const applySrc = applyCwCacheBuster;
        const candidates = [];
        // Deterministic overrides from portrait base to landscape file present in repo
        const landscapeOverrides = {
          'al': 'Al1.webp',
          'ba': 'Ba1.webp',
          'bac': 'Bac1.webp',
          'dé': 'Dé1.webp',
          'ja': 'Ja1.webp',
          'je': 'Je1.webp',
          'ka': 'Ka1.webp',
          'la': 'La1.webp',
          'law': 'Law1.webp',
          'ur': 'Ur1.webp'
        };
        const getBaseKey = (p)=>{
          try {
            const name = (p||'').split('/').pop().split('\\').pop();
            const base = name.replace(/\.(jpg|jpeg|png|webp)$/i,'');
            const letters = base.replace(/[^A-Za-zÀ-ÿ]/g,'');
            const lower = letters.toLowerCase();
            // test longest keys first
            const keys = Object.keys(landscapeOverrides).sort((a,b)=>b.length-a.length);
            for (const k of keys) { if (lower.startsWith(k)) return k; }
          } catch {}
          return null;
        };
        // If we can determine a known base, force its override file first
        try {
          const key = getBaseKey(it.image || it.title || '');
          if (key && landscapeOverrides[key]) {
            candidates.unshift(landscapeOverrides[key]);
          }
        } catch {}
        const addDerived = (src)=>{ deriveExts(src).forEach(s=>candidates.push(s)); };
        const addLandscapeVariant = (src)=>{ prependLandscapeVariants(candidates, src); };
        // Prefer landscape first for Continue Watching
        if (it.landscapeImage) addDerived(it.landscapeImage);
        if (it.image) {
          // Generate a potential landscape variant from the portrait filename
          addLandscapeVariant(it.image);
          addDerived(it.image);
        }
        if (it.landscapeImage) candidates.push(it.landscapeImage);
        if (it.image) candidates.push(it.image);
        // Force try '<base>1.webp' exactly first (e.g., 'Dé1.webp')
        let preferred = null;
        try {
          if (it && it.image && /\.(jpg|jpeg|png|webp)$/i.test(it.image)) {
            preferred = it.image.replace(/\.(jpg|jpeg|png|webp)$/i, '1.webp');
          }
        } catch {}
        if (preferred) candidates.unshift(preferred);
        let cIdx = 0;
        img.src = applySrc(candidates[cIdx]) || applySrc(it.image) || 'apercu.webp';
        img.onerror = function(){ cIdx++; if (cIdx < candidates.length) this.src = applySrc(candidates[cIdx]); else { this.onerror=null; this.src='apercu.webp'; } };
        img.alt = 'Affiche de ' + (it.title || 'contenu');
        img.loading = 'lazy'; img.decoding = 'async';
        media.appendChild(img);
        a.appendChild(media);

        // Progress bar
        const prog = document.createElement('div'); prog.className = 'progress';
        const bar = document.createElement('div'); bar.className = 'bar';
        const pct = Math.max(0, Math.min(99, Math.round((it.percent||0)*100)));
        bar.style.width = pct + '%';
        prog.appendChild(bar);
        card.appendChild(a);
        card.appendChild(prog);

        // No bottom info bar for continue watching cards

        // Remaining time caption outside the card (precise M:SS)
        const total = Math.max(0, Math.round(it.duration || 0));
        const watched = Math.max(0, Math.round(it.seconds || 0));
        const remainingSec = Math.max(0, total - watched);
        // Create wrapper to place text under the card
        const wrapper = document.createElement('div');
        wrapper.className = 'resume-item';
        wrapper.appendChild(card);
        if (remainingSec > 0) {
          const m = Math.floor(remainingSec / 60);
          const s = String(remainingSec % 60).padStart(2, '0');
          const caption = document.createElement('div');
          caption.className = 'resume-remaining';
          caption.textContent = `${m}:${s} restant`;
          wrapper.appendChild(caption);
        }
        // Title below time remaining
        const title = document.createElement('div');
        title.className = 'resume-title';
        const t = it.title || '';
        // Use only saved 'episode' field from progress entries to avoid mis-detection
        let epNum = null;
        const epRaw = (it.episode !== undefined && it.episode !== null && it.episode !== '') ? it.episode : null;
        if (epRaw != null) {
          const n = parseInt(epRaw, 10);
          if (!Number.isNaN(n)) epNum = n;
        }
        title.textContent = epNum != null ? `${t} - ep${epNum}` : t;
        wrapper.appendChild(title);

        return wrapper;
      }

      items.slice(0, 20).forEach(it => { rail.appendChild(createCard(it)); });

      // Keep list trimmed in storage to avoid growth
      try {
        const trimmed = items.slice(0, 50);
        saveProgressList(trimmed);
      } catch {}
    } catch {}
  })();

    // Removed global scroll blocking: popup content should be scrollable immediately

    // Maintain scroll for a short duration via RAF to completely cancel micro-jumps
    function maintainScroll(y, durationMs){
      const de = document.documentElement;
      const body = document.body;
      const endAt = Date.now() + Math.max(0, durationMs||0);
      function step(){
        try {
          const curY = window.pageYOffset || de.scrollTop || body.scrollTop || 0;
          if (curY !== y) {
            // Force on all three to counter engine differences
            try { de.scrollTop = y; } catch {}
            try { body.scrollTop = y; } catch {}
            try { window.scrollTo(0, y); } catch {}
          }
        } catch {}
        if (Date.now() < endAt) requestAnimationFrame(step);
      }
      try { requestAnimationFrame(step); } catch { setTimeout(step, 0); }
    }
    function unlockBody(){
      try {
        const b = document.body; const de = document.documentElement;
        b.classList.remove('popup-open'); de.classList.remove('popup-open');
        b.style.position = '';
        b.style.top = '';
        b.style.left = '';
        b.style.right = '';
        b.style.width = '';
        b.style.paddingRight = '';
        try { de.style.overflowY = ''; } catch {}
        // Remove hard scroll lock
        try { if (window.__lockScrollHandler) window.removeEventListener('scroll', window.__lockScrollHandler, { capture: true }); } catch {}
        try { window.__lockScrollHandler = null; delete window.__lockScrollHandler; } catch {}
        try { delete window.__lockScrollY; } catch {}
        try { de.style.scrollBehavior = ''; b.style.scrollBehavior = ''; } catch {}
      } catch {}
    }
    function isPopupTargeted(){
      try {
        const hash = location.hash || '';
        if (!hash || hash.length < 2) return false;
        const el = document.querySelector(hash);
        return !!(el && el.classList && el.classList.contains('fiche-popup'));
      } catch { return false; }
    }
    function applyBodyPopupState(open){
      try {
        document.body.classList.toggle('popup-open', !!open);
        document.documentElement.classList.toggle('popup-open', !!open);
      } catch {}
    }
    function getDocHeights(){
      try {
        const de = document.documentElement;
        const body = document.body;
        const scrollHeight = Math.max(
          body.scrollHeight, de.scrollHeight,
          body.offsetHeight, de.offsetHeight,
          body.clientHeight, de.clientHeight
        );
        const viewport = window.innerHeight || de.clientHeight || 0;
        return { scrollHeight, viewport };
      } catch { return { scrollHeight: 0, viewport: 0 }; }
    }

    // Shared: start and end of popup freeze lifecycle
    function beginPopupFreeze(){
      try {
        const y = window.pageYOffset || document.documentElement.scrollTop || 0;
        lastPopupScrollY = y;
        const { scrollHeight, viewport } = getDocHeights();
        lastWasAtBottom = (y + viewport >= scrollHeight - 2);
        applyBodyPopupState(true);
        lockBodyAt(y);
        // Avoid focus-induced scrolling (e.g., buttons inside popup gaining focus)
        try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch {}
        // Grace to avoid incidental drawer close
        try { window.__suppressDrawerCloseUntil = Date.now() + 3000; } catch {}
        // Maintain background position, but do NOT block inputs so popup can scroll immediately
        maintainScroll(y, 400);
      } catch {}
    }

    function endPopupFreeze(){
      if (lastPopupScrollY == null) { try { applyBodyPopupState(false); } catch {}; return; }
      // Immediately protect the drawer from auto-close during the entire closing sequence
      try { window.__protectDrawerForever = true; } catch {}
      // Restore after a tick to let layout settle
      const y = lastPopupScrollY; const wasBottom = lastWasAtBottom; lastPopupScrollY = null; lastWasAtBottom = false;
      // Suppress drawer auto-close while restoring position and for a generous grace period
      try { window.__suppressDrawerCloseUntil = Date.now() + 5000; } catch {}
      const doRestore = () => {
        try {
          // Unlock body before restoring scroll so the page can move back
          unlockBody();
          if (wasBottom) {
            const { scrollHeight, viewport } = getDocHeights();
            const bottomY = Math.max(0, scrollHeight - viewport);
            window.scrollTo({ top: bottomY, left: 0, behavior: 'auto' });
            maintainScroll(bottomY, 220);
          } else {
            window.scrollTo({ top: y, left: 0, behavior: 'auto' });
            maintainScroll(y, 220);
          }
        } catch {
          unlockBody();
          if (wasBottom) {
            const { scrollHeight, viewport } = getDocHeights();
            const bottomY = Math.max(0, scrollHeight - viewport);
            window.scrollTo(0, bottomY);
            maintainScroll(bottomY, 220);
          } else {
            window.scrollTo(0, y);
            maintainScroll(y, 220);
          }
        }
      };
      // Mark recent popup close to protect the drawer from auto-close on restoration scroll
      try { window.__recentPopupClosedTs = Date.now(); } catch {}
      // Run twice to counter any late layout shifts (images/fonts)
      try { setTimeout(doRestore, 0); } catch { doRestore(); }
      try { setTimeout(doRestore, 120); } catch {}
      // Only clear popup-open class after restoration has completed
      try { setTimeout(() => applyBodyPopupState(false), 180); } catch {}
    }
    function onHashChanged(){
      try {
        const open = isPopupTargeted();
        if (open) {
          if (lastPopupScrollY == null) beginPopupFreeze();
          // Counter any initial anchor jump caused by :target
          try { setTimeout(()=>{ const y = lastPopupScrollY || 0; window.scrollTo({ top: y, left: 0, behavior: 'auto' }); maintainScroll(y, 220); }, 0); } catch {}
        } else {
          endPopupFreeze();
        }
      } catch {}
    }
    // Intercept clicks on popup links to lock background before the browser attempts to scroll
    try {
      document.addEventListener('click', function(e){
        try {
          const a = e.target && (e.target.closest ? e.target.closest('a[href^="#"]') : null);
          if (!a) return;
          const href = a.getAttribute('href') || '';
          if (!href || href.length < 2) return;
          const target = document.querySelector(href);
          if (!target || !target.classList || !target.classList.contains('fiche-popup')) return;
          // It's a popup link: prevent default navigation scroll, lock body immediately, then set hash
          e.preventDefault();
          beginPopupFreeze();
          // Now set the hash to actually target/open the popup without causing a jump
          if ((location.hash || '') !== href) {
            location.hash = href;
          } else {
            // If already same hash, manually trigger handler
            onHashChanged();
          }
        } catch {}
      }, true);
    } catch {}

    // Initialize and listen
    onHashChanged();
    window.addEventListener('hashchange', onHashChanged, { passive: true });
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
      // Allow scrolling; if user scrolls, close the drawer to let them continue
      try { installCloseOnScroll(); } catch {}
      try { document.body.classList.add('drawer-open'); document.documentElement.classList.add('drawer-open'); } catch {}
      try { btn.setAttribute('aria-expanded','true'); } catch {}
    }
    // Core close implementation
    function reallyClose(){
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      drawer.setAttribute('aria-hidden','true');
      overlay.setAttribute('aria-hidden','true');
      // Remove close-on-scroll listeners
      try { removeCloseOnScroll(); } catch {}
      try { document.body.classList.remove('drawer-open'); document.documentElement.classList.remove('drawer-open'); } catch {}
      try { btn.setAttribute('aria-expanded','false'); } catch {}
      try { window.__protectDrawerForever = false; } catch {}
    }
    // Guarded close to ignore incidental closes right after popup close
    function close(){
      try {
        if (window.__protectDrawerForever) return;
      } catch {}
      reallyClose();
    }
    btn.addEventListener('click', () => {
      if (drawer.classList.contains('open')) { reallyClose(); return; }
      try { buildDrawerLinks(); } catch {}
      open();
    });
    // Overlay and close button should force-close, bypassing protection window
    overlay.addEventListener('click', reallyClose);
    if (closeBtn) closeBtn.addEventListener('click', reallyClose);
    document.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape') {
        try {
          const popupOpen = !!document.querySelector('.fiche-popup:target') || document.body.classList.contains('popup-open');
          if (popupOpen) return; // don't close drawer while popup is open
          // If protection is active (after popup close), ignore Escape for auto-close
          if (window.__protectDrawerForever) return;
        } catch {}
        reallyClose();
      }
    });

    // Smooth scroll for drawer links (center target section in viewport)
    function enableLink(link){
      link.addEventListener('click', (e)=>{
        const href = link.getAttribute('href')||'';
        if (href.startsWith('#')) {
          // If the target is a popup, do not intercept so :target opens it
          try {
            const target = document.querySelector(href);
            if (target && target.classList && target.classList.contains('fiche-popup')) {
              // Let default hash navigation happen to open popup
              return;
            }
          } catch {}
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

    // Close drawer when user scrolls via scrollbar drag (not with wheel/touch/keys)
    let removeCloseOnScroll = () => {};
    function installCloseOnScroll(){
      try { removeCloseOnScroll(); } catch {}
      let lastWheelTs = 0;
      let lastTouchTs = 0;
      let lastKeyTs = 0;
      let lastHashTs = 0;
      const SUPPRESS_MS = 250; // ignore scrolls right after wheel/touch/keys
      const SUPPRESS_HASH_MS = 1500; // ignore scrolls right after hash (popup open/close)
      const scrollKeys = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' ']);
      // Block background wheel/touch scroll while drawer is open, but allow inside the drawer and inside popups
      const isInsideDrawer = (node) => {
        try {
          if (!drawer) return false;
          if (node === drawer) return true;
          if (node && node.closest) return !!node.closest('#app-drawer');
        } catch {}
        return false;
      };
      const isInsidePopup = (node) => {
        try {
          if (!node) return false;
          if (node.classList && node.classList.contains('fiche-popup')) return true;
          if (node.closest) return !!node.closest('.fiche-popup');
        } catch {}
        return false;
      };
      function findScrollableAncestor(start) {
        let el = start instanceof Element ? start : null;
        while (el && el !== document.body && el !== document.documentElement) {
          const style = getComputedStyle(el);
          const canScrollY = /(auto|scroll)/.test(style.overflowY);
          if (canScrollY && el.scrollHeight > el.clientHeight + 1) return el;
          el = el.parentElement;
        }
        return null;
      }
      function shouldPreventFor(el, deltaY) {
        // If no scrollable container, prevent to avoid background scroll
        if (!el) return true;
        const atTop = el.scrollTop <= 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if (deltaY < 0 && atTop) return true;    // scrolling up at top
        if (deltaY > 0 && atBottom) return true; // scrolling down at bottom
        return false; // allow native scroll within
      }
      const onWheel = (e) => {
        lastWheelTs = Date.now();
        try {
          if (isInsideDrawer(e.target) || isInsidePopup(e.target)) {
            const deltaY = (/** @type {WheelEvent} */(e)).deltaY || 0;
            const scrollBox = findScrollableAncestor(/** @type {Element} */(e.target));
            // Mark that the last scroll action originated from a popup to avoid drawer auto-close
            try { if (isInsidePopup(e.target)) window.__lastPopupScrollTs = Date.now(); } catch {}
            if (shouldPreventFor(scrollBox, deltaY)) { e.preventDefault(); e.stopPropagation(); }
            return;
          }
          // Outside drawer: block background scroll
          e.preventDefault(); e.stopPropagation();
        } catch {}
      };
      const onTouchMove = (e) => {
        lastTouchTs = Date.now();
        try {
          if (isInsideDrawer(e.target) || isInsidePopup(e.target)) {
            // For touch, approximate: if the list can scroll, allow; otherwise block
            const scrollBox = findScrollableAncestor(/** @type {Element} */(e.target));
            // Mark popup-originated touch scrolls
            try { if (isInsidePopup(e.target)) window.__lastPopupScrollTs = Date.now(); } catch {}
            if (shouldPreventFor(scrollBox, 0)) { e.preventDefault(); e.stopPropagation(); }
            return;
          }
          e.preventDefault(); e.stopPropagation();
        } catch {}
      };
      const onKeyDown = (e) => { if (scrollKeys.has(e.key)) lastKeyTs = Date.now(); };
      const onScroll = () => {
        const now = Date.now();
        // If a popup is currently open, never auto-close the drawer on scroll
        try {
          const popupOpen = !!document.querySelector('.fiche-popup:target') || document.body.classList.contains('popup-open');
          if (popupOpen) return;
        } catch {}
        // If the drawer is open, and protection is active, ignore scroll-based auto-close indefinitely
        try {
          const drawerIsOpen = document.body.classList.contains('drawer-open');
          if (drawerIsOpen && window.__protectDrawerForever) return;
        } catch {}
        // If we're within a grace period after popup open/close, do not close the drawer
        try {
          const until = window.__suppressDrawerCloseUntil || 0;
          if (until && now <= until) return;
        } catch {}
        // If a recent scroll originated from a popup, do not close the drawer either
        try {
          const lastPopupScrollTs = window.__lastPopupScrollTs || 0;
          if (lastPopupScrollTs && (now - lastPopupScrollTs) <= 600) return;
        } catch {}
        // Suppress immediately after hash changes (popup open/close may adjust layout)
        if ((now - lastHashTs) <= SUPPRESS_HASH_MS) return;
        if ((now - lastWheelTs) <= SUPPRESS_MS) return;
        if ((now - lastTouchTs) <= SUPPRESS_MS) return;
        if ((now - lastKeyTs) <= SUPPRESS_MS) return;
        // New behavior: do not alter page scroll position; simply close the drawer if user scrolls the page
        try { close(); } catch {}
      };
      const onHash = () => { lastHashTs = Date.now(); };
      window.addEventListener('wheel', onWheel, { passive: false, capture: true });
      window.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
      window.addEventListener('keydown', onKeyDown, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true, capture: true });
      window.addEventListener('hashchange', onHash, { passive: true });
      removeCloseOnScroll = () => {
        window.removeEventListener('wheel', onWheel, { capture: true });
        window.removeEventListener('touchmove', onTouchMove, { capture: true });
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('scroll', onScroll, { capture: true });
        window.removeEventListener('hashchange', onHash);
        removeCloseOnScroll = () => {};
      };
    }

    // Build section links dynamically (Top Rated + all genre sections built later)
    function buildDrawerLinks(){
      const list = document.getElementById('drawer-sections');
      if (!list) return;
      // Keep all fixed entries (e.g., Mieux notés, Ajouter son film)
      const fixedItems = Array.from(list.querySelectorAll('li[data-fixed="1"]'));
      list.innerHTML = '';
      fixedItems.forEach(li => list.appendChild(li));

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

      // Ensure all anchors (including fixed ones) have handlers
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
            items.push({ id: c.id, title: c.title, image: landscapeImage || portraitImage || 'apercu.webp', portraitImage, landscapeImage, genres: Array.isArray(c.genres) ? c.genres.filter(Boolean) : [], rating, type, category: c.category || 'LEGO', description: c.description || '', baseName, watchUrl: c.watchUrl || '', studioBadge: c.studioBadge || '' });
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
              items.push({ id: c.id, title: c.title, image: landscapeImage || portraitImage || 'apercu.webp', portraitImage, landscapeImage, genres: Array.isArray(c.genres) ? c.genres.filter(Boolean) : [], rating, type, category: c.category || 'LEGO', description: c.description || '', baseName, watchUrl: c.watchUrl || '', studioBadge: c.studioBadge || '' });
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
        const candidates = [base + '.webp', base + '.jpg', base + '.jpeg', base + '.' + originalExt];
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
        const withOne = [base + '1.webp', base + '1.jpg', base + '1.jpeg'];
        const withoutOne = [base + '.webp', base + '.jpg', base + '.jpeg', base + '.' + originalExt];
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
      let idx = 0; img.src = (thumbs && thumbs[0]) || item.image || 'apercu.webp';
      img.onerror = function () { if (idx < thumbs.length - 1) { idx += 1; this.src = thumbs[idx]; } else if (this.src !== 'apercu.webp') { this.src = 'apercu.webp'; } };
      img.setAttribute('alt', `Affiche de ${item.title}`);
      img.setAttribute('loading', 'lazy'); img.setAttribute('decoding', 'async');
      const info = document.createElement('div'); info.className = 'card-info'; info.setAttribute('data-type', item.type || 'film'); if (typeof item.rating !== 'undefined') info.setAttribute('data-rating', String(item.rating)); if (item.studioBadge) info.setAttribute('data-studio-badge', String(item.studioBadge));
      const media = document.createElement('div'); media.className = 'card-media';
      const badge = document.createElement('div'); badge.className = 'brand-badge'; const logo = document.createElement('img'); logo.src = (item.studioBadge && String(item.studioBadge).trim()) || 'clipsoustudio.webp'; logo.alt = 'Studio'; logo.setAttribute('loading', 'lazy'); logo.setAttribute('decoding', 'async'); badge.appendChild(logo);
      media.appendChild(img); media.appendChild(badge); a.appendChild(media); a.appendChild(info); card.appendChild(a); return card;
    }

    // Populate Top Rated (sorted by rating desc)
    const topRated = document.querySelector('#top-rated .rail');
    if (topRated) {
      const sorted = items.filter(it => typeof it.rating === 'number' && it.rating >= 3.5)
        .sort((a, b) => { const ra = (typeof a.rating === 'number') ? a.rating : -Infinity; const rb = (typeof b.rating === 'number') ? b.rating : -Infinity; if (rb !== ra) return rb - ra; return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' }); });
      topRated.innerHTML = ''; sorted.forEach(it => topRated.appendChild(createCard(it)));
    }

    // Build a dedicated "Séries" section
    (function buildSeriesSection(){
      try {
        const seriesItems = items.filter(it => {
          const t = (it.type || '').toLowerCase();
          return t === 'série' || t === 'serie';
        });
        const firstPopup = document.querySelector('.fiche-popup');
        const id = 'series';
        let section = document.getElementById(id);
        if (!seriesItems || seriesItems.length <= 0) {
          if (section) section.remove();
          return;
        }
        if (!section) {
          section = document.createElement('div');
          section.className = 'section';
          section.id = id;
          const h2 = document.createElement('h2');
          h2.textContent = '📺 Séries';
          const rail = document.createElement('div');
          rail.className = 'rail';
          section.appendChild(h2);
          section.appendChild(rail);
          if (firstPopup && firstPopup.parentNode) firstPopup.parentNode.insertBefore(section, firstPopup);
          else (document.querySelector('main') || document.body).appendChild(section);
        }
        const rail = section.querySelector('.rail');
        rail.innerHTML = '';
        const sorted = seriesItems.slice().sort((a, b) => {
          const ra = (typeof a.rating === 'number') ? a.rating : -Infinity;
          const rb = (typeof b.rating === 'number') ? b.rating : -Infinity;
          if (rb !== ra) return rb - ra; // higher ratings first
          const ta = (a.title || '');
          const tb = (b.title || '');
          return ta.localeCompare(tb, 'fr', { sensitivity: 'base' });
        });
        sorted.forEach(it => rail.appendChild(createCard(it)));
      } catch {}
    })();

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
    const prettyGenre = (name) => PRETTY_MAP[normalizeGenre(name).replace(/\s+/g,'-')] || capitalize(name);

    function capitalize(name) {
      const n = (name||'').trim();
      return n.charAt(0).toUpperCase() + n.slice(1);
    }

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
      document.querySelectorAll('.section, #continue-watching').forEach(section => {
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
      let badge = media.querySelector('.brand-badge');
      if (!badge) { badge = document.createElement('div'); badge.className = 'brand-badge'; const logo = document.createElement('img'); logo.setAttribute('loading', 'lazy'); logo.setAttribute('decoding', 'async'); badge.appendChild(logo); media.appendChild(badge); }
      const logo = badge.querySelector('img');
      // Determine preferred badge URL from data-studio-badge if present
      let desired = '';
      try {
        const info = a.querySelector('.card-info');
        desired = (info && info.getAttribute('data-studio-badge')) || '';
      } catch {}
      if (!desired) desired = 'clipsoustudio.webp';
      if (logo && logo.src !== desired) { logo.src = desired; logo.alt = 'Studio'; }
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
  
  // On-site player: play intro.mp4 then embed the YouTube video in a full-screen overlay
  (function installOnsitePlayer(){
    try {
      if (window.__introHookInstalled) return; // idempotent
      window.__introHookInstalled = true;

      function isYouTubeUrl(href){
        try {
          if (!href) return false;
          if (/^javascript:/i.test(href)) return false;
          // Accept both absolute and protocol-relative
          const url = href.startsWith('http') ? new URL(href) : new URL(href, location.href);
          const h = (url.hostname || '').toLowerCase();
          return (
            h.includes('youtube.com') ||
            h.includes('youtu.be')
          );
        } catch { return false; }
      }

      // ============== Mobile fullscreen + zoom lock helpers ==============
      // Temporarily disable pinch-zoom and double-tap zoom while player is open.
      let __playerZoomCleanup = null;
      function lockNoZoom(enable){
        try {
          if (!enable) {
            if (typeof __playerZoomCleanup === 'function') { __playerZoomCleanup(); __playerZoomCleanup = null; }
            return;
          }
          // If already installed, do nothing
          if (typeof __playerZoomCleanup === 'function') return;

          const meta = document.querySelector('meta[name="viewport"]');
          const original = meta ? meta.getAttribute('content') : '';

          // Apply strict viewport
          if (meta) {
            const content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
            try { meta.setAttribute('content', content); } catch {}
          }

          // Intercept pinch and double-tap zoom
          const onGesture = (e) => { try { e.preventDefault(); } catch {} };
          const onWheel = (e) => { try { if (e.ctrlKey) e.preventDefault(); } catch {} };
          let lastTouchEnd = 0;
          const onTouchEnd = (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 350) { try { e.preventDefault(); } catch {} }
            lastTouchEnd = now;
          };
          window.addEventListener('gesturestart', onGesture, { passive: false });
          window.addEventListener('gesturechange', onGesture, { passive: false });
          window.addEventListener('gestureend', onGesture, { passive: false });
          window.addEventListener('wheel', onWheel, { passive: false });
          window.addEventListener('touchend', onTouchEnd, { passive: false });

          __playerZoomCleanup = function(){
            try { window.removeEventListener('gesturestart', onGesture); } catch {}
            try { window.removeEventListener('gesturechange', onGesture); } catch {}
            try { window.removeEventListener('gestureend', onGesture); } catch {}
            try { window.removeEventListener('wheel', onWheel); } catch {}
            try { window.removeEventListener('touchend', onTouchEnd); } catch {}
            if (meta) { try { meta.setAttribute('content', original || 'width=device-width, initial-scale=1, viewport-fit=cover'); } catch {} }
          };
        } catch {}
      }

      async function tryEnterFullscreen(el){
        if (!el) return false;
        try {
          if (el.requestFullscreen) { await el.requestFullscreen(); return true; }
        } catch {}
        // iOS Safari special cases
        try { if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); return true; } } catch {}
        try { if (el.webkitEnterFullscreen) { el.webkitEnterFullscreen(); return true; } } catch {}
        return false;
      }

      function ensurePlayerOverlay(){
        let overlay = document.querySelector('.player-overlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.className = 'player-overlay';
        const shell = document.createElement('div');
        shell.className = 'player-shell';
        const top = document.createElement('div');
        top.className = 'player-topbar';
        const titleEl = document.createElement('h4');
        titleEl.className = 'player-title';
        titleEl.textContent = 'Lecture';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'player-close';
        closeBtn.setAttribute('aria-label','Fermer le lecteur');
        closeBtn.textContent = '✕';
        top.appendChild(titleEl);
        top.appendChild(closeBtn);
        const stage = document.createElement('div');
        stage.className = 'player-stage';
        const footer = document.createElement('div');
        footer.className = 'player-footer';
        footer.textContent = 'Appuyez sur Échap ou ✕ pour fermer.';
        shell.appendChild(top);
        shell.appendChild(stage);
        shell.appendChild(footer);
        overlay.appendChild(shell);
        document.body.appendChild(overlay);
        // Close behavior
        const close = ()=>{
          try { if (typeof overlay.__activeCleanup === 'function') overlay.__activeCleanup(); } catch {}
          try { document.body.classList.remove('player-open'); document.documentElement.classList.remove('player-open'); } catch {}
          // Exit fullscreen where supported
          try {
            if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
          } catch {}
          // Restore zoom behavior
          try { lockNoZoom(false); } catch {}
          overlay.classList.remove('open');
          // stop any media
          try { stage.querySelectorAll('video').forEach(v=>{ try { v.pause(); } catch{} }); } catch{}
          try { stage.querySelectorAll('iframe').forEach(f=>{ f.src = 'about:blank'; }); } catch{}
          stage.innerHTML = '';
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
          const autoplay = '1';
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
        return href; // fallback
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
        // Immediately lock zoom on mobile and try to enter fullscreen on the overlay
        try { lockNoZoom(true); } catch {}
        try { if (window.innerWidth <= 1024) { tryEnterFullscreen(overlay); } } catch {}

        // Clear stage and show intro video first
        stage.innerHTML = '';
        const intro = document.createElement('video');
        intro.src = 'intro.mp4';
        intro.autoplay = true;
        intro.playsInline = true;
        intro.controls = false;
        intro.preload = 'auto';
        try { intro.muted = false; intro.defaultMuted = false; intro.volume = 1.0; } catch {}
        Object.assign(intro.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
        const skip = document.createElement('button');
        skip.textContent = 'Passer l\'intro';
        skip.className = 'button';
        Object.assign(skip.style, { position: 'absolute', right: '12px', bottom: '12px', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', opacity: '0.9', zIndex: 2 });

        let started = false;
        let cleaned = false;
        function cleanupActive(){
          if (cleaned) return; cleaned = true;
          try { clearTimeout(watchdog); } catch {}
          try { intro.removeEventListener('ended', startMain); } catch {}
          try { intro.removeEventListener('error', startMain); } catch {}
          try { skip.removeEventListener('click', startMain); } catch {}
          started = true; // block any late transitions
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

        // Transition triggers
        skip.addEventListener('click', startMain, { once: true });
        intro.addEventListener('ended', startMain, { once: true });
        intro.addEventListener('error', startMain, { once: true });
        // Watchdog: if after 8s nothing has started (no progress), start main
        const watchdog = setTimeout(()=>{
          try {
            const progressed = (intro.currentTime||0) > 0.1;
            if (!progressed && !intro.ended && !started) startMain();
          } catch { startMain(); }
        }, 8000);
        // register active cleanup on overlay so closing cancels pending transitions
        try { const ol = overlay; ol.__activeCleanup = cleanupActive; } catch {}
        stage.appendChild(intro);
        stage.appendChild(skip);
        try { const p = intro.play(); if (p && typeof p.catch === 'function') p.catch(()=>{}); } catch {}
        // On iOS, request fullscreen on the video element itself once it starts
        try {
          const kickFs = ()=>{ try { if (window.innerWidth <= 1024) tryEnterFullscreen(intro); } catch {} };
          intro.addEventListener('play', kickFs, { once: true });
          intro.addEventListener('loadedmetadata', kickFs, { once: true });
        } catch {}
      }

      // Small confirm dialog to resume from last position (shared with homepage)
      function askResume(seconds){
        return new Promise((resolve)=>{
          try {
            let overlay = document.querySelector('.resume-dialog-overlay');
            if (!overlay) {
              overlay = document.createElement('div');
              overlay.className = 'resume-dialog-overlay';
              const box = document.createElement('div'); box.className = 'resume-dialog-box';
              const h = document.createElement('h4'); h.textContent = 'Reprendre la lecture ?';
              const p = document.createElement('p'); p.className = 'resume-dialog-text';
              const actions = document.createElement('div'); actions.className = 'resume-dialog-actions';
              const noBtn = document.createElement('button'); noBtn.type = 'button'; noBtn.className = 'button secondary'; noBtn.textContent = 'Non, depuis le début';
              const yesBtn = document.createElement('button'); yesBtn.type = 'button'; yesBtn.className = 'button'; yesBtn.textContent = 'Oui, reprendre';
              actions.appendChild(noBtn); actions.appendChild(yesBtn);
              box.appendChild(h); box.appendChild(p); box.appendChild(actions);
              overlay.appendChild(box); document.body.appendChild(overlay);
              // Dismiss behaviors
              overlay.addEventListener('click', (ev)=>{ if (ev.target === overlay) { overlay.classList.remove('open'); resolve(null); } });
              overlay.addEventListener('keydown', (ev)=>{ try { if (ev.key === 'Escape') { overlay.classList.remove('open'); resolve(null); } } catch {} });
              noBtn.addEventListener('click', ()=>{ overlay.classList.remove('open'); resolve(false); });
              yesBtn.addEventListener('click', ()=>{ overlay.classList.remove('open'); resolve(true); });
            }
            const total = Math.max(0, Math.floor(seconds||0));
            const m = Math.floor(total / 60);
            const s = String(total % 60).padStart(2, '0');
            const text = overlay.querySelector('.resume-dialog-text');
            if (text) text.textContent = `Voulez-vous reprendre à ${m}:${s} ?`;
            overlay.classList.add('open');
            try { overlay.setAttribute('tabindex','-1'); overlay.focus(); } catch {}
          } catch { resolve(false); }
        });
      }

      document.addEventListener('click', function(e){
        try {
          const a = e.target && (e.target.closest ? e.target.closest('a') : null);
          if (!a) return;
          const href = a.getAttribute('href') || '';
          if (!isYouTubeUrl(href)) return;
          // Allow modifier clicks (open in new tab via Ctrl/Cmd, middle click)
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || (e.button && e.button !== 0)) return;
          e.preventDefault();
          const title = (a.closest('.fiche-right')?.querySelector('h3')?.textContent || a.getAttribute('data-title') || '').trim();

          // Lookup saved progress (same keying scheme as fiche.js when possible)
          let baseId = '';
          try {
            const pop = a.closest('.fiche-popup');
            if (pop && pop.id) baseId = String(pop.id);
          } catch {}
          // Fallback: attempt to parse fiche id from URL if present in query
          if (!baseId) {
            try {
              const u = new URL(location.href);
              const fid = u.searchParams.get('id');
              if (fid) baseId = fid;
            } catch {}
          }
          // Extract YouTube video id from href if available
          let vid = '';
          try {
            const m1 = href.match(/[?&]v=([\w-]{6,})/i) || href.match(/embed\/([\w-]{6,})/i);
            if (m1) vid = m1[1];
          } catch {}
          const keyId = baseId ? (baseId + (vid ? ('::' + vid) : '')) : (vid || '');
          let seconds = 0;
          try {
            const raw = localStorage.getItem('clipsou_watch_progress_v1');
            const list = raw ? JSON.parse(raw) : [];
            const entry = Array.isArray(list) ? list.find(x => x && (x.id === keyId || (!baseId && vid && x.id && String(x.id).endsWith('::'+vid)))) : null;
            seconds = entry && typeof entry.seconds === 'number' ? entry.seconds : 0;
          } catch {}

          const proceed = () => { showIntroThenPlay(href, title); };
          if (seconds > 0) {
            askResume(seconds).then((res)=>{
              if (res === null) return; // cancelled
              const yes = !!res;
              try { window.__resumeOverride = yes ? 'yes' : 'no'; } catch {}
              try { window.__resumeSeconds = yes ? seconds : 0; } catch {}
              proceed();
            });
          } else {
            try { window.__resumeOverride = 'yes'; } catch {}
            try { window.__resumeSeconds = 0; } catch {}
            proceed();
          }
        } catch {}
      }, true);
    } catch {}
  })();

});
