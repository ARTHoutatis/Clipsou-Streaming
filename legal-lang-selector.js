// Legal pages language selector
// This script handles language switching for legal pages
(function() {
  'use strict';
  
  // Wait for DOM and i18n to be ready
  function init() {
    const frBtn = document.getElementById('lang-fr');
    const enBtn = document.getElementById('lang-en');
    const notice = document.getElementById('lang-notice');
    
    if (!frBtn || !enBtn) return;
    
    function updateUI(lang) {
      const isFr = lang === 'fr';
      
      // Update button styles
      frBtn.style.background = isFr ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)';
      frBtn.style.borderColor = isFr ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)';
      frBtn.style.color = isFr ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)';
      
      enBtn.style.background = isFr ? 'rgba(255, 255, 255, 0.05)' : 'rgba(59, 130, 246, 0.2)';
      enBtn.style.borderColor = isFr ? 'rgba(255, 255, 255, 0.1)' : 'rgba(59, 130, 246, 0.4)';
      enBtn.style.color = isFr ? 'rgba(255, 255, 255, 0.6)' : '#3b82f6';
      
      // Show/hide language-specific content sections
      document.querySelectorAll('.lang-fr').forEach(el => {
        el.style.display = isFr ? 'block' : 'none';
      });
      document.querySelectorAll('.lang-en').forEach(el => {
        el.style.display = isFr ? 'none' : 'block';
      });
      
      // Show/hide translation notice (deprecated, using lang-specific sections now)
      if (notice) {
        notice.style.display = 'none';
      }
    }
    
    // Button event listeners
    frBtn.addEventListener('click', () => {
      if (window.i18n) {
        window.i18n.setLanguage('fr');
        updateUI('fr');
      }
    });
    
    enBtn.addEventListener('click', () => {
      if (window.i18n) {
        window.i18n.setLanguage('en');
        updateUI('en');
      }
    });
    
    // Listen for language changes from other sources
    window.addEventListener('languageChanged', (e) => {
      const lang = e.detail && e.detail.language;
      updateUI(lang || (window.i18n && window.i18n.getCurrentLanguage()) || 'fr');
    });
    
    // Initialize with current language
    if (window.i18n) {
      const currentLang = window.i18n.getCurrentLanguage();
      updateUI(currentLang);
    }
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
