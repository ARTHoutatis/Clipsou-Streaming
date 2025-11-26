'use strict';

/**
 * Clipsou Streaming - Utilities Module
 * Fonctions utilitaires partagées entre toutes les pages
 */

// ===== Optimisation d'images =====

/**
 * Optimise les URLs Cloudinary pour de meilleures performances
 * Utilisé pour : carousel, grandes images, images générales
 */
function optimizeCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') && !url.includes('cloudinary.com')) return url;
  
  // Si l'URL a déjà des transformations, ne pas les modifier
  if (/\/upload\/[^\/]*(?:f_auto|q_auto|w_auto|dpr_auto)/.test(url)) {
    return url;
  }
  
  // Carousel et grandes images: meilleure qualité avec compression optimisée
  // Ajout de q_auto:good (au lieu de best) pour balance qualité/vitesse
  // Ajout de fetch_format pour conversion auto vers WebP/AVIF
  const optimized = 'f_auto,q_auto:good,dpr_auto,fl_progressive:steep,fl_lossy,w_auto:100:1920,c_limit,e_sharpen:80';
  
  if (url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/' + optimized + '/');
  }
  
  return url;
}

/**
 * Optimise les URLs Cloudinary pour les petites images
 * Utilisé pour : badges, images d'acteurs
 */
function optimizeCloudinaryUrlSmall(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') && !url.includes('cloudinary.com')) return url;
  
  // Si l'URL a déjà des transformations, ne pas les modifier
  if (/\/upload\/[^\/]*(?:f_auto|q_auto|w_auto|dpr_auto)/.test(url)) {
    return url;
  }
  
  // Badges et acteurs: qualité low pour minimiser le poids, max 600px
  const optimized = 'f_auto,q_auto:low,dpr_auto,fl_progressive:steep,fl_lossy,w_auto:100:600,c_limit';
  
  if (url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/' + optimized + '/');
  }
  
  return url;
}

/**
 * Optimise les URLs Cloudinary pour les cartes de films (500px)
 */
function optimizeCloudinaryUrlCard(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') && !url.includes('cloudinary.com')) return url;
  
  // Si l'URL a déjà des transformations (f_auto, q_auto, w_auto, etc.), ne pas les modifier
  if (/\/upload\/[^\/]*(?:f_auto|q_auto|w_auto|dpr_auto)/.test(url)) {
    return url;
  }
  
  // Cartes: qualité low pour réduire davantage la taille, max 500px
  const optimized = 'f_auto,q_auto:low,dpr_auto,fl_progressive:steep,fl_lossy,w_auto:100:500,c_limit,e_sharpen:50';
  
  if (url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/' + optimized + '/');
  }
  
  return url;
}

/**
 * Optimise les URLs Cloudinary pour Continue Watching (400px)
 */
function optimizeCloudinaryUrlContinue(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') && !url.includes('cloudinary.com')) return url;

  // Si l'URL a déjà des transformations, ne pas les modifier
  if (/\/upload\/[^\/]*(?:f_auto|q_auto|w_auto|dpr_auto)/.test(url)) {
    return url;
  }

  // Continue Watching: qualité low pour privilégier la vitesse, max 400px
  const optimized = 'f_auto,q_auto:low,dpr_auto,fl_progressive:steep,fl_lossy,w_auto:100:400,c_limit';

  if (url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/' + optimized + '/');
  }

  return url;
}

const CARD_IMAGE_SIZES_ATTR = '(max-width: 520px) 46vw, (max-width: 1024px) 24vw, 220px';

function getCardImageSizesAttr() {
  return CARD_IMAGE_SIZES_ATTR;
}

function buildCloudinarySrcSet(url, widths, options = {}) {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com') && !url.includes('cloudinary.com')) return '';
  if (!Array.isArray(widths) || widths.length === 0) return '';
  if (/\/upload\/[^\/]*(?:f_auto|q_auto|w_auto|dpr_auto)/.test(url)) return '';
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return '';
  const before = url.slice(0, uploadIndex + '/upload/'.length);
  const after = url.slice(uploadIndex + '/upload/'.length);
  const extraTransforms = Array.isArray(options.extraTransforms) && options.extraTransforms.length
    ? options.extraTransforms.slice()
    : ['fl_progressive:steep', 'fl_lossy'];
  return widths.map((rawWidth) => {
    const width = Math.max(1, Number(rawWidth) || 0);
    const transforms = [
      options.format || 'f_auto',
      options.quality || 'q_auto:low',
      options.dpr || 'dpr_auto',
      options.crop || 'c_limit',
      `w_${width}`,
      ...extraTransforms
    ].filter(Boolean);
    return `${before}${transforms.join(',')}/${after} ${width}w`;
  }).join(', ');
}

