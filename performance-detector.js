'use strict';

/**
 * Performance Detector (désactivé) – anciennement utilisé pour réduire les animations.
 * Nous conservons seulement une fonction utilitaire pour nettoyer l'ancien flag
 * afin de garantir que tout visiteur profite des animations complètes.
 */

(function() {
  // Supprime immédiatement toute trace de l'ancien mode low-end
  try {
    if (localStorage.getItem('clipsou_low_end') === '1') {
      localStorage.removeItem('clipsou_low_end');
    }
  } catch (e) {}

  // S'assure que la classe legacy n'est pas présente
  try {
    document.documentElement.classList.remove('low-end-device');
  } catch (e) {}

  // Expose des helpers no-op pour éviter les erreurs si d'autres scripts les appellent encore
  window.forceLowEndMode = function() {
    console.warn('[Clipsou] Mode low-end désactivé - aucune action effectuée');
  };

  window.disableLowEndMode = function() {
    try {
      localStorage.removeItem('clipsou_low_end');
    } catch (e) {}
    console.info('[Clipsou] Mode low-end déjà désactivé');
  };

  console.info('[Clipsou] Détecteur low-end désactivé - animations toujours actives');
})();
