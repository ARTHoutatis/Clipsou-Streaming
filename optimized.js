// Clipsou Streaming - JavaScript Optimisé et Stable
// Version consolidée pour une compatibilité maximale entre hébergeurs

(function() {
  'use strict';
  
  // Configuration et état global
  const state = {
    isInitialized: false,
    carousel: {
      currentIndex: 0,
      isAutoPlaying: false,
      isUserInteracting: false,
      interval: null,
      resumeTimeout: null
    },
    popups: {
      isOpen: false,
      lastScrollY: 0,
      lastOpener: null
    },
    menu: {
      isOpen: false
    }
  };
  
  // Utilitaires
  const utils = {
    // Vérification de compatibilité
    checkCompatibility() {
      if (window.ClipsouConfig && window.ClipsouConfig.checkCompatibility) {
        return window.ClipsouConfig.checkCompatibility();
      }
      return { isCompatible: true, issues: [] };
    },
    
    // Debounce pour optimiser les performances
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },
    
    // Clamp pour limiter les valeurs
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },
    
    // Normalisation des chaînes pour la recherche
    normalizeString(str) {
      return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    },
    
    // Gestion d'erreurs robuste
    safeExecute(func, fallback = null) {
      try {
        return func();
      } catch (error) {
        if (window.ClipsouConfig && window.ClipsouConfig.errorHandling.logErrors) {
          console.warn('Clipsou: Erreur dans', func.name || 'fonction anonyme', error);
        }
        return fallback;
      }
    }
  };
  
  // Gestion des images
  const imageManager = {
    optimizeImages() {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }
        if (!img.hasAttribute('decoding')) {
          img.setAttribute('decoding', 'async');
        }
        if (!img.getAttribute('alt')) {
          img.setAttribute('alt', 'Image – Clipsou Streaming');
        }
      });
    },
    
    setupImageFallbacks() {
      const images = document.querySelectorAll('img[data-base]');
      images.forEach(img => {
        img.addEventListener('error', function() {
          const base = this.getAttribute('data-base');
          if (!base) {
            this.src = 'apercu.png';
            return;
          }
          
          const retryCount = parseInt(this.dataset.retryCount || '0', 10);
          const maxRetries = window.ClipsouConfig?.images?.retryAttempts || 3;
          
          if (retryCount < maxRetries) {
            const extensions = ['jpg', 'jpeg', 'png'];
            const nextExt = extensions[retryCount % extensions.length];
            this.src = `${base}.${nextExt}`;
            this.dataset.retryCount = String(retryCount + 1);
          } else {
            this.src = 'apercu.png';
          }
        });
      });
    }
  };
  
  // Gestion du carousel
  const carousel = {
    init() {
      const container = document.querySelector('.carousel-container');
      if (!container) return;
      
      const slidesTrack = container.querySelector('.carousel-slides');
      const indicators = container.querySelectorAll('.carousel-indicator');
      
      if (!slidesTrack || indicators.length === 0) return;
      
      this.slidesTrack = slidesTrack;
      this.indicators = Array.from(indicators);
      this.slideCount = this.indicators.length;
      
      this.setupEventListeners();
      this.goToSlide(0);
      this.startAutoPlay();
    },
    
    setupEventListeners() {
      // Indicateurs
      this.indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
          state.carousel.isUserInteracting = true;
          this.stopAutoPlay();
          this.goToSlide(index);
        });
        
        indicator.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            state.carousel.isUserInteracting = true;
            this.stopAutoPlay();
            this.goToSlide(index);
          }
        });
      });
      
      // Flèches mobiles
      const prevBtn = document.querySelector('.carousel-arrow.prev');
      const nextBtn = document.querySelector('.carousel-arrow.next');
      
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          state.carousel.isUserInteracting = true;
          this.stopAutoPlay();
          this.prevSlide();
        });
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          state.carousel.isUserInteracting = true;
          this.stopAutoPlay();
          this.nextSlide();
        });
      }
      
      // Pause au survol
      const carouselContainer = document.querySelector('.carousel-container');
      if (carouselContainer) {
        carouselContainer.addEventListener('mouseenter', () => {
          this.pauseAutoPlay();
        });
        
        carouselContainer.addEventListener('mouseleave', () => {
          this.resumeAutoPlay();
        });
      }
    },
    
    goToSlide(index) {
      if (!this.slidesTrack || !this.indicators) return;
      
      const clampedIndex = utils.clamp(index, 0, this.slideCount - 1);
      state.carousel.currentIndex = clampedIndex;
      
      // Mise à jour de la position
      const step = 100 / this.slideCount;
      const offsetPercent = clampedIndex * step;
      this.slidesTrack.style.transform = `translateX(-${offsetPercent}%)`;
      
      // Mise à jour des indicateurs
      this.indicators.forEach((indicator, i) => {
        const isActive = i === clampedIndex;
        indicator.classList.toggle('active', isActive);
        indicator.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
      
      // Mise à jour des slides
      const slides = this.slidesTrack.children;
      Array.from(slides).forEach((slide, i) => {
        slide.classList.toggle('active', i === clampedIndex);
      });
      
      // Programmer la reprise automatique
      this.scheduleResume();
    },
    
    nextSlide() {
      const nextIndex = (state.carousel.currentIndex + 1) % this.slideCount;
      this.goToSlide(nextIndex);
    },
    
    prevSlide() {
      const prevIndex = (state.carousel.currentIndex - 1 + this.slideCount) % this.slideCount;
      this.goToSlide(prevIndex);
    },
    
    startAutoPlay() {
      if (state.carousel.isUserInteracting) return;
      
      this.stopAutoPlay();
      const delay = window.ClipsouConfig?.carousel?.autoPlayDelay || 5000;
      
      state.carousel.interval = setInterval(() => {
        if (!state.carousel.isUserInteracting) {
          this.nextSlide();
        }
      }, delay);
      
      state.carousel.isAutoPlaying = true;
    },
    
    stopAutoPlay() {
      if (state.carousel.interval) {
        clearInterval(state.carousel.interval);
        state.carousel.interval = null;
      }
      state.carousel.isAutoPlaying = false;
    },
    
    pauseAutoPlay() {
      this.stopAutoPlay();
    },
    
    resumeAutoPlay() {
      if (!state.carousel.isUserInteracting) {
        this.startAutoPlay();
      }
    },
    
    scheduleResume() {
      if (state.carousel.resumeTimeout) {
        clearTimeout(state.carousel.resumeTimeout);
      }
      
      state.carousel.isUserInteracting = false;
      const delay = window.ClipsouConfig?.carousel?.resumeDelay || 10000;
      
      state.carousel.resumeTimeout = setTimeout(() => {
        this.startAutoPlay();
      }, delay);
    }
  };
  
  // Gestion des popups
  const popupManager = {
    init() {
      this.setupCloseButtons();
      this.setupOverlayClicks();
      this.setupKeyboardControls();
      this.setupHashHandling();
    },
    
    setupCloseButtons() {
      document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('.close-btn');
        if (closeBtn) {
          e.preventDefault();
          e.stopPropagation();
          this.closePopup();
        }
      });
    },
    
    setupOverlayClicks() {
      document.addEventListener('click', (e) => {
        const popup = e.target.closest('.fiche-popup');
        if (popup && e.target === popup) {
          this.closePopup();
        }
      });
    },
    
    setupKeyboardControls() {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.popups.isOpen) {
          this.closePopup();
        }
      });
    },
    
    setupHashHandling() {
      // Gestion des changements de hash
      window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
          this.openPopup(hash);
        } else {
          this.closePopup();
        }
      });
      
      // Gestion du hash initial
      if (window.location.hash) {
        const hash = window.location.hash.replace('#', '');
        this.openPopup(hash);
      }
    },
    
    openPopup(id) {
      const popup = document.getElementById(id);
      if (!popup || !popup.classList.contains('fiche-popup')) return;
      
      state.popups.isOpen = true;
      state.popups.lastScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      
      this.lockScroll();
      popup.style.display = 'flex';
      
      // Focus sur le premier élément focusable
      const firstFocusable = popup.querySelector('button, a, input, [tabindex]');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    },
    
    closePopup() {
      state.popups.isOpen = false;
      this.unlockScroll();
      
      // Nettoyer l'URL
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
      } else {
        window.location.hash = '';
      }
      
      // Restaurer le focus
      if (state.popups.lastOpener && typeof state.popups.lastOpener.focus === 'function') {
        state.popups.lastOpener.focus();
      }
    },
    
    lockScroll() {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = scrollbarWidth + 'px';
      }
      
      document.body.style.position = 'fixed';
      document.body.style.top = `-${state.popups.lastScrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    },
    
    unlockScroll() {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.paddingRight = '';
      
      // Restaurer la position de scroll
      requestAnimationFrame(() => {
        window.scrollTo({
          top: state.popups.lastScrollY,
          left: 0,
          behavior: 'auto'
        });
      });
    }
  };
  
  // Gestion du menu mobile
  const menuManager = {
    init() {
      const btn = document.querySelector('.hamburger-btn');
      const menu = document.getElementById('side-menu');
      const overlay = document.querySelector('.side-overlay');
      const closeBtn = document.querySelector('.side-close');
      
      if (!btn || !menu || !overlay || !closeBtn) return;
      
      this.btn = btn;
      this.menu = menu;
      this.overlay = overlay;
      this.closeBtn = closeBtn;
      
      this.setupEventListeners();
    },
    
    setupEventListeners() {
      this.btn.addEventListener('click', () => {
        if (state.menu.isOpen) {
          this.closeMenu();
        } else {
          this.openMenu();
        }
      });
      
      this.closeBtn.addEventListener('click', () => {
        this.closeMenu();
      });
      
      this.overlay.addEventListener('click', () => {
        this.closeMenu();
      });
      
      // Fermer avec Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.menu.isOpen) {
          this.closeMenu();
        }
      });
    },
    
    openMenu() {
      state.menu.isOpen = true;
      document.body.classList.add('menu-open');
      this.menu.classList.add('open');
      this.overlay.hidden = false;
      this.btn.setAttribute('aria-expanded', 'true');
      
      // Focus sur le premier lien
      const firstLink = this.menu.querySelector('a, button');
      if (firstLink) {
        firstLink.focus();
      }
    },
    
    closeMenu() {
      state.menu.isOpen = false;
      document.body.classList.remove('menu-open');
      this.menu.classList.remove('open');
      this.overlay.hidden = true;
      this.btn.setAttribute('aria-expanded', 'false');
      
      // Retourner le focus au bouton hamburger
      this.btn.focus();
    }
  };
  
  // Initialisation principale
  function init() {
    if (state.isInitialized) return;
    
    // Vérifier la compatibilité
    const compatibility = utils.checkCompatibility();
    if (!compatibility.isCompatible && window.ClipsouConfig?.compatibility?.gracefulDegradation) {
      console.warn('Clipsou: Mode de dégradation activé', compatibility.issues);
    }
    
    // Initialiser les composants
    utils.safeExecute(() => imageManager.optimizeImages());
    utils.safeExecute(() => imageManager.setupImageFallbacks());
    utils.safeExecute(() => carousel.init());
    utils.safeExecute(() => popupManager.init());
    utils.safeExecute(() => menuManager.init());
    
    state.isInitialized = true;
  }
    
  // Démarrer l'initialisation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Exposer l'API publique
  window.Clipsou = {
    carousel,
    popupManager,
    menuManager,
    utils,
    state
  };
  
})();