function buildCardImageSrcSet(url) {
  return buildCloudinarySrcSet(url, [220, 320, 420, 520], {
    quality: 'q_auto:low',
    extraTransforms: ['fl_progressive:steep', 'fl_lossy', 'e_sharpen:40']
  });
}

// ===== Normalisation de texte =====

/**
 * Normalise une chaîne en supprimant les accents, espaces et caractères spéciaux
 */
function normalizeTitleKey(str) {
  try {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  } catch (_) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
  }
}

/**
 * Normalise une chaîne en supprimant uniquement les accents
 */
function normalizeStr(str) {
  try {
    return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (_) {
    return String(str || '');
  }
}

// ===== Gestion des images avec extensions multiples =====

/**
 * Dérive les extensions possibles pour une image
 */
function deriveExts(src) {
  try {
    const m = (src || '').match(/^(.*?)(\d+)?\.(webp|jpg|jpeg|png)$/i);
    if (!m) return [];
    const base = m[1];
    return [base + '.webp', base + '.jpg', base + '.jpeg'];
  } catch (_) {
    return [];
  }
}

/**
 * Ajoute des variantes landscape au début d'une liste
 */
function prependLandscapeVariants(list, src) {
  const m = (src || '').match(/^(.*?)(\.(?:webp|jpg|jpeg|png))$/i);
  if (!m) return;
  const base = m[1];
  if (/1$/i.test(base)) return;
  list.unshift(base + '1.webp');
}

// ===== Notes & évaluations (helpers partagés) =====

const RATING_SNAPSHOT_KEY = 'clipsou_rating_snapshot_v1';
let ratingSnapshotCache = null;

function formatRatingForDisplay(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  const rounded = Math.round(num * 2) / 2;
  let txt = rounded.toFixed(1);
  if (txt.endsWith('.0')) txt = String(Math.round(rounded));
  return txt;
}

function readRatingSnapshot() {
  if (ratingSnapshotCache && typeof ratingSnapshotCache === 'object') return ratingSnapshotCache;
  try {
    const raw = localStorage.getItem(RATING_SNAPSHOT_KEY);
    if (!raw) {
      ratingSnapshotCache = {};
      return ratingSnapshotCache;
    }
    const parsed = JSON.parse(raw);
    ratingSnapshotCache = (parsed && typeof parsed === 'object') ? parsed : {};
    return ratingSnapshotCache;
  } catch {
    ratingSnapshotCache = {};
    return ratingSnapshotCache;
  }
}

function writeRatingSnapshot(map) {
  try {
    const payload = map && typeof map === 'object' ? map : {};
    localStorage.setItem(RATING_SNAPSHOT_KEY, JSON.stringify(payload));
    ratingSnapshotCache = payload;
  } catch {}
}

function getRatingSnapshotEntry(id) {
  if (!id) return null;
  const map = readRatingSnapshot();
  const entry = map && map[id];
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.rating !== 'number' || Number.isNaN(entry.rating)) return null;
  return entry;
}

function updateRatingSnapshotEntry(id, rating, count) {
  if (!id || typeof rating !== 'number' || Number.isNaN(rating)) return;
  const map = readRatingSnapshot();
  const normalizedRating = Math.round(rating * 1000) / 1000;
  const normalizedCount = (typeof count === 'number' && Number.isFinite(count)) ? Math.max(0, Math.round(count)) : undefined;
  map[id] = {
    rating: normalizedRating,
    count: normalizedCount,
    updatedAt: Date.now()
  };
  writeRatingSnapshot(map);
  applyRatingToCards(id, normalizedRating, normalizedCount);
  try {
    window.dispatchEvent(new CustomEvent('clipsou-rating-updated', {
      detail: { id, rating: normalizedRating, count: normalizedCount }
    }));
  } catch {}
}

