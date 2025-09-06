// Solution définitive pour les boutons fermer
// Version simple et robuste qui fonctionne à coup sûr

(function() {
  'use strict';
  
  console.log('🔧 Initialisation du script de correction des boutons fermer...');
  
  // Fonction pour fermer toutes les popups
  function closeAllPopups() {
    console.log('🚪 Fermeture des popups...');
    
    // Nettoyer l'URL
    if (window.location.hash) {
      try {
        window.location.hash = '';
        console.log('✅ Hash nettoyé');
      } catch (e) {
        console.warn('⚠️ Erreur lors du nettoyage du hash:', e);
        // Fallback
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
    
    console.log('✅ Scroll restauré');
  }
  
  // Fonction pour gérer les clics sur les boutons fermer
  function handleCloseButtonClick(event) {
    const closeBtn = event.target.closest('.close-btn');
    if (!closeBtn) return;
    
    console.log('🖱️ Clic sur bouton fermer détecté');
    
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    closeAllPopups();
    
    return false;
  }
  
  // Fonction pour gérer les clics sur l'overlay
  function handleOverlayClick(event) {
    const popup = event.target.closest('.fiche-popup');
    if (!popup || event.target !== popup) return;
    
    console.log('🖱️ Clic sur overlay détecté');
    
    event.preventDefault();
    event.stopPropagation();
    
    closeAllPopups();
    
    return false;
  }
  
  // Fonction pour gérer la touche Escape
  function handleEscapeKey(event) {
    if (event.key === 'Escape' && window.location.hash) {
      console.log('⌨️ Touche Escape détectée');
      
      event.preventDefault();
      event.stopPropagation();
      
      closeAllPopups();
      
      return false;
    }
  }
  
  // Fonction pour gérer les liens de popup
  function handlePopupLinkClick(event) {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    
    const href = link.getAttribute('href');
    const id = href ? href.replace(/^#/, '') : '';
    if (!id) return;
    
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('fiche-popup')) return;
    
    console.log('🔗 Ouverture de popup:', id);
    
    event.preventDefault();
    
    // Verrouiller le scroll
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
    
    // Ouvrir la popup
    setTimeout(() => {
      window.location.hash = '#' + id;
    }, 0);
  }
  
  // Fonction d'initialisation
  function init() {
    console.log('🚀 Initialisation des gestionnaires d\'événements...');
    
    // Attacher les gestionnaires d'événements avec capture pour priorité
    document.addEventListener('click', handleCloseButtonClick, true);
    document.addEventListener('click', handleOverlayClick, true);
    document.addEventListener('keydown', handleEscapeKey, true);
    document.addEventListener('click', handlePopupLinkClick, true);
    
    // Gestion du hash initial
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const target = document.getElementById(id);
      if (target && target.classList.contains('fiche-popup')) {
        console.log('📍 Popup initiale détectée:', id);
        
        // Verrouiller le scroll
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
    }
    
    // Gestion des changements de hash
    window.addEventListener('hashchange', function() {
      const id = window.location.hash.replace('#', '');
      if (id) {
        const target = document.getElementById(id);
        if (target && target.classList.contains('fiche-popup')) {
          console.log('🔄 Changement de popup:', id);
          
          // Verrouiller le scroll
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
      } else {
        console.log('🔄 Fermeture de popup via hash');
        closeAllPopups();
      }
    });
    
    console.log('✅ Initialisation terminée');
  }
  
  // Démarrer l'initialisation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Exposer la fonction de fermeture globalement pour debug
  window.closeAllPopups = closeAllPopups;
  
})();
