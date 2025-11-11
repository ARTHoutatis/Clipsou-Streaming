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

    // Utilise les fonctions partagées de utilities.js (pas de duplication)

// Activer le lazy loading optimisé pour toutes les images
installLazyImageLoader();

document.addEventListener('DOMContentLoaded', async function () {
  // Ensure carousel images stay hidden until loaded (works for static and dynamic imgs)
  (function ensureCarouselImgReveal(){
    try {
      const markLoaded = (img) => { try { img.classList.add('is-loaded'); img.style.opacity = '1'; } catch{} };
      document.querySelectorAll('.carousel-slide > img').forEach(function(img){
        try {
          if (img.complete && img.naturalWidth > 0) { markLoaded(img); return; }
          img.addEventListener('load', function(){ markLoaded(img); }, { once: true });
        } catch {}
      });
    } catch {}
  })();
  // Preserve scroll position on load/refresh
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'auto'; } catch {}
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

    // Persist background Y right before refresh/close if a popup is currently open
    function persistBgYIfPopupOpen(){
      try {
        if (!isPopupTargeted()) return;
        let y = 0;
        try {
          // If body is fixed, derive Y from style.top (negative)
          const b = document.body;
          const topStr = (b && b.style && b.style.top) ? b.style.top : '';
          const m = /-?(\d+(?:\.\d+)?)px/.exec(topStr || '');
          if (m) {
            const n = parseFloat(m[1]);
            if (!Number.isNaN(n)) y = Math.max(0, Math.round(n));
          } else {
            // Fallback to window scroll
            y = window.pageYOffset || document.documentElement.scrollTop || 0;
          }
        } catch { y = window.pageYOffset || 0; }
        try { sessionStorage.setItem(POPUP_SCROLL_KEY, String(y)); } catch {}
        try { sessionStorage.setItem(POPUP_HASH_KEY, String(location.hash || '')); } catch {}
      } catch {}
    }
    // Persist background Y aggressively in more lifecycle hooks
    try { window.addEventListener('beforeunload', persistBgYIfPopupOpen); } catch {}
    try { window.addEventListener('pagehide', persistBgYIfPopupOpen); } catch {}
    try { document.addEventListener('visibilitychange', function(){ if (document.hidden) persistBgYIfPopupOpen(); }); } catch {}

    // Always persist the last background Y (generic) to support first-open after refresh
    function saveGenericY(){
      try {
        let y = 0;
        try {
          const b = document.body;
          const topStr = (b && b.style && b.style.top) ? b.style.top : '';
          const m = /-?(\d+(?:\.\d+)?)px/.exec(topStr || '');
          if (m) { const n = parseFloat(m[1]); if (!Number.isNaN(n)) y = Math.max(0, Math.round(n)); }
          else { y = window.pageYOffset || document.documentElement.scrollTop || 0; }
        } catch { y = window.pageYOffset || 0; }
        sessionStorage.setItem(GENERIC_BG_Y_KEY, String(y));
      } catch {}
    }
    try { window.addEventListener('scroll', function(){ try { if (!isPopupTargeted()) return; } catch {}; saveGenericY(); }, { passive: true }); } catch {}
    try { setInterval(saveGenericY, 1500); } catch {}
  })();

  // Canonicalize any in-site link pointing to index.html to the root in the SAME tab
  (function preventDoubleOpenOnIndex(){
    try {
      document.addEventListener('click', function(e){
        try {
          const a = e.target && (e.target.closest ? e.target.closest('a[href]') : null);
          if (!a) return;
          const href = String(a.getAttribute('href') || '');
          // Only handle same-site relative links explicitly pointing to index.html
          if (/^https?:/i.test(href)) return;
          if (!/index\.html(?:[?#]|$)/i.test(href)) return;
          e.preventDefault();
          let to = href.replace(/index\.html/i, '');
          if (!to) to = './';
          // Navigate in the same tab without opening a new window
          window.location.href = to;
        } catch {}
      }, true);
    } catch {}
  })();


  // ===== Drawer shortcuts: put Favoris then Nouveautés at the top =====
  (function updateDrawerShortcuts(){
    try {
      const list = document.getElementById('drawer-sections');
      if (!list) return;
      // Helper to remove any existing shortcut by href hash
      function removeByHash(hash){
        try {
          list.querySelectorAll('li > a.link[href^="#"]').forEach(a => {
            if ((a.getAttribute('href')||'') === hash) {
              const li = a.closest('li'); if (li && li.parentNode) li.parentNode.removeChild(li);
            }
          });
        } catch {}
      }
      // Ensure unique and ordered: 1) Favoris, 2) Nouveautés
      removeByHash('#favorites');
      removeByHash('#nouveautes');

      // Build entries
      function makeLi(hash, i18nKey){
        const li = document.createElement('li');
        li.setAttribute('data-fixed','1');
        const a = document.createElement('a'); 
        a.className = 'link'; 
        a.href = hash;
        a.setAttribute('data-i18n', i18nKey);
        a.textContent = window.i18n ? window.i18n.translate(i18nKey) : hash.replace('#', '');
        li.appendChild(a);
        return li;
      }
      const liFav = makeLi('#favorites', 'drawer.favorites');
      const liNew = makeLi('#nouveautes', 'drawer.nouveautes');

      // Insert at the very top with Nouveautés au-dessus de Favoris
      const first = list.firstChild;
      list.insertBefore(liFav, first);
      list.insertBefore(liNew, liFav);
    } catch {}
    
    // Re-run when language changes
    try {
      window.addEventListener('languageChanged', () => {
        try {
          const list = document.getElementById('drawer-sections');
          if (!list) return;
          // Update Favoris and Nouveautés text
          const favLink = list.querySelector('a.link[href="#favorites"]');
          const newLink = list.querySelector('a.link[href="#nouveautes"]');
          if (favLink && window.i18n) favLink.textContent = window.i18n.translate('drawer.favorites');
          if (newLink && window.i18n) newLink.textContent = window.i18n.translate('drawer.nouveautes');
        } catch {}
      });
    } catch {}
  })();

  // Admin shortcut watcher: show only if currently logged-in (broadcast), but keep it across viewport changes.
  (function watchAdminShortcut(){
    const ADMIN_REQ_COUNT_KEY = 'clipsou_admin_user_request_count_v1';

    function buildAdminAnchor(){
      const a = document.createElement('a');
      a.href = 'admin/admin.html';
      a.className = 'admin-link';
      a.setAttribute('aria-label','Administration');
      a.setAttribute('title','Administration');
      a.innerHTML = (
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" focusable="false">\
          <g id="SVGRepo_bgCarrier" stroke-width="0"></g>\
          <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>\
          <g id="SVGRepo_iconCarrier">\
            <g id="style=fill">\
              <g id="setting">\
                <path id="Subtract" fill-rule="evenodd" clip-rule="evenodd" d="M10.8946 3.00654C10.2226 1.87704 8.75191 1.45656 7.59248 2.14193L5.86749 3.12906C4.59518 3.85639 4.16378 5.48726 4.8906 6.74522L4.89112 6.74611C5.26606 7.39298 5.20721 7.8062 5.09018 8.00929C4.97308 8.21249 4.64521 8.47001 3.9 8.47001C2.43322 8.47001 1.25 9.66837 1.25 11.12V12.88C1.25 14.3317 2.43322 15.53 3.9 15.53C4.64521 15.53 4.97308 15.7875 5.09018 15.9907C5.20721 16.1938 5.26606 16.607 4.89112 17.2539L4.8906 17.2548C4.16378 18.5128 4.59558 20.1439 5.8679 20.8712L7.59257 21.8581C8.75199 22.5434 10.2226 22.123 10.8946 20.9935L11.0091 20.7958C11.3841 20.1489 11.773 19.9925 12.0087 19.9925C12.2434 19.9925 12.6293 20.1476 12.9993 20.793L13.0009 20.7958L13.1109 20.9858L13.1154 20.9935C13.7874 22.123 15.258 22.5434 16.4174 21.8581L18.1425 20.871C19.4157 20.1431 19.8444 18.5235 19.1212 17.2579L19.1189 17.2539C18.7439 16.607 18.8028 16.1938 18.9198 15.9907C19.0369 15.7875 19.3648 15.53 20.11 15.53C21.5768 15.53 22.76 14.3317 22.76 12.88V11.12C22.76 9.65323 21.5616 8.47001 20.11 8.47001C19.3648 8.47001 19.0369 8.21249 18.9198 8.00929C18.8028 7.8062 18.7439 7.39298 19.1189 6.74611L19.1194 6.74522C19.8463 5.48713 19.4147 3.85604 18.1421 3.12883L16.4175 2.14193C15.2581 1.45656 13.7874 1.877 13.1154 3.00651L13.0009 3.20423C12.6259 3.85115 12.237 4.00751 12.0012 4.00751C11.7666 4.00751 11.3807 3.85247 11.0107 3.20701L11.0091 3.20423L10.8991 3.01421L10.8946 3.00654ZM15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" fill="#ffffff"></path>\
              </g>\
            </g>\
          </g>\
        </svg>\
        <span>Admin</span>'
      );
      const badge = document.createElement('span');
      badge.className = 'admin-badge';
      badge.id = 'navAdminBadge';
      badge.hidden = true;
      a.appendChild(badge);
      return a;
    }

    function ensureBadgeElement(anchor){
      if (!anchor) return;
      if (!anchor.querySelector('.admin-badge')) {
        const badge = document.createElement('span');
        badge.className = 'admin-badge';
        badge.id = 'navAdminBadge';
        badge.hidden = true;
        anchor.appendChild(badge);
      }
    }

    function getPendingUserRequestsCount(){
      try {
        const raw = localStorage.getItem(ADMIN_REQ_COUNT_KEY);
        if (raw === undefined || raw === null || raw === '') return 0;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : 0;
      } catch {
        return 0;
      }
    }

    function applyBadge(count){
      try {
        const anchor = document.querySelector('nav[aria-label="Navigation principale"] .nav-links .admin-link');
        if (!anchor) return;
        ensureBadgeElement(anchor);
        const badge = anchor.querySelector('.admin-badge');
        if (!badge) return;
        if (!count || count <= 0) {
          badge.hidden = true;
          badge.textContent = '';
        } else {
          badge.hidden = false;
          badge.textContent = count > 99 ? '99+' : String(count);
        }
      } catch {}
    }

    function ensure(show){
      try {
        // Navbar (all viewports; CSS handles mobile icon-only)
        const navLinks = document.querySelector('nav[aria-label="Navigation principale"] .nav-links');
        let existingNav = navLinks ? navLinks.querySelector('a.admin-link') : null;
        if (!show) {
          if (existingNav && existingNav.parentNode) existingNav.parentNode.removeChild(existingNav);
        } else if (navLinks) {
          if (!existingNav) {
            existingNav = buildAdminAnchor();
            navLinks.appendChild(existingNav);
          } else {
            // If an older text-only link exists, upgrade it to include the SVG/badge
            if (!existingNav.querySelector('svg')) {
              const fresh = buildAdminAnchor();
              existingNav.innerHTML = fresh.innerHTML;
              ensureBadgeElement(existingNav);
              existingNav.setAttribute('aria-label', fresh.getAttribute('aria-label'));
              existingNav.setAttribute('title', fresh.getAttribute('title'));
            } else {
              ensureBadgeElement(existingNav);
            }
          }
        }
        // Drawer (always)
        const list = document.getElementById('drawer-sections');
        const existingDrawer = list ? list.querySelector('a.link[href="admin/admin.html"]') : null;
        if (!show) {
          if (existingDrawer) { const li = existingDrawer.closest('li'); if (li && li.parentNode) li.parentNode.removeChild(li); }
        } else if (list && !existingDrawer) {
          const li = document.createElement('li'); li.setAttribute('data-fixed','1');
          const a = document.createElement('a'); a.className = 'link'; a.href = 'admin/admin.html'; a.textContent = '⚙️ Admin';
          li.appendChild(a); list.insertBefore(li, list.firstChild);
        }

        if (show) {
          applyBadge(getPendingUserRequestsCount());
        }
      } catch {}
    }

    function isLoggedIn(){
      try { return localStorage.getItem('clipsou_admin_logged_in_v1') === '1'; }
      catch { return false; }
    }

    function update(){
      const loggedIn = isLoggedIn();
      ensure(loggedIn);
      if (!loggedIn) {
        applyBadge(0);
      } else {
        applyBadge(getPendingUserRequestsCount());
      }
    }

    // Initial draw
    update();

    // React to cross-tab login/logout broadcasts & badge updates
    try {
      window.addEventListener('storage', (e)=>{
        if (!e) return;
        const key = e.key || '';
        if (key === 'clipsou_admin_logged_in_v1' || key === 'clipsou_admin_session_broadcast') {
          update();
        } else if (key === ADMIN_REQ_COUNT_KEY) {
          if (isLoggedIn()) applyBadge(getPendingUserRequestsCount());
        }
      });
    } catch {}

    // React to viewport changes (rebuild if needed)
    try { window.addEventListener('resize', update); } catch {}
  })();

  // On homepage refresh: close any open popup (hash) and scroll to top
  (function forceTopOnRefresh(){
    try {
      const path = (location && location.pathname) || '';
      const isIndex = /(^|\/)($|index\.html?$)/i.test(path);
      if (!isIndex) return;
      const hash = (location && location.hash) || '';
      let cleared = false;
      if (hash) {
        // Clear any hash to close all :target-based popups (yt, partenariats, infos, fiches, etc.)
        try { window.location.hash = ''; } catch {}
        try {
          const url = window.location.pathname + window.location.search;
          if (window.history && typeof window.history.replaceState === 'function') {
            window.history.replaceState(null, document.title, url);
          }
        } catch {}
        // Unlock background scroll on mobile (in case it was locked by popup flow)
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
        // Mark to skip reapplying any pending popup hash later in the flow
        try { sessionStorage.setItem('clipsou_block_popup_reapply', '1'); } catch {}
        cleared = true;
      }
      // If early script already removed the hash and stored a pending one, block it too
      try {
        if (window.__popupPendingHash) {
          // Do not reopen: drop pending hash and mark block flag
          try { delete window.__popupPendingHash; } catch { window.__popupPendingHash = null; }
          try { sessionStorage.setItem('clipsou_block_popup_reapply', '1'); } catch {}
          // Also remove any early lock style
          const s = document.getElementById('early-popup-lock');
          if (s && s.parentNode) s.parentNode.removeChild(s);
          // Ensure popup-open classes are cleared
          document.body.classList.remove('popup-open');
          document.documentElement.classList.remove('popup-open');
        }
      } catch {}
      // Ensure we land at the very top after build
      setTimeout(()=>{ window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, cleared ? 50 : 0);
      setTimeout(()=>{ window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, 150);
    } catch {}
  })();

  // Ensure Discord invite sits right before the Séries section
  (function placeDiscordInvite(){
    try {
      var invite = document.getElementById('discord-invite');
      if (!invite) return;
      // If a dedicated Séries section exists, place banner just before it
      var series = document.getElementById('series');
      if (series && series.parentNode) {
        if (invite.nextElementSibling !== series) {
          series.parentNode.insertBefore(invite, series);
        }
        return;
      }
      // Observe future additions to place right before #series when it appears
      var main = document.querySelector('main') || document.body;
      if (!main) return;
      var placed = false;
      try { placed = !!document.getElementById('series'); } catch {}
      var observer = new MutationObserver(function(mutations){
        if (placed) return;
        try {
          var s = document.getElementById('series');
          if (s && s.parentNode) {
            s.parentNode.insertBefore(invite, s);
            placed = true;
            observer.disconnect();
          }
        } catch {}
      });
      observer.observe(main, { childList: true, subtree: true });
      // Safety timeout: stop observing after some time
      setTimeout(function(){ try { observer.disconnect(); } catch {} }, 8000);
    } catch {}
  })();

  // ===== External link confirmation (Trustpilot, Discord, Tipeee) =====
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
            h.endsWith('nova-stream.live') ||
            h.endsWith('creator-spring.com')
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
          const dest = (function(){
            try {
              const u = new URL(href, location.href);
              const host = (u.hostname || '').replace(/^www\./,'');
              let path = u.pathname || '';
              // Remove trailing slash if path is root
              if (path === '/') path = '';
              return host + path;
            } catch { return href; }
          })();
          const ok = window.confirm('Vous allez ouvrir un lien externe :\n' + dest + '\n\nÊtes-vous sûr de vouloir continuer ?');
          if (!ok) { e.preventDefault(); e.stopPropagation(); }
        } catch {}
      }, true);
    } catch {}
  })();
  // ===== Preserve scroll position when opening/closing popups =====
  // ===== Preserve scroll position when opening/closing popups =====
  (function setupPopupScrollKeeper(){
    // Keys to persist background scroll while a popup is open
    const POPUP_SCROLL_KEY = 'clipsou_popup_bg_scroll_v1';
    const POPUP_HASH_KEY = 'clipsou_popup_hash_v1';
    const GENERIC_BG_Y_KEY = 'clipsou_last_bg_y_v1';
    let lastPopupScrollY = null;
    let lastWasAtBottom = false;
    let popupSaveInterval = null;
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
  function buildContinueWatching(){
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
        .filter(it => {
          if (!it || !it.id) return false;
          const percent = typeof it.percent === 'number' ? it.percent : 0;
          const seconds = typeof it.seconds === 'number' ? Math.max(0, it.seconds) : 0;
          const duration = typeof it.duration === 'number' ? Math.max(0, it.duration) : 0;
          if (percent <= 0 && seconds <= 0) return false;
          if (percent >= 0.99) return false;
          if (duration > 0 && duration - seconds <= 5) return false;
          if (it.finished) return false;
          return true;
        })
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
          'al': 'images/Al1.webp',
          'ba': 'images/Ba1.webp',
          'bac': 'images/Bac1.webp',
          'dé': 'images/Dé1.webp',
          'ja': 'images/Ja1.webp',
          'je': 'images/Je1.webp',
          'ka': 'images/Ka1.webp',
          'la': 'images/La1.webp',
          'law': 'images/Law1.webp',
          'ur': 'images/Ur1.webp'
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
        // Prefer landscape first for Continue Watching (use 400px optimization)
        if (it.landscapeImage) addDerived(optimizeCloudinaryUrlContinue(it.landscapeImage));
        if (it.image) {
          // Generate a potential landscape variant from the portrait filename (webp only)
          addLandscapeVariant(optimizeCloudinaryUrlContinue(it.image));
          addDerived(optimizeCloudinaryUrlContinue(it.image));
        }
        // Always include original URLs as fallbacks (even if not .webp), so Cloudinary PNG/JPG still work
        if (it.landscapeImage) candidates.push(optimizeCloudinaryUrlContinue(it.landscapeImage));
        if (it.image) candidates.push(optimizeCloudinaryUrlContinue(it.image));
        // Force try '<base>1.webp' exactly first (e.g., 'Dé.webp' -> 'Dé1.webp').
        // Avoid doubling the '1' if the filename already ends with '1.webp'.
        let preferred = null;
        try {
          if (it && it.image && /\.(?:webp|jpg|jpeg|png)$/i.test(it.image)) {
            const alreadyLandscape = /1\.(?:webp|jpg|jpeg|png)$/i.test(it.image);
            preferred = alreadyLandscape
              ? it.image // keep as-is; do not try to derive 'Law.webp'
              : it.image.replace(/\.(?:webp|jpg|jpeg|png)$/i, '1.webp');
          }
        } catch {}
        if (preferred && !candidates.includes(preferred)) candidates.unshift(preferred);
        let cIdx = 0;
        const first = applySrc(candidates[cIdx]) || applySrc(it.landscapeImage || it.image) || '';
        if (first) img.dataset.src = first;
        img.onerror = function(){ cIdx++; if (cIdx < candidates.length) { this.src = applySrc(candidates[cIdx]); } else { this.onerror=null; try { this.removeAttribute('src'); } catch {} } };
        img.alt = 'Affiche de ' + (it.title || 'contenu');
        img.loading = 'lazy'; img.decoding = 'async';
        try { img.fetchPriority = 'low'; } catch {}
        media.appendChild(img);
        a.appendChild(media);

        // Progress bar
        const prog = document.createElement('div'); prog.className = 'progress';
        const bar = document.createElement('div'); bar.className = 'bar';
        const pct = Math.max(0, Math.min(99, Math.round((it.percent||0)*100)));
        bar.style.width = pct + '%';
        prog.appendChild(bar);
        card.appendChild(a);
        // Favorite heart button uses base id
        try { card.appendChild(makeFavButton({ id: baseId, title: it.title || '' })); } catch {}
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
          caption.textContent = `${m}:${s} min restant`;
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
        const formattedTitle = epNum != null ? `Ep ${epNum} - ${t}` : t;
        title.textContent = formattedTitle;
        // Store formatted title in link for player popup
        a.setAttribute('data-title', formattedTitle);
        wrapper.appendChild(title);

        return wrapper;
      }

      items.slice(0, 20).forEach(it => { rail.appendChild(createCard(it)); });

      // Appliquer les traductions sur les cartes créées
      if (window.i18n && typeof window.i18n.updateCardTypes === 'function') {
        const lang = window.i18n.getCurrentLanguage();
        window.i18n.updateCardTypes(lang);
      }

      // Keep list trimmed in storage to avoid growth
      try {
        const trimmed = items.slice(0, 50);
        saveProgressList(trimmed);
      } catch {}
    } catch {}
  }

  // Initial build and auto-refresh hooks (no full reload needed)
  try { buildContinueWatching(); } catch {}
  try { window.addEventListener('clipsou-progress-updated', function(){ try { buildContinueWatching(); } catch {} }); } catch {}
  try { window.addEventListener('pageshow', function(){ try { buildContinueWatching(); } catch {} }); } catch {}
  try { window.addEventListener('focus', function(){ try { buildContinueWatching(); } catch {} }); } catch {}
  try { document.addEventListener('visibilitychange', function(){ try { if (!document.hidden) buildContinueWatching(); } catch {} }); } catch {}

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
        // Persist background scroll Y and current popup hash for refresh scenarios
        try {
          sessionStorage.setItem(POPUP_SCROLL_KEY, String(y));
          sessionStorage.setItem(POPUP_HASH_KEY, String(location.hash || ''));
        } catch {}
        // Start a short interval to keep Y fresh in storage while popup is open
        try { if (popupSaveInterval) { clearInterval(popupSaveInterval); popupSaveInterval = null; } } catch {}
        try {
          popupSaveInterval = setInterval(()=>{
            try {
              const curY = (window.__lockScrollY != null) ? window.__lockScrollY : (window.pageYOffset || document.documentElement.scrollTop || 0);
              sessionStorage.setItem(POPUP_SCROLL_KEY, String(curY));
              sessionStorage.setItem(POPUP_HASH_KEY, String(location.hash || ''));
              // Also maintain a generic last-Y as ultimate fallback
              sessionStorage.setItem(GENERIC_BG_Y_KEY, String(curY));
            } catch {}
          }, 300);
        } catch {}
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
      // Clear persisted state when popup is closed
      try { sessionStorage.removeItem(POPUP_SCROLL_KEY); sessionStorage.removeItem(POPUP_HASH_KEY); } catch {}
      // Stop periodic saver
      try { if (popupSaveInterval) { clearInterval(popupSaveInterval); popupSaveInterval = null; } } catch {}
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

    // If the page loads with a popup hash, restore background scroll from sessionStorage
    try {
      const hasPopupOnLoad = isPopupTargeted();
      if (hasPopupOnLoad) {
        let savedY = NaN;
        try { savedY = parseInt(sessionStorage.getItem(POPUP_SCROLL_KEY) || '', 10); } catch {}
        if (!Number.isFinite(savedY)) {
          try { savedY = parseInt(sessionStorage.getItem(GENERIC_BG_Y_KEY) || '', 10); } catch {}
        }
        if (Number.isFinite(savedY)) {
          // Apply lock and force the background to the saved position
          try { applyBodyPopupState(true); } catch {}
          try { lockBodyAt(savedY); } catch {}
          try {
            window.scrollTo({ top: savedY, left: 0, behavior: 'auto' });
            maintainScroll(savedY, 400);
          } catch {}
          // Ensure internal state matches
          try { lastPopupScrollY = savedY; lastWasAtBottom = false; } catch {}
          // Double-pass to counter late layout shifts and default anchor jumps
          try { setTimeout(() => { window.scrollTo({ top: savedY, left: 0, behavior: 'auto' }); maintainScroll(savedY, 300); }, 0); } catch {}
          try { setTimeout(() => { window.scrollTo({ top: savedY, left: 0, behavior: 'auto' }); maintainScroll(savedY, 200); }, 120); } catch {}
        } else {
          // No saved Y; at least lock now to prevent background moving further
          try {
            const y = window.pageYOffset || document.documentElement.scrollTop || 0;
            applyBodyPopupState(true);
            lockBodyAt(y);
            maintainScroll(y, 300);
            try { sessionStorage.setItem(POPUP_SCROLL_KEY, String(y)); } catch {}
            try { sessionStorage.setItem(GENERIC_BG_Y_KEY, String(y)); } catch {}
          } catch {}
        }
      }
    } catch {}

    // Re-apply pending hash removed early in head to avoid native scroll jump
    try {
      const blockReapply = (function(){ try { return sessionStorage.getItem('clipsou_block_popup_reapply') === '1'; } catch { return false; } })();
      if (window.__popupPendingHash && !blockReapply) {
        const h = window.__popupPendingHash;
        try { delete window.__popupPendingHash; } catch { window.__popupPendingHash = null; }
        // Ensure body is already locked at the saved position if available
        let y2 = 0; try { y2 = parseInt(sessionStorage.getItem(POPUP_SCROLL_KEY)||'', 10) || 0; } catch {}
        if (!Number.isFinite(y2) || y2 === 0) { try { y2 = parseInt(sessionStorage.getItem(GENERIC_BG_Y_KEY)||'', 10) || 0; } catch {} }
        try { if (!Number.isFinite(y2)) y2 = 0; } catch {}
        try { applyBodyPopupState(true); } catch {}
        try { lockBodyAt(y2); } catch {}
        try { window.scrollTo({ top: y2, left: 0, behavior: 'auto' }); maintainScroll(y2, 300); } catch {}
        // Now set the hash to activate :target without letting the page jump
        try {
          if ((location.hash||'') !== h) {
            location.hash = h;
          } else {
            onHashChanged();
          }
        } catch {}
        // Enforce background position once more after :target applies
        try { setTimeout(()=>{ const y = y2||0; window.scrollTo({ top: y, left: 0, behavior: 'auto' }); maintainScroll(y, 250); }, 0); } catch {}
        try { setTimeout(()=>{ const y = y2||0; window.scrollTo({ top: y, left: 0, behavior: 'auto' }); maintainScroll(y, 200); }, 120); } catch {}
        // Remove early lock style if present
        try { const s = document.getElementById('early-popup-lock'); if (s && s.parentNode) s.parentNode.removeChild(s); } catch {}
      } else {
        // We are skipping reapply: cleanup any early locks and pending state
        try { delete window.__popupPendingHash; } catch { window.__popupPendingHash = null; }
        try { const s = document.getElementById('early-popup-lock'); if (s && s.parentNode) s.parentNode.removeChild(s); } catch {}
        try { sessionStorage.removeItem('clipsou_block_popup_reapply'); } catch {}
      }
    } catch {}
  })();
  // Backward-compatibility handling for old hash links removed intentionally.
  // Ensure lazy/async attrs on all images
  document.querySelectorAll('img').forEach(function (img) {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    if (!img.getAttribute('alt')) img.setAttribute('alt', 'Image – Clipsou Streaming');
  });

  // Optimiser le carousel: charger seulement la première image immédiatement
  (function optimizeCarousel(){
    try {
      const slides = document.querySelectorAll('.carousel-slide .carousel-bg[data-src]');
      if (slides.length === 0) return;
      
      // Charger la première image immédiatement avec haute priorité
      const first = slides[0];
      if (first && first.dataset.src) {
        first.src = first.dataset.src;
        first.removeAttribute('data-src');
        first.classList.add('loaded');
      }
      
      // Charger la deuxième image après un court délai
      setTimeout(() => {
        const second = slides[1];
        if (second && second.dataset.src) {
          second.src = second.dataset.src;
          second.removeAttribute('data-src');
        }
      }, 500);
      
      // Charger les autres images quand elles deviennent visibles (via le carousel)
      const loadSlideImage = (index) => {
        try {
          const slide = slides[index];
          if (slide && slide.dataset.src) {
            slide.src = slide.dataset.src;
            slide.removeAttribute('data-src');
          }
        } catch {}
      };
      
      // Observer les changements de slide pour charger l'image avant qu'elle soit visible
      const indicators = document.querySelectorAll('.carousel-indicator');
      indicators.forEach((indicator, idx) => {
        indicator.addEventListener('click', () => {
          loadSlideImage(idx);
          // Précharger le suivant
          loadSlideImage((idx + 1) % slides.length);
        });
      });
      
      // Pour les flèches
      const prevBtn = document.querySelector('.carousel-arrow.prev');
      const nextBtn = document.querySelector('.carousel-arrow.next');
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          const current = document.querySelector('.carousel-indicator.active');
          if (current) {
            const idx = parseInt(current.dataset.index || '0', 10);
            const prevIdx = (idx - 1 + slides.length) % slides.length;
            loadSlideImage(prevIdx);
          }
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          const current = document.querySelector('.carousel-indicator.active');
          if (current) {
            const idx = parseInt(current.dataset.index || '0', 10);
            const nextIdx = (idx + 1) % slides.length;
            loadSlideImage(nextIdx);
          }
        });
      }
    } catch {}
  })();

  // ===== Home Filters (genre chips + toggle) =====
  (function setupHomeFilters(){
    try {
      const filtersSection = document.getElementById('home-filters');
      const chipsContainer = document.getElementById('home-genre-filters');
      if (!filtersSection || !chipsContainer) return; // Only on homepage

      // Collect unique genres from existing popups in DOM
      function normalizeStr(str){
        try { return String(str||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''); } catch { return String(str||''); }
      }
      function collectGenres(){
        const byKey = new Map();
        const hasDiacritics = (s)=>{ try { return String(s)!==normalizeStr(String(s)); } catch { return false; } };
        document.querySelectorAll('.fiche-popup .rating-genres .genres .genre-tag')
          .forEach(el => {
            const g = (el && el.textContent || '').trim();
            if (!g) return;
            const key = normalizeStr(g).toLowerCase();
            if (!byKey.has(key)) byKey.set(key, g);
            else {
              // Prefer accented label if available
              const cur = byKey.get(key);
              if (!hasDiacritics(cur) && hasDiacritics(g)) byKey.set(key, g);
            }
          });
        return Array.from(byKey.values()).sort((a,b)=> a.localeCompare(b,'fr'));
      }

      function renderChips(){
        const genres = collectGenres();
        chipsContainer.innerHTML = genres.map(g => `<button type="button" class="genre-chip" data-genre="${g}">${g}</button>`).join('');
      }

      function installChipClicks(){
        chipsContainer.addEventListener('click', function(e){
          const btn = e.target && (e.target.closest ? e.target.closest('.genre-chip') : null);
          if (!btn) return;
          const genre = btn.getAttribute('data-genre') || '';
          const url = 'search.html?q=' + encodeURIComponent(genre);
          window.location.href = url;
        });
      }

      // Toggle handling: desktop collapsed by default; mobile open by default
      function applyInitialState(){
        const isDesktop = (window.matchMedia && window.matchMedia('(min-width: 769px)').matches);
        filtersSection.classList.toggle('collapsed', !!isDesktop);
        const toggle = document.querySelector('nav .filter-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', isDesktop ? 'false' : 'true');
      }

      function setupToggle(){
        const toggle = document.querySelector('nav .filter-toggle');
        if (!toggle) return;
        toggle.addEventListener('click', function(){
          const isCollapsed = filtersSection.classList.toggle('collapsed');
          toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
        });
        // Update on viewport changes
        const mq = window.matchMedia('(min-width: 769px)');
        const onChange = ()=>{
          applyInitialState();
        };
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
        else if (typeof mq.addListener === 'function') mq.addListener(onChange);
      }

      renderChips();
      installChipClicks();
      applyInitialState();
      setupToggle();
    } catch {}
  })();

  // ========== Drawer (hamburger) ==========
  (function setupDrawer(){
    const btn = document.querySelector('.hamburger');
    const drawer = document.getElementById('app-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const closeBtn = drawer ? drawer.querySelector('.close-drawer') : null;
    if (!btn || !drawer || !overlay) return; // Only on homepage where drawer exists

    function isPopupOpen(){
      try {
        return !!document.querySelector('.fiche-popup:target') || document.body.classList.contains('popup-open');
      } catch { return false; }
    }

    function open(){
      // Do not open the drawer if a popup is currently open (e.g., opened from footer)
      if (isPopupOpen()) return;
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
    btn.addEventListener('click', (e) => {
      // Block opening when a popup is open
      if (isPopupOpen()) { try { e.preventDefault(); e.stopPropagation(); } catch {}; return; }
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
          const canScrollX = /(auto|scroll)/.test(style.overflowX);
          if (canScrollY && el.scrollHeight > el.clientHeight + 1) return el;
          if (canScrollX && el.scrollWidth > el.clientWidth + 1) return el;
          el = el.parentElement;
        }
        return null;
      }
      function shouldPreventFor(el, deltaY) {
        // If no scrollable container, prevent to avoid background scroll
        if (!el) return true;
        // For horizontal rails, never prevent (always allow horizontal scroll)
        const isHorizontalRail = el.classList && el.classList.contains('rail');
        if (isHorizontalRail) return false;
        // For vertical scrolling
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
          // Check if touch is inside a horizontally scrollable rail (allow scroll even when drawer closed)
          const scrollBox = findScrollableAncestor(/** @type {Element} */(e.target));
          const isHorizontalRail = scrollBox && scrollBox.classList && scrollBox.classList.contains('rail');
          
          // ALWAYS allow rail scrolling - don't prevent!
          if (isHorizontalRail) {
            return; // let the browser handle rail scrolling natively
          }
          
          if (isInsideDrawer(e.target) || isInsidePopup(e.target)) {
            // For touch, approximate: if the list can scroll, allow; otherwise block
            // Mark popup-originated touch scrolls
            try { if (isInsidePopup(e.target)) window.__lastPopupScrollTs = Date.now(); } catch {}
            if (scrollBox && shouldPreventFor(scrollBox, 0)) { e.preventDefault(); e.stopPropagation(); }
            return;
          }
          e.preventDefault(); e.stopPropagation();
        } catch {}
      };
      const onKeyDown = (e) => { if (scrollKeys.has(e.key)) lastKeyTs = Date.now(); };
      // Track if the pointer is over the drawer to avoid accidental close while interacting with it
      let overDrawer = false;
      try {
        drawer.addEventListener('mouseenter', ()=>{ overDrawer = true; }, { passive: true });
        drawer.addEventListener('mouseleave', ()=>{ overDrawer = false; }, { passive: true });
        drawer.addEventListener('pointerenter', ()=>{ overDrawer = true; }, { passive: true });
        drawer.addEventListener('pointerleave', ()=>{ overDrawer = false; }, { passive: true });
      } catch {}
      const onScroll = () => {
        // Close only when the user drags the SITE/page scrollbar (mouseDragScrolling)
        // Do NOT close when scrolling inside the drawer (that doesn't trigger window scroll)
        // Also never close while a popup is open.
        try {
          const popupOpen = !!document.querySelector('.fiche-popup:target') || document.body.classList.contains('popup-open');
          if (popupOpen) return;
        } catch {}
        // Require the mouse-drag-scrolling flag (set on mousedown outside the drawer)
        if (!mouseDragScrolling) return;
        // If pointer is currently over the drawer, do not close
        if (overDrawer) return;
        try {
          const isOpen = document.body.classList.contains('drawer-open');
          if (isOpen) { reallyClose(); }
        } catch { try { close(); } catch {} }
      };
      // Detect mouse-based scrollbar drag: set flag on mousedown outside drawer; clear on mouseup
      const onMouseDown = (e) => {
        try {
          if (e && e.button === 0) {
            const t = e.target;
            const inside = (t && (t === drawer || (t.closest && t.closest('#app-drawer'))));
            if (!inside) mouseDragScrolling = true;
          }
        } catch {}
      };
      const onMouseUp = () => { mouseDragScrolling = false; };
      const onHash = () => { lastHashTs = Date.now(); };
      window.addEventListener('wheel', onWheel, { passive: false, capture: true });
      window.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
      window.addEventListener('keydown', onKeyDown, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true, capture: true });
      window.addEventListener('hashchange', onHash, { passive: true });
      // If a popup opened (e.g., from footer link), ensure the drawer is closed and does not open behind
      window.addEventListener('hashchange', function(){
        try { if (isPopupOpen()) reallyClose(); } catch {}
      }, { passive: true });
      window.addEventListener('mousedown', onMouseDown, { passive: true, capture: true });
      window.addEventListener('mouseup', onMouseUp, { passive: true, capture: true });
      removeCloseOnScroll = () => {
        window.removeEventListener('wheel', onWheel, { capture: true });
        window.removeEventListener('touchmove', onTouchMove, { capture: true });
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('scroll', onScroll, { capture: true });
        window.removeEventListener('hashchange', onHash);
        window.removeEventListener('mousedown', onMouseDown, { capture: true });
        window.removeEventListener('mouseup', onMouseUp, { capture: true });
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

      // Helper functions for genres (duplicated here for menu access)
      const normalizeGenreMenu = (name) => (name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      
      // Function to get translated genre label with emoji
      const getGenreDrawerLabel = (normalizedKey) => {
        const i18nKey = 'drawer.' + normalizedKey;
        if (window.i18n) {
          const translated = window.i18n.translate(i18nKey);
          if (translated !== i18nKey) return translated;
        }
        // Fallback to French
        const FALLBACK_MAP = { 
          comedie:'😂 Comédie', 
          familial:'👥 Familial', 
          aventure:'🗺️ Aventure', 
          action:'💥 Action', 
          horreur:'👻 Horreur' 
        };
        return FALLBACK_MAP[normalizedKey] || normalizedKey;
      };

      // Find genre sections
      const sections = Array.from(document.querySelectorAll('.section[id^="genre-"] h2'));
      sections.forEach(h2 => {
        const section = h2.closest('.section');
        if (!section || !section.id) return;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'link';
        a.href = '#' + section.id;
        
        // Extract genre name from section id and get translated label
        const genreName = section.id.replace(/^genre-/, '').replace(/-/g, ' ');
        const normalizedGenre = normalizeGenreMenu(genreName);
        const i18nKey = 'drawer.' + normalizedGenre;
        
        // Set data-i18n attribute for automatic translation updates
        a.setAttribute('data-i18n', i18nKey);
        a.textContent = getGenreDrawerLabel(normalizedGenre);
        
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

      // Always place the "🚀 Liens et infos" shortcut (href="#footer") at the very bottom
      try {
        const footerAnchor = list.querySelector('li > a.link[href="#footer"]');
        const footerLi = footerAnchor ? footerAnchor.closest('li') : null;
        if (footerLi) list.appendChild(footerLi);
      } catch {}
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
    
    // Rebuild drawer links when language changes
    try {
      window.addEventListener('languageChanged', () => {
        buildDrawerLinks();
      });
    } catch {}
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

  function syncMobileUI() {
    const isMobile = window.innerWidth <= 768;
    document.body.classList.toggle('is-mobile', isMobile);
    const partTitle = document.getElementById('partenariats-title');
    if (!partTitle) return;
    try { partTitle.style.removeProperty('display'); } catch {}
    partTitle.removeAttribute('aria-hidden');
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
      let isFile = false;
      try { isFile = (location && location.protocol === 'file:'); } catch {}
      if (!isFile) {
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
            const studioBadge = optimizeCloudinaryUrlSmall(c.studioBadge || '');
            items.push({ id: c.id, title: c.title, image: landscapeImage || portraitImage || '', portraitImage, landscapeImage, genres: Array.isArray(c.genres) ? c.genres.filter(Boolean) : [], rating, type, category: c.category || 'LEGO', description: c.description || '', baseName, watchUrl: c.watchUrl || '', studioBadge });
          });
          sharedLoaded = true;
          }
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
              const studioBadge = optimizeCloudinaryUrlSmall(c.studioBadge || '');
              items.push({ id: c.id, title: c.title, image: landscapeImage || portraitImage || '', portraitImage, landscapeImage, genres: Array.isArray(c.genres) ? c.genres.filter(Boolean) : [], rating, type, category: c.category || 'LEGO', description: c.description || '', baseName, watchUrl: c.watchUrl || '', studioBadge });
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

    const itemsById = new Map(items.map((it) => [String(it.id), it]));

    function primeSnapshotFromItems(list) {
      try {
        if (!Array.isArray(list) || !window.__ClipsouRatings) return;
        const api = window.__ClipsouRatings;
        if (typeof api.updateSnapshotEntry !== 'function' || typeof api.getSnapshotEntry !== 'function') return;
        list.forEach((entry) => {
          if (!entry || !entry.id) return;
          const rating = entry.rating;
          if (typeof rating !== 'number' || Number.isNaN(rating)) return;
          const normalizedCount = (typeof entry.ratingCount === 'number' && Number.isFinite(entry.ratingCount))
            ? Math.max(0, Math.round(entry.ratingCount))
            : undefined;
          const existing = api.getSnapshotEntry(entry.id);
          const existingCount = (existing && typeof existing.count === 'number' && Number.isFinite(existing.count))
            ? Math.max(0, Math.round(existing.count))
            : undefined;
          const needsUpdate = !existing
            || typeof existing.rating !== 'number'
            || Number.isNaN(existing.rating)
            || Math.abs(existing.rating - rating) > 0.0005
            || (typeof normalizedCount === 'number' && existingCount !== normalizedCount);
          if (needsUpdate) {
            api.updateSnapshotEntry(entry.id, rating, normalizedCount);
          }
        });
      } catch {}
    }

    function resolveItemRating(target) {
      if (!target || !target.id) return;
      try {
        if (window.__ClipsouRatings && typeof window.__ClipsouRatings.resolveRatingValue === 'function') {
          const res = window.__ClipsouRatings.resolveRatingValue(target.id, target.rating, target.ratingCount);
          if (res && typeof res.rating === 'number' && !Number.isNaN(res.rating)) {
            target.rating = res.rating;
            if (typeof res.count === 'number' && Number.isFinite(res.count)) {
              target.ratingCount = res.count;
            }
          }
        }
      } catch {}
    }

    primeSnapshotFromItems(items);

    try {
      items.forEach(resolveItemRating);
    } catch {}

    (function primeRatingsFromPopups(){
      try {
        if (!window.__ClipsouRatings
          || typeof window.__ClipsouRatings.updateSnapshotEntry !== 'function'
          || typeof window.__ClipsouRatings.getSnapshotEntry !== 'function') return;
        document.querySelectorAll('.fiche-popup[id]').forEach((popup) => {
          const id = popup.getAttribute('id');
          if (!id) return;
          const starNode = popup.querySelector('.rating-genres .stars');
          if (!starNode) return;
          const text = starNode.textContent || '';
          const match = text.match(/([0-9]+(?:[\.,][0-9]+)?)/);
          if (!match) return;
          const rating = parseFloat(match[1].replace(',', '.'));
          if (!Number.isFinite(rating)) return;
          const existing = window.__ClipsouRatings.getSnapshotEntry(id);
          const existingCount = existing && typeof existing.count === 'number' && Number.isFinite(existing.count)
            ? existing.count
            : undefined;
          if (!existing || typeof existing.rating !== 'number' || Math.abs(existing.rating - rating) > 0.0005) {
            window.__ClipsouRatings.updateSnapshotEntry(id, rating, existingCount);
            const matchItem = items.find(it => it && it.id === id);
            if (matchItem) {
              matchItem.rating = rating;
              if (typeof existingCount === 'number') {
                matchItem.ratingCount = existingCount;
              }
            }
          }
        });
      } catch {}
    })();

    try {
      items.forEach(resolveItemRating);
    } catch {}

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

    // Favorites: storage helpers and UI sync
    const FAV_KEY = 'clipsou_favorites_v1';
    function readFavorites(){
      try { const raw = localStorage.getItem(FAV_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr.filter(Boolean) : []; } catch { return []; }
    }
    function saveFavorites(list){
      try { localStorage.setItem(FAV_KEY, JSON.stringify((list||[]).filter(Boolean))); } catch {}
    }
    function isFavorite(id){
      try { const set = new Set(readFavorites()); return set.has(String(id)); } catch { return false; }
    }
    function toggleFavorite(id){
      const sId = String(id);
      const list = readFavorites();
      const idx = list.indexOf(sId);
      if (idx >= 0) { list.splice(idx, 1); }
      else { list.unshift(sId); }
      saveFavorites(list);
      try { document.dispatchEvent(new CustomEvent('clipsou-favorites-changed', { detail: { id: sId, active: idx < 0 } })); } catch {}
      return idx < 0;
    }
    function makeFavButton(item){
      const btn = document.createElement('button');
      btn.className = 'fav-btn';
      const active = isFavorite(item.id);
      if (active) btn.classList.add('is-active');
      btn.setAttribute('type','button');
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.setAttribute('aria-label', active ? 'Retirer des favoris' : 'Ajouter aux favoris');
      // User-provided heart SVG adapted to use currentColor
      btn.innerHTML = (
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'
        + '<path class="heart" d="M2 9.1371C2 14 6.01943 16.5914 8.96173 18.9109C10 19.7294 11 20.5 12 20.5C13 20.5 14 19.7294 15.0383 18.9109C17.9806 16.5914 22 14 22 9.1371C22 4.27416 16.4998 0.825464 12 5.50063C7.50016 0.825464 2 4.27416 2 9.1371Z" fill="currentColor"></path>'
        + '</svg>'
      );
      btn.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        const nowActive = toggleFavorite(item.id);
        btn.classList.toggle('is-active', nowActive);
        btn.setAttribute('aria-pressed', nowActive ? 'true' : 'false');
        btn.setAttribute('aria-label', nowActive ? 'Retirer des favoris' : 'Ajouter aux favoris');
      });
      return btn;
    }

    const CLIPSOU_BADGE_SRC = 'images/clipsoustudio.webp';

    function isLocalAsset(url){
      if (!url) return false;
      const value = String(url).trim();
      if (!value) return false;
      return !/^(?:https?:|\/\/|data:|blob:)/i.test(value);
    }

    function isClipsouOwnedItem(item){
      if (!item) return false;
      return isLocalAsset(item.portraitImage) || isLocalAsset(item.landscapeImage) || isLocalAsset(item.image);
    }

    // Helper to create a card node from item
    function createCard(item) {
      const card = document.createElement('div'); card.className = 'card';
      if (item && item.id) card.setAttribute('data-item-id', item.id);
      const a = document.createElement('a'); a.setAttribute('href', `fiche.html?id=${item.id}`);
      const img = document.createElement('img');
      const primaryPortrait = optimizeCloudinaryUrlCard(item.portraitImage || '');
      const thumbs = primaryPortrait ? [primaryPortrait] : deriveThumbnail(item.image);
      let idx = 0;
      { const candidate = (thumbs && thumbs[0]) || optimizeCloudinaryUrlCard(item.image) || ''; if (candidate) img.dataset.src = candidate; }
      img.onerror = function () { if (idx < thumbs.length - 1) { idx += 1; this.src = thumbs[idx]; } else { this.onerror = null; try { this.removeAttribute('src'); } catch {} } };
      img.setAttribute('alt', `Affiche de ${item.title}`);
      img.setAttribute('loading', 'lazy'); img.setAttribute('decoding', 'async');
      const info = document.createElement('div');
      info.className = 'card-info';
      if (item && item.id) info.setAttribute('data-item-id', item.id);
      const itemType = item.type || 'film';
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
      
      const ratingInfo = (function(){
        try {
          if (window.__ClipsouRatings && typeof window.__ClipsouRatings.resolveRatingValue === 'function') {
            const res = window.__ClipsouRatings.resolveRatingValue(item.id, item.rating, item.ratingCount);
            if (res && typeof res.rating === 'number' && !Number.isNaN(res.rating)) {
              info.setAttribute('data-rating', String(window.__ClipsouRatings.format(res.rating)));
              if (typeof res.count === 'number' && Number.isFinite(res.count)) {
                info.dataset.ratingCount = String(res.count);
              }
              return res;
            }
          }
        } catch {}
        if (typeof item.rating === 'number' && !Number.isNaN(item.rating)) {
          info.setAttribute('data-rating', String(item.rating));
          if (typeof item.ratingCount === 'number' && Number.isFinite(item.ratingCount)) {
            info.dataset.ratingCount = String(item.ratingCount);
          }
          return { rating: item.rating, count: item.ratingCount };
        }
        return null;
      })();
      if (ratingInfo && typeof ratingInfo.rating === 'number' && !Number.isNaN(ratingInfo.rating)) {
        item.rating = ratingInfo.rating;
        if (typeof ratingInfo.count === 'number' && Number.isFinite(ratingInfo.count)) {
          item.ratingCount = ratingInfo.count;
        }
      }
      const hasCustomBadge = Boolean(item.studioBadge && String(item.studioBadge).trim());
      const isClipsouOwned = isClipsouOwnedItem(item);
      const badgeSrc = hasCustomBadge ? String(item.studioBadge).trim() : (isClipsouOwned ? CLIPSOU_BADGE_SRC : '');
      if (badgeSrc) info.setAttribute('data-studio-badge', badgeSrc);
      if (isClipsouOwned) info.setAttribute('data-clipsou-owned', '1');
      const media = document.createElement('div'); media.className = 'card-media';
      if (badgeSrc) {
        const badge = document.createElement('div'); badge.className = 'brand-badge';
        const logo = document.createElement('img');
        logo.src = badgeSrc;
        logo.alt = hasCustomBadge ? 'Studio' : 'Clipsou Studio';
        logo.setAttribute('loading', 'lazy');
        logo.setAttribute('decoding', 'async');
        try { logo.fetchPriority = 'low'; } catch {}
        badge.appendChild(logo);
        media.appendChild(badge);
      }
      media.appendChild(img); a.appendChild(media); a.appendChild(info); card.appendChild(a);
      // Favorite heart button inside info line to align with type/rating
      try { info.appendChild(makeFavButton(item)); } catch {}
      return card;
    }

    // Hydrate all existing cards with snapshot ratings if available
    (function hydrateExistingCardRatings(){
      try {
        if (!window.__ClipsouRatings || typeof window.__ClipsouRatings.readSnapshot !== 'function' || typeof window.__ClipsouRatings.format !== 'function') return;
        const snapshot = window.__ClipsouRatings.readSnapshot() || {};
        Object.keys(snapshot).forEach(id => {
          const entry = snapshot[id];
          if (!entry || typeof entry.rating !== 'number' || Number.isNaN(entry.rating)) return;
          window.__ClipsouRatings.applyRatingToCards(id, entry.rating, entry.count);
        });
      } catch {}
    })();

    (async function hydrateRatingsFromDataset(){
      try {
        if (!window.__ClipsouRatings
          || typeof window.__ClipsouRatings.updateSnapshotEntry !== 'function'
          || typeof window.__ClipsouRatings.getSnapshotEntry !== 'function') return;
        let isFile = false;
        try { isFile = (location && location.protocol === 'file:'); } catch {}
        if (isFile) return;
        const res = await fetch('data/ratings.json', { credentials: 'same-origin', cache: 'no-store' });
        if (!res || !res.ok) return;
        const payload = await res.json();
        if (!Array.isArray(payload)) return;
        payload.forEach((entry) => {
          if (!entry || !entry.id || !Array.isArray(entry.ratings)) return;
          const values = entry.ratings.map(Number).filter((n) => Number.isFinite(n));
          let total = values.reduce((sum, n) => sum + n, 0);
          let count = values.length;

          const baseFromRatings = (typeof entry.baseRating === 'number' && !Number.isNaN(entry.baseRating))
            ? entry.baseRating
            : null;
          const itemRef = itemsById.get(String(entry.id));
          const baseFromItem = (itemRef && typeof itemRef.rating === 'number' && !Number.isNaN(itemRef.rating))
            ? itemRef.rating
            : null;
          const effectiveBase = baseFromRatings !== null ? baseFromRatings : baseFromItem;
          if (effectiveBase !== null) {
            total += effectiveBase;
            count += 1;
          }

          if (count <= 0) return;

          const average = total / count;
          const normalized = Math.round(average * 1000) / 1000;
          const existing = window.__ClipsouRatings.getSnapshotEntry(entry.id);
          if (existing && typeof existing.rating === 'number') {
            const sameRating = Math.abs((existing.rating || 0) - normalized) < 0.0005;
            const sameCount = typeof existing.count === 'number' ? existing.count === count : false;
            if (sameRating && sameCount) return;
          }
          window.__ClipsouRatings.updateSnapshotEntry(entry.id, average, count);
          if (itemRef) {
            itemRef.rating = average;
            itemRef.ratingCount = count;
          }
        });
      } catch {}
    })();

    // Build Favorites section (above Top Rated)
    function buildFavoritesSection(items){
      try {
        const rail = document.querySelector('#favorites .rail');
        const sec = document.getElementById('favorites');
        if (!rail || !sec) return;
        const favIds = readFavorites();
        if (!favIds.length) { rail.innerHTML = ''; sec.style.display = 'none'; return; }
        const byId = new Map((items||[]).map(it => [String(it.id), it]));
        const list = favIds.map(id => byId.get(String(id))).filter(Boolean);
        rail.innerHTML = '';
        list.forEach(it => rail.appendChild(createCard(it)));
        sec.style.display = '';
      } catch {}
    }

    // Sync heart buttons globally on favorites changes and rebuild favorites section
    document.addEventListener('clipsou-favorites-changed', function(e){
      try {
        const d = (e && e.detail) || {}; const targetId = String(d.id||''); const active = !!d.active;
        document.querySelectorAll('.card .fav-btn').forEach(btn => {
          const card = btn.closest('.card'); const link = card ? card.querySelector('a[href*="fiche.html?id="]') : null;
          const id = link ? (new URL(link.getAttribute('href'), location.href)).searchParams.get('id') : '';
          if (String(id||'') === targetId) { btn.classList.toggle('is-active', active); btn.setAttribute('aria-pressed', active ? 'true' : 'false'); btn.setAttribute('aria-label', active ? 'Retirer des favoris' : 'Ajouter aux favoris'); }
        });
      } catch {}
      try { buildFavoritesSection(items); } catch {}
    });

    // Hero disabled: ensure any existing hero is removed
    (function removeHero(){
      try {
        const hero = document.getElementById('home-hero');
        if (hero && hero.parentNode) hero.parentNode.removeChild(hero);
      } catch {}
    })();

    // Build Favorites first for strategic ordering
    buildFavoritesSection(items);

    // Ensure Favorites and Top Rated sections adopt modern styling
    try { const favSec = document.getElementById('favorites'); if (favSec) favSec.classList.add('modern'); } catch {}
    try { const trSec = document.getElementById('top-rated'); if (trSec) trSec.classList.add('modern'); } catch {}


    (function buildNouveautes(){
      try {
        function dateKey(it){
          const any = /** @type {any} */(it);
          if (any && any.addedAt) {
            const t = Date.parse(String(any.addedAt));
            if (!Number.isNaN(t)) return t;
          }
          const pick = it.landscapeImage || it.portraitImage || it.image || '';
          const m = String(pick).match(/\/v(\d{7,})\//);
          if (m) { const n = parseInt(m[1], 10); if (!Number.isNaN(n)) return n; }
          return 0;
        }
        const list = (items||[])
          .filter(it => !/trailer/i.test(it.title||''))
          .slice()
          .sort((a,b)=> dateKey(b) - dateKey(a))
          .slice(0, 6);
        let section = document.getElementById('nouveautes');
        if (!list.length) { if (section) section.remove(); return; }
        if (!section) {
          section = document.createElement('div'); section.className = 'section'; section.id = 'nouveautes';
          section.classList.add('modern');
          const h2 = document.createElement('h2');
          const sub = document.createElement('div'); sub.className = 'genre-subtitle'; sub.setAttribute('data-i18n', 'home.nouveautes.subtitle'); sub.textContent = window.i18n ? window.i18n.translate('home.nouveautes.subtitle') : 'Les derniers ajouts';
          h2.className = 'genre-hero-title'; h2.setAttribute('data-i18n', 'home.nouveautes.title'); h2.textContent = window.i18n ? window.i18n.translate('home.nouveautes.title') : 'Nouveautés';
          const rail = document.createElement('div'); rail.className = 'rail';
          section.appendChild(sub); section.appendChild(h2); section.appendChild(rail);
          // Insert right after the hero and before Top Rated
          const container = document.querySelector('main') || document.body;
          const topRatedSec = document.getElementById('top-rated');
          if (container) {
            if (topRatedSec && topRatedSec.parentNode === container) container.insertBefore(section, topRatedSec);
            else container.appendChild(section);
          }
        }
        const rail = section.querySelector('.rail');
        if (rail) {
          rail.innerHTML = '';
          list.forEach(it => { try { rail.appendChild(createCard(it)); } catch {} });
        }
        try { ensureSectionSeeAll(section, '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="#ffffff" width="20" height="20" style="vertical-align: middle; margin-right: 12px;"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>new-star</title> <g id="Layer_2" data-name="Layer 2"> <g id="invisible_box" data-name="invisible box"> <rect width="48" height="48" fill="none"></rect> </g> <g id="icons_Q2" data-name="icons Q2"> <path d="M42.3,24l3.4-5.1a2,2,0,0,0,.2-1.7A1.8,1.8,0,0,0,44.7,16l-5.9-2.4-.5-5.9a2.1,2.1,0,0,0-.7-1.5,2,2,0,0,0-1.7-.3L29.6,7.2,25.5,2.6a2.2,2.2,0,0,0-3,0L18.4,7.2,12.1,5.9a2,2,0,0,0-1.7.3,2.1,2.1,0,0,0-.7,1.5l-.5,5.9L3.3,16a1.8,1.8,0,0,0-1.2,1.2,2,2,0,0,0,.2,1.7L5.7,24,2.3,29.1a2,2,0,0,0,1,2.9l5.9,2.4.5,5.9a2.1,2.1,0,0,0,.7,1.5,2,2,0,0,0,1.7.3l6.3-1.3,4.1,4.5a2,2,0,0,0,3,0l4.1-4.5,6.3,1.3a2,2,0,0,0,1.7-.3,2.1,2.1,0,0,0,.7-1.5l.5-5.9L44.7,32a2,2,0,0,0,1-2.9ZM18,31.1l-4.2-3.2L12.7,27h-.1l.6,1.4,1.7,4-2.1.8L9.3,24.6l2.1-.8L15.7,27l1.1.9h0a11.8,11.8,0,0,0-.6-1.3l-1.6-4.1,2.1-.9,3.5,8.6Zm3.3-1.3-3.5-8.7,6.6-2.6.7,1.8L20.7,22l.6,1.6L25.1,22l.7,1.7L22,25.2l.7,1.9,4.5-1.8.7,1.8Zm13.9-5.7-2.6-3.7-.9-1.5h-.1a14.7,14.7,0,0,1,.4,1.7l.8,4.5-2.1.9-5.9-7.7,2.2-.9,2.3,3.3,1.3,2h0a22.4,22.4,0,0,1-.4-2.3l-.7-4,2-.8L33.8,19,35,20.9h0s-.2-1.4-.4-2.4L34,14.6l2.1-.9,1.2,9.6Z"></path> </g> </g> </g></svg>Nouveautés', list, createCard); } catch {}

        // Swap positions of 'Nouveautés' and 'Favoris' on the homepage
        (function swapSections(){
          try {
            const parent = document.querySelector('main') || document.body;
            const fav = document.getElementById('favorites');
            const nouv = document.getElementById('nouveautes');
            if (!parent || !fav || !nouv) return;
            const cw = document.getElementById('continue-watching');
            const topRatedSec = document.getElementById('top-rated');
            // Put 'Nouveautés' where 'Favoris' used to be: right after Continue Watching if present
            if (cw && cw.parentNode === parent) {
              const ref = cw.nextSibling; // may be null
              parent.insertBefore(nouv, ref);
            } else {
              parent.insertBefore(nouv, fav);
            }
            // Move 'Favoris' to where 'Nouveautés' used to be: just before Top Rated
            if (topRatedSec && topRatedSec.parentNode === parent) {
              parent.insertBefore(fav, topRatedSec);
            }
          } catch {}
        })();
      } catch {}
    })();

    function rebuildTopRatedSection() {
      try {
        const rail = document.querySelector('#top-rated .rail');
        if (!rail) return;
        const sec = document.getElementById('top-rated');
        const prepared = items.map((it) => {
          const copy = { ...it };
          resolveItemRating(copy);
          return copy;
        });
        const sorted = prepared
          .filter(it => typeof it.rating === 'number' && it.rating >= 3.5)
          .sort((a, b) => {
            const ra = (typeof a.rating === 'number') ? a.rating : -Infinity;
            const rb = (typeof b.rating === 'number') ? b.rating : -Infinity;
            if (rb !== ra) return rb - ra;
            return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
          });
        rail.innerHTML = '';
        sorted.forEach(it => rail.appendChild(createCard({ ...it })));
      } catch {}
    }

    rebuildTopRatedSection();

    try {
      window.addEventListener('clipsou-rating-updated', (event) => {
        try {
          const detail = event && event.detail;
          if (detail && detail.id) {
            const target = items.find(it => String(it.id) === String(detail.id));
            if (target) {
              if (typeof detail.rating === 'number' && !Number.isNaN(detail.rating)) target.rating = detail.rating;
              if (typeof detail.count === 'number' && Number.isFinite(detail.count)) target.ratingCount = detail.count;
            }
          }
        } catch {}
        rebuildTopRatedSection();
      });
    } catch {}

    // Insert 'Séries' and selected Genre sections
    (function buildSeriesAndGenresOnHome(){
      try {
        const container = document.querySelector('main') || document.body;
        const heroEl = document.getElementById('hero-claim');
        // Maintain a tail insertion point so order remains: Series, then each genre
        let tailEl = (function(){
          if (heroEl) return heroEl.previousSibling || null;
          return (container && container.lastChild) || null;
        })();
        function insertSection(section){
          if (!section) return;
          const parent = (heroEl && heroEl.parentNode) || container;
          if (!parent) return;
          if (tailEl && tailEl.parentNode === parent) {
            // Insert after tail
            const ref = tailEl.nextSibling; // may be null to append
            parent.insertBefore(section, ref);
          } else if (heroEl && heroEl.parentNode) {
            heroEl.parentNode.insertBefore(section, heroEl);
          } else {
            parent.appendChild(section);
          }
          tailEl = section;
        }
        // NEW: Build "Parce que vous avez regardé (X)" section — Disabled per request
        (function buildBecauseYouWatched(){
          try {
            // Remove any existing section if present and do nothing
            const existing = document.getElementById('because-watched');
            if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
            return; // disabled
          } catch {}
        })();
        // Util helpers for genres
        const normalizeGenre = (name) => (name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        const PRETTY_MAP = { comedie:'Comédie', familial:'Familial', aventure:'Aventure', action:'Action', horreur:'Horreur' };
        
        // Helper pour obtenir les headers avec traduction
        const getGenreHeader = (key) => {
          if (!window.i18n) {
            // Fallback si i18n pas encore chargé
            const fallback = {
              comedie: { subtitle: 'Les films qui vont vous faire rire', title: 'Vous allez rire !!' },
              action:   { subtitle: 'Des scènes qui décoiffent',          title: 'Ça va bouger !' },
              horreur:  { subtitle: 'Âmes sensibles s\'abstenir',           title: 'Frissons garantis !' },
              aventure: { subtitle: 'Cap sur l\'évasion',                   title: 'Partez à l\'aventure !' },
              familial: { subtitle: 'À partager en famille',               title: 'Moments en famille !' }
            };
            return fallback[key];
          }
          
          // Utiliser les traductions i18n
          const subtitleKey = `genre.${key}.subtitle`;
          const titleKey = `genre.${key}.title`;
          const subtitle = window.i18n.translate(subtitleKey);
          const title = window.i18n.translate(titleKey);
          
          // Si la traduction existe (pas égale à la clé), retourner
          if (subtitle !== subtitleKey && title !== titleKey) {
            return { subtitle, title };
          }
          return null;
        };
        const pretty = (n)=> PRETTY_MAP[normalizeGenre(n)] || (n||'').charAt(0).toUpperCase() + (n||'').slice(1);
        const getIcon = (n) => {
          const icons = {
            familial: '<svg width="20" height="20" fill="#9C27B0" viewBox="0 0 98.666 98.666" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 12px;"><circle cx="49.332" cy="53.557" r="10.297"/><path d="M53.7,64.556h-8.737c-7.269,0-13.183,5.916-13.183,13.184v10.688l0.027,0.166l0.735,0.229 c6.937,2.168,12.965,2.892,17.927,2.892c9.688,0,15.303-2.764,15.65-2.938l0.688-0.351l0.071,0.002V77.739 C66.883,70.472,60.971,64.556,53.7,64.556z"/><circle cx="28.312" cy="23.563" r="16.611"/><path d="M70.35,40.174c9.174,0,16.609-7.44,16.609-16.613c0-9.17-7.438-16.609-16.609-16.609c-9.176,0-16.61,7.437-16.61,16.609 S61.174,40.174,70.35,40.174z"/><path d="M41.258,62.936c-2.637-2.274-4.314-5.632-4.314-9.378c0-4.594,2.519-8.604,6.243-10.743 c-2.425-0.965-5.061-1.511-7.826-1.511H21.266C9.54,41.303,0,50.847,0,62.571v17.241l0.043,0.269L1.23,80.45 c10.982,3.432,20.542,4.613,28.458,4.656v-7.367C29.688,70.595,34.623,64.599,41.258,62.936z"/><path d="M77.398,41.303H63.305c-2.765,0-5.398,0.546-7.824,1.511c3.727,2.139,6.246,6.147,6.246,10.743 c0,3.744-1.678,7.102-4.313,9.376c2.656,0.661,5.101,2.02,7.088,4.008c2.888,2.89,4.479,6.726,4.478,10.8v7.365 c7.916-0.043,17.477-1.225,28.457-4.656l1.187-0.369l0.044-0.269V62.571C98.664,50.847,89.124,41.303,77.398,41.303z"/></svg>',
            comedie: '<svg width="20" height="20" fill="#FFD700" viewBox="-8 0 512 512" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 12px;"><path d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm33.8 161.7l80-48c11.6-6.9 24 7.7 15.4 18L343.6 180l33.6 40.3c8.7 10.4-3.9 24.8-15.4 18l-80-48c-7.7-4.7-7.7-15.9 0-20.6zm-163-30c-8.6-10.3 3.8-24.9 15.4-18l80 48c7.8 4.7 7.8 15.9 0 20.6l-80 48c-11.5 6.8-24-7.6-15.4-18l33.6-40.3-33.6-40.3zM398.9 306C390 377 329.4 432 256 432h-16c-73.4 0-134-55-142.9-126-1.2-9.5 6.3-18 15.9-18h270c9.6 0 17.1 8.4 15.9 18z"/></svg>',
            aventure: '<svg width="20" height="20" viewBox="-1.6 -1.6 19.20 19.20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 12px;"><path d="M4 2L0 1V14L4 15V2Z" fill="#4CAF50"/><path d="M16 2L12 1V14L16 15V2Z" fill="#4CAF50"/><path d="M10 1L6 2V15L10 14V1Z" fill="#4CAF50"/></svg>',
            horreur: '<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 12px;"><path fill="#ffffff" d="M12,2 C16.9706,2 21,6.02944 21,11 L21,19.6207 C21,21.4506 19.0341,22.6074 17.4345,21.7187 L17.0720446,21.5243825 C16.0728067,21.0124062 15.2881947,20.8437981 14.1830599,21.4100628 L13.9846,21.5177 C12.8231222,22.1813611 11.4120698,22.2182312 10.2228615,21.6283102 L10.0154,21.5177 C8.73821,20.7879 7.84896,21.0056 6.56554,21.7187 C4.96587,22.6074 3,21.4506 3,19.6207 L3,11 C3,6.02944 7.02944,2 12,2 Z M8.5,9 C7.67157,9 7,9.67157 7,10.5 C7,11.3284 7.67157,12 8.5,12 C9.32843,12 10,11.3284 10,10.5 C10,9.67157 9.32843,9 8.5,9 Z M15.5,9 C14.6716,9 14,9.67157 14,10.5 C14,11.3284 14.6716,12 15.5,12 C16.3284,12 17,11.3284 17,10.5 C17,9.67157 16.3284,9 15.5,9 Z"/></svg>',
            action: '<svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 12px;"><path fill="#FF9800" d="M59.395 20.285l109.447 137.043L18.89 98.084 143.737 246.75 36.975 338.582l137.287-12.72-31.457 160.187 112.27-115.142 83.08 101.588-8.58-127.873 165.988-22.76-141.383-74.597 141.04-56.778v-67.236L388.605 189.18l106.5-128.567L292.05 160.55 240.98 40.616l-53.037 90.26L126.63 20.285H59.396zm280.996 0l-25.812 98.61 93.05-98.61H340.39zM219.8 169.29l35.042 59.308-72.737-30.795c4.267-16.433 18.46-27.994 37.696-28.512zm104.62 1.77c16.857 9.28 24.173 26.062 20.428 42.62l-18.866-8.112-35.28 17.522 15.986-26.145-11.715-6.8 29.447-19.086zm-65.5 18.872l24.332 4.218-11.7 37.862-12.632-42.08zm-16.12 58.87l-1.208 21.895 22.87 2.412-38.76 54.28c-34.81-3.42-53.307-34.73-38.737-71.263L242.8 248.8zm32.034 18.862l51.99 16.72c2.035 11.373-2.796 20.542-13.455 24.466l7.767 8.576c-4.758 13.162-16.607 18.498-31.276 12.222l-4.9-47.962-10.126-14.022zm-143.688 85.15L74.613 396.34l-26-15.01-24.95 43.213 43.216 24.95 21.698-37.585 42.568-59.094zm223.293 10.32l85.85 81.178 11.68 42.05 39.712-12.266-12.264-33.287 19.857-36.796-39.13 10.513-105.706-51.392z"/></svg>'
          };
          return icons[normalizeGenre(n)] || '';
        };
        const slug = (t)=> (t||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
        // Build Series
        (function buildSeries(){
          const list = (items||[]).filter(it => {
            const t = String(it.type||'').toLowerCase();
            return t === 'série' || t === 'serie';
          });
          let section = document.getElementById('series');
          if (!list.length) { if (section) section.remove(); return; }
          if (!section) {
            section = document.createElement('div'); section.className = 'section'; section.id = 'series';
            // Add subtitle for Series
            const sub = document.createElement('div');
            sub.className = 'genre-subtitle';
            sub.setAttribute('data-i18n', 'home.series.subtitle');
            sub.textContent = window.i18n ? window.i18n.translate('home.series.subtitle') : 'Lot de séries amateures';
            section.appendChild(sub);
            // Add main title with icon
            const h2 = document.createElement('h2');
            h2.classList.add('genre-hero-title');
            h2.setAttribute('data-i18n', 'home.series.title');
            h2.textContent = window.i18n ? window.i18n.translate('home.series.title') : '📺 Séries amateures';
            const rail = document.createElement('div'); rail.className = 'rail';
            section.appendChild(h2); section.appendChild(rail);
            insertSection(section);
          } else {
            // Update existing section header
            let sub = section.querySelector(':scope > .genre-subtitle');
            if (!sub) {
              sub = document.createElement('div');
              sub.className = 'genre-subtitle';
              const h2 = section.querySelector(':scope > h2');
              if (h2) section.insertBefore(sub, h2);
            }
            sub.setAttribute('data-i18n', 'home.series.subtitle');
            sub.textContent = window.i18n ? window.i18n.translate('home.series.subtitle') : 'Lot de séries amateures';
            const h2 = section.querySelector(':scope > h2');
            if (h2) {
              h2.classList.add('genre-hero-title');
              h2.setAttribute('data-i18n', 'home.series.title');
              h2.textContent = window.i18n ? window.i18n.translate('home.series.title') : '📺 Séries amateures';
            }
          }
          const rail = section.querySelector('.rail');
          rail.innerHTML = '';
          const sorted = list.slice().sort((a, b) => {
            const ra = (typeof a.rating === 'number') ? a.rating : -Infinity;
            const rb = (typeof b.rating === 'number') ? b.rating : -Infinity;
            if (rb !== ra) return rb - ra; return (a.title||'').localeCompare(b.title||'', 'fr', { sensitivity:'base' });
          });
          sorted.forEach(it => rail.appendChild(createCard(it)));
        })();
        // Build selected Genre sections
        const ALLOWED = ['Comédie','Familial','Aventure','Action','Horreur'];
        // Group by normalized genre
        const byGenre = new Map();
        (items||[]).forEach(it => {
          (it.genres||[]).forEach(g => {
            if (!g) return; const key = normalizeGenre(g);
            if (!byGenre.has(key)) byGenre.set(key, { name: pretty(g), list: [] });
            byGenre.get(key).list.push(it);
          });
        });
        ALLOWED.forEach(name => {
          const key = normalizeGenre(name);
          const entry = byGenre.get(key);
          const id = 'genre-' + slug(pretty(name));
          let section = document.getElementById(id);
          if (!entry || !entry.list || entry.list.length < 1) { if (section) section.remove(); return; }
          if (!section) {
            section = document.createElement('div'); section.className = 'section'; section.id = id;
            const h2 = document.createElement('h2');
            const header = getGenreHeader(key);
            if (header) {
              const sub = document.createElement('div');
              sub.className = 'genre-subtitle';
              sub.setAttribute('data-i18n', `genre.${key}.subtitle`);
              sub.textContent = header.subtitle;
              section.appendChild(sub);
              h2.classList.add('genre-hero-title');
              h2.setAttribute('data-i18n', `genre.${key}.title`);
              h2.textContent = header.title;
            } else {
              h2.textContent = pretty(name);
            }
            const rail = document.createElement('div'); rail.className = 'rail';
            section.appendChild(h2); section.appendChild(rail);
            insertSection(section);
          }
          const rail = section.querySelector('.rail');
          const h2 = section.querySelector('h2');
          if (h2) {
            const header = getGenreHeader(key);
            if (header) {
              let sub = section.querySelector(':scope > .genre-subtitle');
              if (!sub) {
                sub = document.createElement('div');
                sub.className = 'genre-subtitle';
                section.insertBefore(sub, h2);
              }
              sub.setAttribute('data-i18n', `genre.${key}.subtitle`);
              sub.textContent = header.subtitle;
              h2.classList.add('genre-hero-title');
              h2.setAttribute('data-i18n', `genre.${key}.title`);
              h2.textContent = header.title;
            } else {
              h2.classList.remove('genre-hero-title');
              h2.textContent = pretty(name);
              const sub = section.querySelector(':scope > .genre-subtitle');
              if (sub) sub.remove();
            }
          }
          const sorted = entry.list.slice().sort((a,b)=>{
            const ra = (typeof a.rating === 'number') ? a.rating : -Infinity;
            const rb = (typeof b.rating === 'number') ? b.rating : -Infinity;
            if (rb !== ra) return rb - ra; return (a.title||'').localeCompare(b.title||'', 'fr', { sensitivity:'base' });
          });
          rail.innerHTML = ''; const seen = new Set();
          sorted.forEach(it => { const href = `#${it.id}`; if (seen.has(href)) return; rail.appendChild(createCard(it)); seen.add(href); });
        });
        // Update Favorites header with custom subtitle and title
        (function setupFavoritesHeader(){
          try {
            const sec = document.getElementById('favorites');
            if (!sec) return;
            const h2 = sec.querySelector(':scope > h2');
            if (!h2) return;
            // Insert/Update subtitle
            let sub = sec.querySelector(':scope > .genre-subtitle');
            if (!sub) {
              sub = document.createElement('div');
              sub.className = 'genre-subtitle';
              sec.insertBefore(sub, h2);
            }
            sub.setAttribute('data-i18n', 'home.favorites.subtitle');
            sub.textContent = window.i18n ? window.i18n.translate('home.favorites.subtitle') : 'Vous avez mis en favoris';
            // Plain text title (no icon)
            h2.classList.add('genre-hero-title');
            h2.setAttribute('data-i18n', 'home.favorites.title');
            h2.textContent = window.i18n ? window.i18n.translate('home.favorites.title') : '❤️ Titres en favoris';
          } catch {}
        })();
        
        // Update Top Rated header with custom subtitle and title
        (function setupTopRatedHeader(){
          try {
            const sec = document.getElementById('top-rated');
            if (!sec) return;
            const h2 = sec.querySelector(':scope > h2');
            if (!h2) return;
            // Insert/Update subtitle
            let sub = sec.querySelector(':scope > .genre-subtitle');
            if (!sub) {
              sub = document.createElement('div');
              sub.className = 'genre-subtitle';
              sec.insertBefore(sub, h2);
            }
            sub.setAttribute('data-i18n', 'home.toprated.subtitle');
            sub.textContent = window.i18n ? window.i18n.translate('home.toprated.subtitle') : 'On les adore et vous ?';
            // Plain text title (no icon)
            h2.classList.add('genre-hero-title');
            h2.setAttribute('data-i18n', 'home.toprated.title');
            h2.textContent = window.i18n ? window.i18n.translate('home.toprated.title') : '⭐ Mieux notés';
          } catch {}
        })();
      } catch {}
    })();

    // Appliquer les traductions sur toutes les cartes créées
    if (window.i18n && typeof window.i18n.updateCardTypes === 'function') {
      const lang = window.i18n.getCurrentLanguage();
      window.i18n.updateCardTypes(lang);
    }

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
    // Strip any inline SVG icons found inside main section H2 titles
    (function stripSectionTitleIcons(){
      function emojiFor(section, h2){
        try {
          const sec = section || (h2 ? h2.closest('.section') : null);
          const id = (sec && sec.id) ? sec.id.toLowerCase() : '';
          const txt = (h2 && (h2.textContent||'').toLowerCase()) || '';
          // Known sections
          if (id === 'top-rated' || /mieux notés|mieux notes/.test(txt)) return '⭐';
          if (id === 'favorites' || /favoris/.test(txt)) return '❤️';
          if (id === 'series' || /séries|series/.test(txt)) return '📺';
          if (id === 'nouveautes' || /nouveautés|nouveautes/.test(txt)) return '✨';
          // Genre sections
          if (id.startsWith('genre-')) {
            const g = id.replace(/^genre-/, '');
            if (/comedie/.test(g)) return '😂';
            if (/familial/.test(g)) return '👥';
            if (/aventure/.test(g)) return '🗺️';
            if (/action/.test(g)) return '💥';
            if (/horreur/.test(g)) return '👻';
          }
          // Continue watching special case
          if (h2 && h2.parentElement && h2.parentElement.id === 'continue-watching') return '';
        } catch {}
        return '';
      }

      function applyOnce(root){
        try {
          (root || document).querySelectorAll('main .section > h2, #continue-watching > h2').forEach(h2 => {
            // Skip if already processed
            if (h2.dataset.emojiApplied === '1') return;
            
            // remove any inline SVGs inside titles
            h2.querySelectorAll('svg').forEach(svg => { try { svg.remove(); } catch {} });
            const sec = h2.closest('.section');
            const prefix = emojiFor(sec, h2);
            const t = h2.textContent || '';
            if (!prefix) return;
            // Avoid double prefixing
            if (t.trim().startsWith(prefix)) {
              h2.dataset.emojiApplied = '1';
              return;
            }
            h2.textContent = `${prefix} ${t.trim()}`;
            h2.dataset.emojiApplied = '1';
          });
        } catch {}
      }

      // Initial run
      applyOnce(document);
      // Re-apply on DOM changes (sections created later)
      try {
        const mo = new MutationObserver(muts => {
          for (const m of muts) {
            for (const n of m.addedNodes || []) {
              if (n && n.nodeType === 1) applyOnce(n);
            }
          }
        });
        mo.observe(document.body, { childList: true, subtree: true });
      } catch {}
      
      // Reset flags when language changes to allow re-applying emojis
      try {
        window.addEventListener('languageChanged', () => {
          document.querySelectorAll('main .section > h2, #continue-watching > h2').forEach(h2 => {
            delete h2.dataset.emojiApplied;
          });
          applyOnce(document);
        });
      } catch {}
    })();
    // Replace Discord icons in menu and footer with provided SVG (uses currentColor)
    (function patchDiscordIcons(){
      try {
        const NS = 'http://www.w3.org/2000/svg';
        const pathD = 'M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z';
        function buildIcon(){
          const svg = document.createElementNS(NS, 'svg');
          svg.setAttribute('viewBox','0 -28.5 256 256');
          svg.setAttribute('preserveAspectRatio','xMidYMid');
          svg.setAttribute('fill','currentColor');
          svg.setAttribute('width','16');
          svg.setAttribute('height','16');
          svg.style.marginRight = '0px';
          const g1 = document.createElementNS(NS,'g');
          const g2 = document.createElementNS(NS,'g');
          const g3 = document.createElementNS(NS,'g');
          const path = document.createElementNS(NS,'path');
          path.setAttribute('d', pathD);
          path.setAttribute('fill','currentColor');
          path.setAttribute('fill-rule','nonzero');
          g3.appendChild(path); g2.appendChild(g3); g1.appendChild(g2); svg.appendChild(g1);
          svg.setAttribute('aria-hidden','true');
          svg.setAttribute('focusable','false');
          return svg;
        }
        const selectors = [
          'nav a.button[href*="discord"]',
          'footer .footer-list a[href*="discord"]'
        ];
        document.querySelectorAll(selectors.join(',')).forEach(a => {
          try {
            a.querySelectorAll('svg').forEach(s => s.remove());
            const icon = buildIcon();
            try {
              const insideDrawer = !!a.closest('#app-drawer');
              const hasGap = !!(a.style && a.style.gap && a.style.gap !== '' && a.style.gap !== '0px');
              if (a.closest('nav') && !insideDrawer && !hasGap) {
                icon.style.marginRight = '6px';
              } else {
                icon.style.marginRight = '0px';
              }
            } catch {}
            a.insertBefore(icon, a.firstChild);
          } catch {}
        });
      } catch {}
    })();
    // ===== Lazy image loader (IO + rail-aware) =====
    (function installLazyImages(){
      try {
        const ATTR = 'data-src';
        const pending = new Set();

        function load(el){
          try {
            if (!el || !el.getAttribute) return;
            const src = el.getAttribute(ATTR);
            if (!src) return;
            // Add loaded class for smooth fade-in
            el.addEventListener('load', function onLoad() {
              el.classList.add('loaded');
              el.removeEventListener('load', onLoad);
            }, { once: true });
            // Handle errors gracefully
            el.addEventListener('error', function onError() {
              el.classList.add('loaded'); // Still fade in even on error
              el.removeEventListener('error', onError);
            }, { once: true });
            el.src = src;
            el.removeAttribute(ATTR);
            pending.delete(el);
          } catch {}
        }

        const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries)=>{
          entries.forEach(entry => {
            const el = entry.target;
            if (entry.isIntersecting || entry.intersectionRatio > 0) {
              try { io.unobserve(el); } catch {}
              load(el);
            }
          });
        }, { root: null, rootMargin: '360px 512px', threshold: 0.01 }) : null;

        function observe(el){
          if (!el || pending.has(el)) return;
          pending.add(el);
          if (io) io.observe(el); else load(el);
        }

        function scan(root){
          const scope = root || document;
          try { scope.querySelectorAll('img[data-src]').forEach(observe); } catch {}
        }

        // Initial scan
        scan(document);

        // Watch DOM mutations for dynamically added images
        try {
          const mo = new MutationObserver((mutations)=>{
            for (const m of mutations) {
              if (!m || !m.addedNodes) continue;
              m.addedNodes.forEach(node => {
                try {
                  if (node && node.nodeType === 1) {
                    if (node.matches && node.matches('img[data-src]')) observe(node);
                    else if (node.querySelectorAll) scan(node);
                  }
                } catch {}
              });
            }
          });
          mo.observe(document, { childList: true, subtree: true });
        } catch {}

        // Preload a few upcoming images on rail arrow clicks
        document.addEventListener('click', function(e){
          try {
            const btn = e.target && (e.target.closest ? e.target.closest('.rail-arrow') : null);
            if (!btn) return;
            const sec = btn.closest('.section, #continue-watching');
            const rail = sec ? sec.querySelector('.rail') : null;
            if (!rail) return;
            const imgs = Array.from(rail.querySelectorAll('img[data-src]'));
            if (!imgs.length) return;
            const dir = btn.classList.contains('next') ? 1 : -1;
            const viewportStart = rail.scrollLeft;
            const viewportEnd = viewportStart + rail.clientWidth;
            const candidates = imgs
              .map(img => ({ img, left: (img.closest('.card') || img).offsetLeft }))
              .filter(entry => dir > 0 ? entry.left >= viewportEnd : entry.left <= viewportStart - 1)
              .sort((a,b) => dir > 0 ? a.left - b.left : b.left - a.left)
              .slice(0, 6);
            candidates.forEach(entry => load(entry.img));
          } catch {}
        }, true);

        // Fallback for browsers without IO
        if (!io) {
          let rafId = 0;
          const tick = () => { rafId = 0; scan(document); };
          const schedule = () => { if (!rafId) rafId = requestAnimationFrame(tick); };
          window.addEventListener('scroll', schedule, { passive: true });
          window.addEventListener('resize', schedule);
        }
      } catch {}
    })();

    // Category sections removed per request (LEGO, Minecraft, Live-action)

    // Build carousel with 5 random films/séries (exclude trailers)
    (function buildRandomCarousel() {
      const container = document.querySelector('.carousel-container'); if (!container) return;
      const slidesTrack = container.querySelector('.carousel-slides'); const indicatorsWrap = container.querySelector('.carousel-indicators'); if (!slidesTrack || !indicatorsWrap) return;
      const pool = items.filter(it => { const t = (it.type || '').toLowerCase(); return t === 'film' || t === 'série' || t === 'serie'; }); if (pool.length === 0) return;
      // Filter out items rated below 3 stars
      const rated = pool.filter(it => {
        const r = typeof it.rating === 'number' ? it.rating : parseFloat(it.rating);
        return !Number.isNaN(r) && r >= 3;
      });
      // If no item meets the threshold, clear and hide the carousel
      if (!rated.length) { slidesTrack.innerHTML = ''; indicatorsWrap.innerHTML = ''; try { container.style.display = 'none'; } catch {} return; }
      const base = rated;
      const arr = base.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      const chosen = arr.slice(0, Math.min(5, arr.length)); slidesTrack.innerHTML = ''; indicatorsWrap.innerHTML = '';

      // Preload ALL carousel images so slide switches feel instant
      try {
        const head = document.head || document.getElementsByTagName('head')[0];
        if (head && chosen.length) {
          const seen = new Set();
          chosen.forEach(function(it){
            try {
              const primary = it.landscapeImage || (it.image || '');
              const backs = primary ? [primary, ...deriveBackgrounds(primary)] : deriveBackgrounds(it.image || '');
              const href = backs[0] || primary;
              if (href && !seen.has(href) && !head.querySelector('link[rel="preload"][as="image"][href="' + href + '"]')) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'image';
                link.href = href;
                head.appendChild(link);
                seen.add(href);
              }
            } catch {}
          });
        }
      } catch {}
      chosen.forEach((it, idx) => {
        const slide = document.createElement('div'); slide.className = 'carousel-slide';
        const bg = document.createElement('img');
        bg.setAttribute('alt', '');
        bg.setAttribute('aria-hidden', 'true');
        bg.decoding = 'async';
        // Force eager for all carousel backgrounds so they are ready instantly
        bg.loading = 'eager';
        try { bg.fetchPriority = (idx === 0 ? 'high' : 'low'); } catch {}
        Object.assign(bg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', zIndex: '0', opacity: '0' }); if ((it.baseName || '').toLowerCase() === 'bac') { bg.style.objectPosition = 'top center'; }
        const primaryBg = optimizeCloudinaryUrl(it.landscapeImage || (it.image || ''));
        const backs = primaryBg ? [primaryBg, ...deriveBackgrounds(primaryBg)] : deriveBackgrounds(optimizeCloudinaryUrl(it.image || ''));
        let bIdx = 0;
        // Reveal image once loaded
        bg.addEventListener('load', function(){ try { bg.classList.add('is-loaded'); bg.style.opacity = '1'; } catch{} }, { once: true });
        bg.onerror = function () { if (bIdx < backs.length - 1) { bIdx += 1; this.src = backs[bIdx]; } };
        // Load source immediately for every slide (no data-src/lazy here)
        bg.src = backs[bIdx] || (it.image || '');
        try { if (typeof bg.decode === 'function') bg.decode().catch(function(){}); } catch {}
        const content = document.createElement('div'); content.className = 'carousel-content';
        const h2 = document.createElement('h2'); h2.className = 'carousel-title'; h2.textContent = it.title || '';
        const genresWrap = document.createElement('div'); genresWrap.className = 'carousel-genres'; if (typeof it.rating === 'number' && !Number.isNaN(it.rating)) { const ratingSpan = document.createElement('span'); ratingSpan.className = 'carousel-rating'; const rounded = Math.round(it.rating * 2) / 2; let txt = rounded.toFixed(1); if (txt.endsWith('.0')) txt = String(Math.round(rounded)); const star = document.createElement('span'); star.className = 'star'; star.textContent = '★'; star.setAttribute('aria-hidden', 'true'); ratingSpan.appendChild(star); ratingSpan.appendChild(document.createTextNode(`${txt}/5`)); ratingSpan.setAttribute('aria-label', `Note ${txt} sur 5`); ratingSpan.setAttribute('data-rating', String(it.rating)); genresWrap.appendChild(ratingSpan); } (it.genres || []).slice(0, 3).forEach(g => { const tag = document.createElement('span'); tag.className = 'carousel-genre-tag'; const translatedGenre = window.i18n ? window.i18n.translateGenre(g) : g; tag.textContent = translatedGenre; tag.setAttribute('data-original-genre', g); genresWrap.appendChild(tag); });
        const p = document.createElement('p'); p.className = 'carousel-description'; p.textContent = it.description || ''; if (it.description) { p.setAttribute('data-original-text', it.description); if (window.i18n) { const lang = window.i18n.getCurrentLanguage(); if (lang !== 'fr') { window.i18n.autoTranslate(it.description, lang).then(translated => { if (translated && p) p.textContent = translated; }).catch(() => {}); } } }
        const link = document.createElement('a'); link.className = 'carousel-btn'; link.href = `fiche.html?id=${it.id}`; link.setAttribute('data-i18n', 'button.view.details'); link.textContent = window.i18n ? window.i18n.translate('button.view.details') : 'Voir la fiche';
        content.appendChild(h2); content.appendChild(genresWrap); if (it.description) content.appendChild(p); content.appendChild(link);
        slide.appendChild(bg); slide.appendChild(content); slidesTrack.appendChild(slide);
        const dot = document.createElement('div'); dot.className = 'carousel-indicator' + (idx === 0 ? ' active' : ''); dot.setAttribute('role', 'button'); dot.setAttribute('tabindex', '0'); dot.setAttribute('aria-label', `Aller à la diapositive ${idx + 1}`); dot.setAttribute('data-index', String(idx)); if (idx === 0) dot.setAttribute('aria-current', 'true'); indicatorsWrap.appendChild(dot);
      });
      setupCarousel();
      
      // Reveal carousel now that it's built
      try {
        const carouselSection = document.querySelector('.carousel-section');
        if (carouselSection) {
          carouselSection.style.opacity = '1';
        }
      } catch {}
      
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

      // Determine preferred badge URL from data-studio-badge if present
      let desired = '';
      let markedClipsou = false;
      try {
        const info = a.querySelector('.card-info');
        desired = (info && info.getAttribute('data-studio-badge')) || '';
        markedClipsou = !!(info && info.getAttribute('data-clipsou-owned') === '1');
        if (!desired && markedClipsou && info) {
          desired = CLIPSOU_BADGE_SRC;
          info.setAttribute('data-studio-badge', desired);
        }
      } catch {}
      
      let badgeSrc = String(desired || '').trim();
      if (!badgeSrc) {
        const imgEl = media.querySelector('img');
        const candidate = (imgEl && (imgEl.getAttribute('data-src') || imgEl.getAttribute('src'))) || '';
        if (isLocalAsset(candidate)) {
          badgeSrc = CLIPSOU_BADGE_SRC;
          try {
            const info = a.querySelector('.card-info');
            if (info) {
              info.setAttribute('data-studio-badge', badgeSrc);
              info.setAttribute('data-clipsou-owned', '1');
            }
          } catch {}
        }
      }
      
      const shouldShowBadge = Boolean(badgeSrc);
      let badge = media.querySelector('.brand-badge');
      
      if (shouldShowBadge) {
        // Créer ou mettre à jour le badge
        if (!badge) { 
          badge = document.createElement('div'); 
          badge.className = 'brand-badge'; 
          const logo = document.createElement('img'); 
          logo.setAttribute('loading', 'lazy'); 
          logo.setAttribute('decoding', 'async'); 
          try { logo.fetchPriority = 'low'; } catch {} 
          badge.appendChild(logo); 
          media.appendChild(badge); 
        }
        const logo = badge.querySelector('img');
        try { if (logo) logo.fetchPriority = 'low'; } catch {}
        if (logo && logo.src !== badgeSrc) { 
          logo.src = badgeSrc; 
          logo.alt = (badgeSrc === CLIPSOU_BADGE_SRC) ? 'Clipsou Studio' : 'Studio'; 
        }
      } else {
        // Supprimer le badge s'il existe
        if (badge) {
          badge.remove();
        }
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
      // Force-close drawer immediately to avoid any background menu
      try {
        const drawer = document.getElementById('app-drawer');
        const overlay = document.getElementById('drawer-overlay');
        if (drawer) drawer.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        if (drawer) drawer.setAttribute('aria-hidden','true');
        if (overlay) overlay.setAttribute('aria-hidden','true');
        document.body.classList.remove('drawer-open');
        document.documentElement.classList.remove('drawer-open');
      } catch {}
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
        // Keep the drawer closed while a popup is open (no background menu)
        try {
          const drawer = document.getElementById('app-drawer');
          const overlay = document.getElementById('drawer-overlay');
          if (drawer) drawer.classList.remove('open');
          if (overlay) overlay.classList.remove('open');
          drawerAutoOpened = false;
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
        // Always force-close drawer if a popup is targeted
        if (isPopup) {
          try {
            const drawer = document.getElementById('app-drawer');
            const overlay = document.getElementById('drawer-overlay');
            if (drawer) drawer.classList.remove('open');
            if (overlay) overlay.classList.remove('open');
            if (drawer) drawer.setAttribute('aria-hidden','true');
            if (overlay) overlay.setAttribute('aria-hidden','true');
            document.body.classList.remove('drawer-open');
            document.documentElement.classList.remove('drawer-open');
          } catch {}
        }
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
        titleEl.setAttribute('data-i18n', 'player.title');
        const closeBtn = document.createElement('button');
        closeBtn.className = 'player-close';
        closeBtn.setAttribute('data-i18n-aria', 'player.close');
        top.appendChild(titleEl);
        top.appendChild(closeBtn);
        const stage = document.createElement('div');
        stage.className = 'player-stage';
        shell.appendChild(top);
        shell.appendChild(stage);
        overlay.appendChild(shell);
        document.body.appendChild(overlay);
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
        intro.src = 'images/intro.mp4';
        intro.autoplay = true;
        intro.playsInline = true;
        intro.controls = false;
        intro.preload = 'auto';
        try { intro.muted = false; intro.defaultMuted = false; intro.volume = 1.0; } catch {}
        Object.assign(intro.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
        const skip = document.createElement('button');
        skip.setAttribute('data-i18n', 'player.skip');
        skip.textContent = window.i18n ? window.i18n.translate('player.skip') : 'Passer l\'intro';
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

      document.addEventListener('click', function(e){
        try {
          const a = e.target && (e.target.closest ? e.target.closest('a') : null);
          if (!a) return;
          const href = a.getAttribute('href') || '';
          if (!isYouTubeUrl(href)) return;
          // Allow normal behavior for links meant to open in a new tab
          if ((a.getAttribute('target')||'').toLowerCase() === '_blank') return;
          // Do not intercept channel links in the YouTube popup (#youtube)
          try { if (a.closest('#youtube')) return; } catch {}
          // Allow modifier clicks (open in new tab via Ctrl/Cmd, middle click)
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || (e.button && e.button !== 0)) return;
          e.preventDefault();
          const title = (a.closest('.fiche-right')?.querySelector('h3')?.textContent || a.getAttribute('data-title') || '').trim();
          showIntroThenPlay(href, title);
        } catch {}
      }, true);
    } catch {}
  })();

  // Smooth scroll for the blue back-to-top button in the footer
  (function installSmoothBackToTop(){
    try {
      const btn = document.querySelector('.back-to-top-btn');
      if (!btn) return;
      btn.addEventListener('click', function(e){
        try { e.preventDefault(); } catch {}
        // Always scroll to the very top of the page
        try {
          const el = document.scrollingElement || document.documentElement || document.body;
          if (el && typeof el.scrollTo === 'function') {
            el.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          } else {
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          }
        } catch { try { window.scrollTo({ top: 0, left: 0, behavior: 'smooth' }); } catch {} }
      });
    } catch {}
  })();

  // Écouter le changement de langue pour mettre à jour les types des cartes
  window.addEventListener('languageChanged', function(e) {
    const lang = e.detail && e.detail.language;
    if (lang && window.i18n && typeof window.i18n.updateCardTypes === 'function') {
      window.i18n.updateCardTypes(lang);
    }
  });

});
