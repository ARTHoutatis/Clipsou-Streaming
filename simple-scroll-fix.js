// Script ultra-simple pour corriger le scroll
// Pas de conflits, solution directe

(function() {
  'use strict';
  
  console.log('🔧 Script de correction scroll simple démarré');
  
  let savedScrollPosition = 0;
  let isPopupOpen = false;
  
  // Fonction pour sauvegarder et verrouiller
  function saveAndLock() {
    savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop || 0;
    console.log('📍 Position sauvegardée:', savedScrollPosition);
    
    // Verrouiller immédiatement
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollPosition}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    
    isPopupOpen = true;
    console.log('🔒 Scroll verrouillé');
  }
  
  // Fonction pour déverrouiller
  function unlock() {
    console.log('🔓 Déverrouillage du scroll');
    
    // Restaurer les styles d'abord
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    
    // Puis restaurer la position instantanément
    window.scrollTo(0, savedScrollPosition);
    
    isPopupOpen = false;
    console.log('✅ Scroll déverrouillé - position maintenue:', savedScrollPosition);
  }
  
  // Gestionnaire pour les clics sur les liens de popup
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    
    const href = link.getAttribute('href');
    const id = href ? href.replace(/^#/, '') : '';
    if (!id) return;
    
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('fiche-popup')) return;
    
    console.log('🚪 Ouverture popup:', id);
    e.preventDefault();
    
    // Sauvegarder et verrouiller
    saveAndLock();
    
    // Ouvrir la popup
    window.location.hash = '#' + id;
  }, true);
  
  // Gestionnaire pour les boutons fermer
  document.addEventListener('click', function(e) {
    const closeBtn = e.target.closest('.close-btn');
    if (!closeBtn) return;
    
    console.log('❌ Fermeture popup');
    e.preventDefault();
    e.stopPropagation();
    
    // Nettoyer l'URL
    window.location.hash = '';
    
    // Déverrouiller
    unlock();
    
    return false;
  }, true);
  
  // Gestionnaire pour l'overlay
  document.addEventListener('click', function(e) {
    const popup = e.target.closest('.fiche-popup');
    if (popup && e.target === popup) {
      console.log('❌ Fermeture par overlay');
      e.preventDefault();
      
      // Nettoyer l'URL
      window.location.hash = '';
      
      // Déverrouiller
      unlock();
      
      return false;
    }
  }, true);
  
  // Gestionnaire pour Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && window.location.hash) {
      console.log('❌ Fermeture par Escape');
      e.preventDefault();
      
      // Nettoyer l'URL
      window.location.hash = '';
      
      // Déverrouiller
      unlock();
      
      return false;
    }
  }, true);
  
  // Gestion des changements de hash
  window.addEventListener('hashchange', function() {
    const id = window.location.hash.replace('#', '');
    if (id) {
      const target = document.getElementById(id);
      if (target && target.classList.contains('fiche-popup')) {
        console.log('🔄 Popup ouverte via hash:', id);
        if (!isPopupOpen) {
          saveAndLock();
        }
      }
    } else {
      console.log('🔄 Popup fermée via hash');
      if (isPopupOpen) {
        unlock();
      }
    }
  });
  
  // Gestion du hash initial
  if (window.location.hash) {
    const id = window.location.hash.replace('#', '');
    const target = document.getElementById(id);
    if (target && target.classList.contains('fiche-popup')) {
      console.log('📍 Popup initiale détectée:', id);
      saveAndLock();
    }
  }
  
  // Exposer pour debug
  window.SimpleScrollFix = {
    saveAndLock,
    unlock,
    getSavedPosition: () => savedScrollPosition,
    isPopupOpen: () => isPopupOpen
  };
  
  console.log('✅ Script de correction scroll simple initialisé');
  
})();