function applyRatingToCards(id, rating, count) {
  if (!id || typeof rating !== 'number' || Number.isNaN(rating)) return;
  const formatted = formatRatingForDisplay(rating);
  if (!formatted) return;
  let selector = `.card-info[data-item-id="${id}"]`;
  try {
    const safeId = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(String(id)) : String(id).replace(/["\\]/g, '\\$&');
    selector = `.card-info[data-item-id="${safeId}"]`;
  } catch {}
  try {
    document.querySelectorAll(selector).forEach((info) => {
      try {
        info.setAttribute('data-rating', formatted);
        if (typeof count === 'number' && Number.isFinite(count)) {
          info.dataset.ratingCount = String(count);
        }
      } catch {}
    });
  } catch {}
}

function resolveRatingValue(id, fallbackRating, fallbackCount) {
  const result = { rating: null, count: undefined };
  const hasFallbackRating = typeof fallbackRating === 'number' && !Number.isNaN(fallbackRating);
  if (hasFallbackRating) result.rating = fallbackRating;
  if (typeof fallbackCount === 'number' && Number.isFinite(fallbackCount)) {
    result.count = Math.max(0, Math.round(fallbackCount));
  }

  if (!id) return result;
  try {
    const entry = getRatingSnapshotEntry(id);
    if (entry && typeof entry.rating === 'number' && !Number.isNaN(entry.rating)) {
      result.rating = entry.rating;
      if (typeof entry.count === 'number' && Number.isFinite(entry.count)) {
        result.count = Math.max(0, Math.round(entry.count));
      }
    }
  } catch {}
  return result;
}

if (typeof window !== 'undefined') {
  window.__ClipsouRatings = window.__ClipsouRatings || {};
  Object.assign(window.__ClipsouRatings, {
    key: RATING_SNAPSHOT_KEY,
    format: formatRatingForDisplay,
    readSnapshot: readRatingSnapshot,
    getSnapshotEntry: getRatingSnapshotEntry,
    updateSnapshotEntry: updateRatingSnapshotEntry,
    applyRatingToCards,
    resolveRatingValue
  });
}

// ===== Live data sync (polling helper) =====

(function initClipsouLiveSync(){
  if (typeof window === 'undefined') return;
  if (window.ClipsouLiveSync) return; // Already initialized

  const watchers = new Map();
  let defaultsStarted = false;

  function normalizeUrl(rawUrl){
    try {
      return new URL(rawUrl, window.location.href).toString();
    } catch {
      return rawUrl;
    }
  }

  function computeSignature(payload){
    try {
      return JSON.stringify(payload);
    } catch {
      return String(payload);
    }
  }

  function dispatchLiveData(key, data){
    try {
      window.dispatchEvent(new CustomEvent('clipsou-live-data', {
        detail: {
          key,
          data,
          timestamp: Date.now()
        }
      }));
    } catch {}
  }

  function watchJson(key, url, options = {}){
    if (!key || !url) return { stop(){} };
    if (watchers.has(key)) {
      const existing = watchers.get(key);
      return { stop: existing.stop };
    }

    const resolvedUrl = normalizeUrl(url);
    const interval = Math.max(4000, Number(options.interval) || 15000);
    const fetchOptions = {
      cache: 'no-store',
      credentials: options.credentials || 'same-origin'
    };

    const state = {
      signature: null,
      timer: null,
      stopped: false
    };

    async function poll(){
      if (state.stopped) return;
      const bust = resolvedUrl.includes('?') ? '&' : '?';
      const target = resolvedUrl + bust + '_ts=' + Date.now();
      try {
        const res = await fetch(target, fetchOptions);
        if (!res || !res.ok) throw new Error('HTTP ' + (res && res.status));
        const data = await res.json();
        const signature = computeSignature(data);
        if (signature !== state.signature) {
          state.signature = signature;
          dispatchLiveData(key, data);
        }
      } catch (err) {
        console.warn('[LiveSync] Failed to fetch', key, err && err.message ? err.message : err);
      } finally {
        if (!state.stopped) {
          state.timer = setTimeout(poll, interval);
        }
      }
    }

    state.timer = setTimeout(poll, 0);

    function stop(){
      state.stopped = true;
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
      watchers.delete(key);
    }

    watchers.set(key, { stop });
    return { stop };
  }

  function stop(key){
    const watcher = watchers.get(key);
    if (watcher && typeof watcher.stop === 'function') {
      watcher.stop();
    }
  }

  function stopAll(){
    Array.from(watchers.keys()).forEach(stop);
  }

  function ensureDefaultSources(config = {}){
    if (defaultsStarted) return;
    defaultsStarted = true;
    const cfg = window.ClipsouConfig || {};
    const approvedUrl = config.approvedUrl || cfg.publicApprovedUrl || '/data/approved.json';
    const ratingsUrl = config.ratingsUrl || '/data/ratings.json';
    watchJson('approved', approvedUrl, { interval: Math.max(8000, config.approvedInterval || 12000) });
    watchJson('ratings', ratingsUrl, { interval: Math.max(10000, config.ratingsInterval || 20000) });
  }

  window.ClipsouLiveSync = {
    watchJson,
    stop,
    stopAll,
    ensureDefaultSources
  };
})();

// ===== Cache busting =====

/**
 * Applique un cache buster aux URLs
 */
function applyCwCacheBuster(src) {
  if (!src) return '';
  if (/^(data:|https?:)/i.test(src)) return src;
  const v = (window.__cw_ver || (window.__cw_ver = Date.now())) + '';
  return src + (src.includes('?') ? '&' : '?') + 'cw=' + v;
}

// ===== Validation =====

/**
 * Vérifie si une URL ressemble à une image valide
 */
function isValidImageLike(url) {
  if (!url) return false;
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return true;
  return /(\.png|\.jpe?g|\.webp)$/i.test(u);
}

// ===== Déduplication =====

/**
 * Choisit le meilleur élément entre deux doublons
 */
function preferBetter(a, b) {
  const score = (x) => {
    let s = 0;
    if (x && x.image) s += 3;
    if (typeof x.rating === 'number') s += 1;
    if (Array.isArray(x.genres) && x.genres.length) s += 1;
    if (x && x.studioBadge) s += 4;
    if (x && /^https?:\/\//i.test(x.image || '')) s += 1;
    return s;
  };
  return score(a) >= score(b) ? a : b;
}

/**
 * Déduplique un tableau d'éléments par ID et titre
 */
function dedupeByIdAndTitle(list) {
  const byId = new Map();
  const byTitle = new Map();
  
  for (const it of list) {
    if (!it) continue;
    const id = it.id || '';
    const key = normalizeTitleKey(it.title || '');
    
    if (id) {
      const chosen = byId.has(id) ? preferBetter(byId.get(id), it) : it;
      const prev = byId.get(id) || {};
      const merged = {
        ...chosen,
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
  
  const out = new Map();
  byTitle.forEach((v, k) => out.set(k, v));
  byId.forEach((v) => {
    const k = normalizeTitleKey(v.title || '');
    if (!out.has(k)) {
      out.set(k, v);
    } else {
      const chosen = preferBetter(out.get(k), v);
      const other = chosen === out.get(k) ? v : out.get(k);
      const merged = { ...chosen };
      if (!merged.studioBadge && other && other.studioBadge) merged.studioBadge = other.studioBadge;
      out.set(k, merged);
    }
  });
  
  return Array.from(out.values());
}

// ===== Debounce & Throttle =====

/**
 * Crée une fonction debounced
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Crée une fonction throttled
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ===== Gestion des événements =====

/**
 * Gestionnaire d'événements avec nettoyage automatique
 */
class EventManager {
  constructor() {
    this.listeners = [];
  }
  
  add(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    this.listeners.push({ target, event, handler, options });
  }
  
  removeAll() {
    this.listeners.forEach(({ target, event, handler, options }) => {
      try {
        target.removeEventListener(event, handler, options);
      } catch (_) {}
    });
    this.listeners = [];
  }
}

// ===== Lazy Loading optimisé =====

/**
 * Install un système de lazy loading pour les images
 */
function installLazyImageLoader() {
  const ATTR = 'data-src';
  const ATTR_SRCSET = 'data-srcset';
  const ATTR_SIZES = 'data-sizes';
  const pending = new Set();
  const failed = new WeakSet();
  const retryDelay = 2000; // 2 secondes avant retry
  
  function hydrateResponsiveAttributes(el) {
    try {
      const dataSrcset = el.getAttribute(ATTR_SRCSET);
      if (dataSrcset) {
        el.setAttribute('srcset', dataSrcset);
        el.removeAttribute(ATTR_SRCSET);
      }
      const dataSizes = el.getAttribute(ATTR_SIZES);
      if (dataSizes) {
        el.setAttribute('sizes', dataSizes);
        el.removeAttribute(ATTR_SIZES);
      }
    } catch (_) {}
  }

  function load(el) {
    try {
      if (!el || !el.getAttribute) return;
      const src = el.getAttribute(ATTR);
      if (!src) return;

      // Ajouter une transition fluide
      el.style.transition = 'opacity 0.3s ease-in-out';

      hydrateResponsiveAttributes(el);

      el.addEventListener('load', function onLoad() {
        el.classList.add('loaded');
        failed.delete(el); // Reset failed state on success
        el.removeEventListener('load', onLoad);
      }, { once: true });
      
      el.addEventListener('error', function onError() {
        el.removeEventListener('error', onError);
        
        // Retry une fois après délai si pas déjà tenté
        if (!failed.has(el)) {
          failed.add(el);
          setTimeout(() => {
            try {
              if (el && el.src !== src) {
                el.src = src; // Retry
              }
            } catch {}
          }, retryDelay);
        } else {
          // Échec définitif après retry
          el.classList.add('loaded');
          el.classList.add('failed');
        }
      }, { once: true });
      
      // Activer le décodage asynchrone pour éviter de bloquer le thread principal
      if ('decode' in el) {
        el.decode().then(() => {
          el.src = src;
        }).catch(() => {
          el.src = src; // Fallback si decode() échoue
        });
      } else {
        el.src = src;
      }
      
      el.removeAttribute(ATTR);
      pending.delete(el);
    } catch (_) {}
  }
  
  // Marges généreuses pour anticiper le scroll et éviter le chargement tardif
  // Vertical: 300px, Horizontal: 400px - balance entre performance et UX
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting || entry.intersectionRatio > 0) {
        try { io.unobserve(el); } catch (_) {}
        
        // Charger immédiatement les images above-the-fold (visible sans scroll)
        const rect = el.getBoundingClientRect();
        const isAboveFold = rect.top >= 0 && rect.top < window.innerHeight;
        
        if (isAboveFold) {
          // Priorité haute pour les images visibles
          el.loading = 'eager';
          load(el);
        } else {
          // Délai minimal pour les autres images
          setTimeout(() => load(el), 50);
        }
      }
    });
  }, { root: null, rootMargin: '300px 400px', threshold: 0.01 }) : null;
  
  function observe(el) {
    if (!el || pending.has(el)) return;
    pending.add(el);
    if (io) io.observe(el);
    else load(el);
  }
  
  function scan(root) {
    const scope = root || document;
    try {
      scope.querySelectorAll('img[data-src]').forEach(observe);
    } catch (_) {}
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan(document), { once: true });
  } else {
    scan(document);
  }
  
  try {
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (!m || !m.addedNodes) continue;
        m.addedNodes.forEach(node => {
          try {
            if (node && node.nodeType === 1) {
              if (node.matches && node.matches('img[data-src]')) observe(node);
              else if (node.querySelectorAll) scan(node);
            }
          } catch (_) {}
        });
      }
    });
    mo.observe(document, { childList: true, subtree: true });
  } catch (_) {}
  
  if (!io) {
    let rafId = 0;
    const tick = () => { rafId = 0; scan(document); };
    const schedule = () => { if (!rafId) rafId = requestAnimationFrame(tick); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
  }
}

// ===== Exports (si module) =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    optimizeCloudinaryUrl,
    optimizeCloudinaryUrlSmall,
    optimizeCloudinaryUrlCard,
    optimizeCloudinaryUrlContinue,
    normalizeTitleKey,
    normalizeStr,
    deriveExts,
    prependLandscapeVariants,
    applyCwCacheBuster,
    isValidImageLike,
    preferBetter,
    dedupeByIdAndTitle,
    formatRatingForDisplay,
    readRatingSnapshot,
    writeRatingSnapshot,
    getRatingSnapshotEntry,
    updateRatingSnapshotEntry,
    applyRatingToCards,
    debounce,
    throttle,
    EventManager,
    installLazyImageLoader
  };
}
