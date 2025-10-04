'use strict';

/**
 * Clipsou Streaming - Utilities Module
 * Fonctions utilitaires partagées entre toutes les pages
 */

// ===== Optimisation d'images =====

/**
 * Optimise les URLs Cloudinary pour de meilleures performances
 */
function optimizeCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') && !url.includes('cloudinary.com')) return url;
  
  const optimized = 'f_auto,q_auto:best,dpr_auto,fl_progressive:steep,fl_lossy,w_auto:100:1920,c_limit';
  
  if (url.includes('/upload/f_auto,q_auto/')) {
    return url.replace('/upload/f_auto,q_auto/', '/upload/' + optimized + '/');
  } else if (url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/' + optimized + '/');
  }
  
  return url;
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
  const pending = new Set();
  
  function load(el) {
    try {
      if (!el || !el.getAttribute) return;
      const src = el.getAttribute(ATTR);
      if (!src) return;
      
      el.addEventListener('load', function onLoad() {
        el.classList.add('loaded');
        el.removeEventListener('load', onLoad);
      }, { once: true });
      
      el.addEventListener('error', function onError() {
        el.classList.add('loaded');
        el.removeEventListener('error', onError);
      }, { once: true });
      
      el.src = src;
      el.removeAttribute(ATTR);
      pending.delete(el);
    } catch (_) {}
  }
  
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting || entry.intersectionRatio > 0) {
        try { io.unobserve(el); } catch (_) {}
        load(el);
      }
    });
  }, { root: null, rootMargin: '600px 800px', threshold: 0.01 }) : null;
  
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
    normalizeTitleKey,
    normalizeStr,
    deriveExts,
    prependLandscapeVariants,
    applyCwCacheBuster,
    isValidImageLike,
    preferBetter,
    dedupeByIdAndTitle,
    debounce,
    throttle,
    EventManager,
    installLazyImageLoader
  };
}
