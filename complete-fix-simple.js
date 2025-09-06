// Correction simplifiée - seulement les corrections essentielles
// Sans gestionnaires d'événements pour éviter les conflits

(function() {
  'use strict';
  
  console.log('🔧 Démarrage de la correction simplifiée...');
  
  // Configuration des corrections
  const fixes = {
    // Correction des images manquantes
    imageFallbacks: {
      'La1.jpg': 'La.jpg',
      'Dé1.jpg': 'Dé.jpg', 
      'Ja1.jpg': 'Ja.jpg',
      'Ka1.jpg': 'Ka.jpg',
      'Ba1.jpg': 'Ba.jpg',
      'Ur1.jpg': 'Ur.jpg',
      'Bac1.png': 'Bac.jpg',
      'Al.jpg': 'Al.jpg',
      'Law.jpg': 'Law.jpg'
    },
    
    // Descriptions manquantes
    descriptions: {
      'film1': 'Timmy, un enfant espiègle, nous fait visiter son village dans un monde entièrement construit en briques LEGO. Mais chaque coin de rue réserve son lot de gags et de surprises ! Une aventure familiale pleine d\'humour et de tendresse qui ravira petits et grands.',
      'film2': 'Deux frères identiques, l\'un vêtu de blanc et l\'autre de noir, s\'entendent à merveille… jusqu\'à ce que l\'un finisse en prison. Dans l\'univers de Minecraft, ce thriller haletant mêle comédie, suspense et évasion.',
      'film3': 'Un aventurier un peu maladroit traverse des contrées hostiles remplies de créatures féroces. Tourné en prise de vue réelle (live action), ce périple épique mêle humour et fantastique pour un voyage plein de surprises.',
      'film4': 'Victime de harcèlement scolaire, une adolescente met fin à ses jours. Réalisé en prise de vue réelle, ce récit surnaturel suit le retour d\'un esprit tourmenté qui hante son bourreau et le plonge dans une spirale de terreur.',
      'film5': 'Un nouveau trailer de Batman, sombre et intense, réimaginé dans l\'univers Minecraft. Découvrez des premières images qui redéfinissent le chevalier noir avec une approche moderne et spectaculaire.',
      'film6': 'Le Noob vous présente, avec humour, la ville d\'Urbanos créée sur Minecraft.',
      'film7': 'Après avoir chuté à travers le sol, Noob se retrouve piégé dans les Backrooms : un dédale sans fin de couloirs jaunâtres où bourdonnent les néons et où rôdent d\'étranges présences. Entre zones instables, anomalies hostiles et rencontres inattendues, chaque pas le rapproche d\'une vérité inquiétante. Court-métrage réalisé à l\'occasion d\'une mise à jour du serveur Minecraft Urbanos.',
      'serie1': 'Suivez les aventures captivantes d\'Alex, un personnage attachant dans un univers en briques LEGO. Cette série brickfilm innovante mêle action, humour et émotion dans des épisodes soigneusement réalisés qui plairont à tous les âges.',
      'serie2': 'Plongez dans l\'univers du Far West à travers cette série brickfilm unique ! Cowboys en briques LEGO, duels au soleil couchant et esthétique VHS nostalgique : cette série réinvente le western avec humour dans un style rétro irrésistible.'
    }
  };
  
  // Fonction pour corriger les images
  function fixImages() {
    console.log('🖼️ Correction des images...');
    
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && fixes.imageFallbacks[src]) {
        const fallback = fixes.imageFallbacks[src];
        img.addEventListener('error', function() {
          console.log(`🔄 Image ${src} introuvable, utilisation de ${fallback}`);
          this.src = fallback;
        });
        
        // Vérifier si l'image existe
        const testImg = new Image();
        testImg.onerror = () => {
          console.log(`⚠️ Image ${src} introuvable, remplacement par ${fallback}`);
          img.src = fallback;
        };
        testImg.src = src;
      }
    });
  }
  
  // Fonction pour corriger les descriptions manquantes
  function fixDescriptions() {
    console.log('📝 Correction des descriptions...');
    
    Object.keys(fixes.descriptions).forEach(popupId => {
      const popup = document.getElementById(popupId);
      if (!popup) return;
      
      const descriptionEl = popup.querySelector('.fiche-right p');
      if (!descriptionEl || !descriptionEl.textContent.trim()) {
        console.log(`📝 Ajout de description pour ${popupId}`);
        if (descriptionEl) {
          descriptionEl.textContent = fixes.descriptions[popupId];
        } else {
          // Créer l'élément description s'il n'existe pas
          const rightContent = popup.querySelector('.fiche-right');
          if (rightContent) {
            const p = document.createElement('p');
            p.textContent = fixes.descriptions[popupId];
            const buttonGroup = rightContent.querySelector('.button-group');
            if (buttonGroup) {
              rightContent.insertBefore(p, buttonGroup);
            } else {
              rightContent.appendChild(p);
            }
          }
        }
      }
    });
  }
  
  // Fonction pour corriger la structure des popups
  function fixPopupStructure() {
    console.log('🏗️ Correction de la structure des popups...');
    
    const popups = document.querySelectorAll('.fiche-popup');
    popups.forEach(popup => {
      // S'assurer que la popup a la bonne structure
      if (!popup.querySelector('.fiche-content')) {
        console.log('⚠️ Popup sans fiche-content:', popup.id);
        return;
      }
      
      // S'assurer que le bouton fermer existe
      if (!popup.querySelector('.close-btn')) {
        console.log('⚠️ Popup sans bouton fermer:', popup.id);
        const buttonGroup = popup.querySelector('.button-group');
        if (buttonGroup) {
          const closeBtn = document.createElement('a');
          closeBtn.href = '#';
          closeBtn.className = 'button close-btn';
          closeBtn.textContent = '❌ Fermer';
          buttonGroup.appendChild(closeBtn);
        }
      }
      
      // S'assurer que l'image a les bons attributs
      const img = popup.querySelector('img');
      if (img) {
        if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
        if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
        if (!img.getAttribute('alt')) img.setAttribute('alt', 'Image du contenu');
      }
    });
  }
  
  // Fonction pour corriger les styles CSS
  function fixCSS() {
    console.log('🎨 Correction des styles CSS...');
    
    // Ajouter des styles de correction si nécessaire
    const style = document.createElement('style');
    style.textContent = `
      .fiche-popup {
        display: none !important;
      }
      .fiche-popup:target {
        display: flex !important;
      }
      .fiche-content {
        position: relative;
        z-index: 10000;
      }
      .close-btn {
        cursor: pointer !important;
      }
      .fiche-popup img {
        max-width: 100% !important;
        height: auto !important;
        object-fit: cover !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Fonction principale d'initialisation
  function init() {
    console.log('🚀 Initialisation de la correction simplifiée...');
    
    // Appliquer seulement les corrections essentielles
    fixImages();
    fixDescriptions();
    fixPopupStructure();
    fixCSS();
    
    console.log('✅ Correction simplifiée terminée');
  }
  
  // Démarrer l'initialisation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Exposer les fonctions pour debug
  window.ClipsouFixSimple = {
    fixImages,
    fixDescriptions,
    fixPopupStructure,
    fixes
  };
  
})();
