// Correction spécifique pour la position de scroll
// Script de haute priorité pour éviter les conflits

(function() {
  'use strict';
  
  console.log('🔧 Démarrage de la correction de position de scroll...');
  
  // Variable globale pour stocker la position de scroll
  let savedScrollPosition = 0;
  let isPopupOpen = false;
  
  // Fonction pour sauvegarder la position de scroll
  function saveScrollPosition() {
    savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop || 0;
    console.log('📍 Position de scroll sauvegardée:', savedScrollPosition);
    isPopupOpen = true;
  }
  
  // Fonction pour verrouiller le scroll
  function lockScroll() {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = scrollbarWidth + 'px';
    }
    
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollPosition}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    
    console.log('🔒 Scroll verrouillé à la position:', savedScrollPosition);
  }
  
  // Fonction pour déverrouiller le scroll
  function unlockScroll() {
    console.log('🔓 Déverrouillage du scroll');
    
    // Restaurer les styles du body
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    document.body.style.overflow = '';
    
    // Restaurer la position de scroll
    window.scrollTo(0, savedScrollPosition);
    
    isPopupOpen = false;
    console.log('✅ Position de scroll restaurée:', savedScrollPosition);
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
    
    console.log('🚪 Ouverture de popup:', id);
    e.preventDefault();
    
    // Sauvegarder la position AVANT de verrouiller le scroll
    saveScrollPosition();
    
    // Verrouiller le scroll
    lockScroll();
    
    // Ouvrir la popup
    setTimeout(() => {
      window.location.hash = '#' + id;
    }, 0);
  }, true);
  
  // Gestionnaire pour les boutons fermer
  document.addEventListener('click', function(e) {
    const closeBtn = e.target.closest('.close-btn');
    if (!closeBtn) return;
    
    console.log('❌ Fermeture de popup par bouton');
    e.preventDefault();
    e.stopPropagation();
    
    // Nettoyer l'URL
    if (window.location.hash) {
      try {
        window.location.hash = '';
      } catch (err) {
        const url = window.location.pathname + window.location.search;
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, document.title, url);
        }
      }
    }
    
    // Déverrouiller le scroll
    unlockScroll();
    
    return false;
  }, true);
  
  // Gestionnaire pour l'overlay
  document.addEventListener('click', function(e) {
    const popup = e.target.closest('.fiche-popup');
    if (popup && e.target === popup) {
      console.log('❌ Fermeture de popup par overlay');
      e.preventDefault();
      
      // Nettoyer l'URL
      if (window.location.hash) {
        try {
          window.location.hash = '';
        } catch (err) {
          const url = window.location.pathname + window.location.search;
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, document.title, url);
          }
        }
      }
      
      // Déverrouiller le scroll
      unlockScroll();
      
      return false;
    }
  }, true);
  
  // Gestionnaire pour Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && window.location.hash) {
      console.log('❌ Fermeture de popup par Escape');
      e.preventDefault();
      
      // Nettoyer l'URL
      if (window.location.hash) {
        try {
          window.location.hash = '';
        } catch (err) {
          const url = window.location.pathname + window.location.search;
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, document.title, url);
          }
        }
      }
      
      // Déverrouiller le scroll
      unlockScroll();
      
      return false;
    }
  }, true);
  
  // Gestion des changements de hash
  window.addEventListener('hashchange', function() {
    const id = window.location.hash.replace('#', '');
    if (id) {
      const target = document.getElementById(id);
      if (target && target.classList.contains('fiche-popup')) {
        console.log('🔄 Changement de popup via hash:', id);
        
        // Sauvegarder la position si ce n'est pas déjà fait
        if (!isPopupOpen) {
          saveScrollPosition();
        }
        
        // Verrouiller le scroll
        lockScroll();
      }
    } else {
      console.log('🔄 Fermeture de popup via hash');
      
      // Déverrouiller le scroll
      unlockScroll();
    }
  });
  
  // Gestion du hash initial
  if (window.location.hash) {
    const id = window.location.hash.replace('#', '');
    const target = document.getElementById(id);
    if (target && target.classList.contains('fiche-popup')) {
      console.log('📍 Popup initiale détectée:', id);
      
      // Sauvegarder la position
      saveScrollPosition();
      
      // Verrouiller le scroll
      lockScroll();
    }
  }
  
  // Exposer les fonctions pour debug
  window.ScrollFix = {
    saveScrollPosition,
    lockScroll,
    unlockScroll,
    getSavedPosition: () => savedScrollPosition,
    isPopupOpen: () => isPopupOpen
  };
  
  console.log('✅ Correction de position de scroll initialisée');
  
})();
