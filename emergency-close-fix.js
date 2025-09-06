// Solution d'urgence pour les boutons fermer
// Force le fonctionnement même si d'autres scripts interfèrent

(function() {
  'use strict';
  
  console.log('🚨 Solution d\'urgence pour les boutons fermer activée');
  
  // Fonction de fermeture d'urgence
  function emergencyClose() {
    console.log('🚨 Fermeture d\'urgence activée');
    
    // Méthode 1: Nettoyer l'URL
    try {
      window.location.hash = '';
    } catch (e) {
      console.warn('Méthode 1 échouée:', e);
    }
    
    // Méthode 2: Nettoyer l'historique
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }
    } catch (e) {
      console.warn('Méthode 2 échouée:', e);
    }
    
    // Méthode 3: Forcer le style
    try {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.paddingRight = '';
    } catch (e) {
      console.warn('Méthode 3 échouée:', e);
    }
    
    // Méthode 4: Masquer toutes les popups
    try {
      const popups = document.querySelectorAll('.fiche-popup');
      popups.forEach(popup => {
        popup.style.display = 'none';
        popup.removeAttribute('id');
      });
    } catch (e) {
      console.warn('Méthode 4 échouée:', e);
    }
    
    console.log('✅ Fermeture d\'urgence terminée');
  }
  
  // Attacher les gestionnaires d'événements avec la plus haute priorité
  function attachEmergencyHandlers() {
    console.log('🔧 Attachement des gestionnaires d\'urgence...');
    
    // Gestionnaire pour les boutons fermer
    document.addEventListener('click', function(e) {
      const closeBtn = e.target.closest('.close-btn');
      if (closeBtn) {
        console.log('🚨 Bouton fermer d\'urgence cliqué');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        emergencyClose();
        return false;
      }
    }, true); // Capture phase pour priorité maximale
    
    // Gestionnaire pour l'overlay
    document.addEventListener('click', function(e) {
      const popup = e.target.closest('.fiche-popup');
      if (popup && e.target === popup) {
        console.log('🚨 Overlay d\'urgence cliqué');
        e.preventDefault();
        e.stopPropagation();
        emergencyClose();
        return false;
      }
    }, true);
    
    // Gestionnaire pour Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        console.log('🚨 Escape d\'urgence pressé');
        e.preventDefault();
        e.stopPropagation();
        emergencyClose();
        return false;
      }
    }, true);
    
    console.log('✅ Gestionnaires d\'urgence attachés');
  }
  
  // Fonction pour forcer l'ouverture des popups
  function forceOpenPopup(id) {
    console.log('🚨 Ouverture forcée de popup:', id);
    
    const popup = document.getElementById(id);
    if (!popup) return;
    
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
    popup.style.display = 'flex';
    window.location.hash = '#' + id;
  }
  
  // Gestionnaire pour les liens de popup
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    
    const href = link.getAttribute('href');
    const id = href ? href.replace(/^#/, '') : '';
    if (!id) return;
    
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('fiche-popup')) return;
    
    console.log('🚨 Lien de popup d\'urgence cliqué:', id);
    e.preventDefault();
    e.stopPropagation();
    forceOpenPopup(id);
    return false;
  }, true);
  
  // Initialisation immédiate
  attachEmergencyHandlers();
  
  // Réattacher après le chargement du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachEmergencyHandlers);
  }
  
  // Exposer les fonctions globalement pour debug
  window.emergencyClose = emergencyClose;
  window.forceOpenPopup = forceOpenPopup;
  
  console.log('🚨 Solution d\'urgence prête');
  
})();
