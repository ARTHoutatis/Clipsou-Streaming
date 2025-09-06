// Script de correction pour les boutons fermer
// Assure que les boutons fermer fonctionnent correctement

(function() {
  'use strict';
  
  // Fonction pour fermer les popups
  function closePopup() {
    // Nettoyer l'URL
    if (window.location.hash) {
      try {
        window.location.hash = '';
      } catch (e) {
        // Fallback pour les navigateurs anciens
        const url = window.location.pathname + window.location.search;
        if (window.history && typeof window.history.replaceState === 'function') {
          window.history.replaceState(null, document.title, url);
        }
      }
    }
    
    // Restaurer le scroll
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    
    // Restaurer la position de scroll
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' });
    });
  }
  
  // Fonction pour verrouiller le scroll
  function lockScroll() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = scrollbarWidth + 'px';
    }
    
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  
  // Gestionnaire d'événements pour les boutons fermer
  function handleCloseButtonClick(e) {
    const closeBtn = e.target.closest('.close-btn');
    if (!closeBtn) return;
    
    e.preventDefault();
    e.stopPropagation();
    closePopup();
  }
  
  // Gestionnaire d'événements pour les clics sur l'overlay
  function handleOverlayClick(e) {
    const popup = e.target.closest('.fiche-popup');
    if (popup && e.target === popup) {
      e.preventDefault();
      e.stopPropagation();
      closePopup();
    }
  }
  
  // Gestionnaire d'événements pour la touche Escape
  function handleEscapeKey(e) {
    if (e.key === 'Escape' && window.location.hash) {
      e.preventDefault();
      closePopup();
    }
  }
  
  // Gestionnaire d'événements pour les liens de popup
  function handlePopupLinkClick(e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    
    const href = link.getAttribute('href');
    const id = href ? href.replace(/^#/, '') : '';
    if (!id) return;
    
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('fiche-popup')) return;
    
    e.preventDefault();
    lockScroll();
    
    // Ouvrir la popup
    setTimeout(() => {
      window.location.hash = '#' + id;
    }, 0);
  }
  
  // Initialisation
  function init() {
    // Attacher les gestionnaires d'événements
    document.addEventListener('click', handleCloseButtonClick, true);
    document.addEventListener('click', handleOverlayClick, true);
    document.addEventListener('keydown', handleEscapeKey, true);
    document.addEventListener('click', handlePopupLinkClick, true);
    
    // Gestion du hash initial
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const target = document.getElementById(id);
      if (target && target.classList.contains('fiche-popup')) {
        lockScroll();
      }
    }
    
    // Gestion des changements de hash
    window.addEventListener('hashchange', function() {
      const id = window.location.hash.replace('#', '');
      if (id) {
        const target = document.getElementById(id);
        if (target && target.classList.contains('fiche-popup')) {
          lockScroll();
        }
      } else {
        // Hash vide = fermer les popups
        closePopup();
      }
    });
  }
  
  // Démarrer l'initialisation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
