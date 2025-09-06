// Configuration centralisée pour Clipsou Streaming
// Version stable et compatible multi-hébergeurs

window.ClipsouConfig = {
  // Configuration du carousel
  carousel: {
    autoPlayDelay: 5000, // 5 secondes par slide
    resumeDelay: 10000,  // 10 secondes avant reprise auto
    enableTouch: true,
    enableKeyboard: true
  },
  
  // Configuration des images
  images: {
    lazyLoading: true,
    asyncDecoding: true,
    fallbackImage: 'apercu.png',
    retryAttempts: 3
  },
  
  // Configuration de la recherche
  search: {
    minQueryLength: 1,
    debounceDelay: 300,
    maxResults: 50
  },
  
  // Configuration des popups
  popups: {
    scrollLock: true,
    closeOnEscape: true,
    closeOnOverlay: true,
    restoreFocus: true
  },
  
  // Configuration responsive
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  },
  
  // Configuration des performances
  performance: {
    enableAnimations: true,
    reduceMotion: false,
    enableTransitions: true
  },
  
  // Configuration de compatibilité
  compatibility: {
    enablePolyfills: true,
    fallbackToLocal: true,
    gracefulDegradation: true
  }
};

// Détection des capacités du navigateur
window.ClipsouConfig.capabilities = {
  hasIntersectionObserver: 'IntersectionObserver' in window,
  hasResizeObserver: 'ResizeObserver' in window,
  hasCustomProperties: CSS.supports('color', 'var(--test)'),
  hasGrid: CSS.supports('display', 'grid'),
  hasFlexbox: CSS.supports('display', 'flex'),
  hasBackdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
  prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
};

// Fonction utilitaire pour vérifier la compatibilité
window.ClipsouConfig.checkCompatibility = function() {
  const issues = [];
  
  if (!window.ClipsouConfig.capabilities.hasCustomProperties) {
    issues.push('CSS Custom Properties non supportées');
  }
  
  if (!window.ClipsouConfig.capabilities.hasGrid) {
    issues.push('CSS Grid non supporté');
  }
  
  if (!window.ClipsouConfig.capabilities.hasFlexbox) {
    issues.push('CSS Flexbox non supporté');
  }
  
  return {
    isCompatible: issues.length === 0,
    issues: issues
  };
};

// Configuration des erreurs et fallbacks
window.ClipsouConfig.errorHandling = {
  logErrors: true,
  showUserFriendlyErrors: false,
  fallbackToBasicMode: true,
  retryAttempts: 3
};

// Export pour utilisation dans d'autres scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.ClipsouConfig;
}
