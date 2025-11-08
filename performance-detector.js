'use strict';

/**
 * Performance Detector - Détecte les appareils bas de gamme et adapte les animations
 * Optimise automatiquement l'expérience utilisateur selon les capacités de l'appareil
 */

(function() {
  // Détection de l'appareil bas de gamme
  function isLowEndDevice() {
    try {
      // 1. Vérifier la mémoire disponible (si supporté)
      if (navigator.deviceMemory && navigator.deviceMemory < 4) {
        return true; // Moins de 4GB de RAM = bas de gamme
      }

      // 2. Vérifier le nombre de cores CPU (si supporté)
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
        return true; // Moins de 4 cores = bas de gamme
      }

      // 3. Vérifier si c'est un mobile ancien via User Agent
      const ua = navigator.userAgent.toLowerCase();
      const oldMobile = /android [1-7]\./i.test(ua) || /iphone os [1-9]_/i.test(ua);
      if (oldMobile) {
        return true;
      }

      // 4. Test de performance : mesurer le temps de rendu d'une animation simple
      const startTime = performance.now();
      let sum = 0;
      for (let i = 0; i < 100000; i++) {
        sum += Math.sqrt(i);
      }
      const duration = performance.now() - startTime;
      
      // Si ça prend plus de 10ms pour ce calcul simple, c'est bas de gamme
      if (duration > 10) {
        return true;
      }

      return false;
    } catch (e) {
      // Si erreur, considérer comme bas de gamme par sécurité
      return true;
    }
  }

  // Appliquer les optimisations
  function applyLowEndOptimizations() {
    const html = document.documentElement;
    
    // Ajouter une classe pour permettre au CSS de s'adapter
    html.classList.add('low-end-device');
    
    // Stocker dans localStorage pour les prochaines visites
    try {
      localStorage.setItem('clipsou_low_end', '1');
    } catch (e) {}

    // Désactiver les animations via media query
    const style = document.createElement('style');
    style.textContent = `
      /* Désactiver les animations coûteuses sur bas de gamme */
      @media (prefers-reduced-motion: no-preference) {
        .low-end-device * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        /* Garder les transitions essentielles mais ultra-rapides */
        .low-end-device .button,
        .low-end-device .drawer,
        .low-end-device .drawer-overlay {
          transition-duration: 0.1s !important;
        }
        /* Supprimer les ombres coûteuses */
        .low-end-device .card:hover {
          box-shadow: none !important;
        }
        /* Supprimer les filtres backdrop */
        .low-end-device * {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    console.log('[Clipsou] Appareil bas de gamme détecté - Optimisations activées');
  }

  // Vérifier le localStorage d'abord
  let isLowEnd = false;
  try {
    isLowEnd = localStorage.getItem('clipsou_low_end') === '1';
  } catch (e) {}

  // Si pas déjà détecté, faire la détection
  if (!isLowEnd) {
    isLowEnd = isLowEndDevice();
  }

  // Appliquer les optimisations si nécessaire
  if (isLowEnd) {
    // Appliquer immédiatement si le DOM est prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyLowEndOptimizations, { once: true });
    } else {
      applyLowEndOptimizations();
    }
  } else {
    console.log('[Clipsou] Appareil standard - Animations complètes activées');
  }

  // Exposer une fonction pour forcer le mode bas de gamme (debug/test)
  window.forceLowEndMode = function() {
    localStorage.setItem('clipsou_low_end', '1');
    location.reload();
  };

  // Exposer une fonction pour désactiver le mode bas de gamme
  window.disableLowEndMode = function() {
    localStorage.removeItem('clipsou_low_end');
    location.reload();
  };
})();
