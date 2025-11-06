// Auto-translation system for legal pages
// Uses LibreTranslate API via i18n.js to translate entire pages
(function() {
  'use strict';
  
  let translationCache = {};
  let isTranslating = false;
  
  // Elements to translate
  const selectorsToTranslate = [
    '.legal-section p',
    '.legal-section li',
    '.legal-section h2',
    '.legal-section h3',
    '.cgu-section p',
    '.cgu-section li', 
    '.cgu-section h2',
    '.cgu-section h3',
    '.privacy-section p',
    '.privacy-section li',
    '.privacy-section h2',
    '.privacy-section h3',
    '.contact-box p',
    '.contact-box h3',
    '.highlight-box p',
    '.warning-box p'
  ];
  
  // Store original French text
  function storeOriginalText() {
    selectorsToTranslate.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!el.hasAttribute('data-original-text')) {
          // Skip elements with links or specific classes to avoid
          const hasSpecialContent = el.querySelector('a, strong') || el.classList.contains('last-update');
          if (!hasSpecialContent && el.textContent.trim()) {
            el.setAttribute('data-original-text', el.textContent.trim());
          }
        }
      });
    });
  }
  
  // Translate element
  async function translateElement(el, targetLang) {
    const original = el.getAttribute('data-original-text');
    if (!original || targetLang === 'fr') {
      if (original) el.textContent = original;
      return;
    }
    
    // Check cache
    const cacheKey = original + '_' + targetLang;
    if (translationCache[cacheKey]) {
      el.textContent = translationCache[cacheKey];
      return;
    }
    
    // Translate via i18n auto-translate
    if (window.i18n && window.i18n.autoTranslate) {
      try {
        const translated = await window.i18n.autoTranslate(original, targetLang);
        if (translated && translated !== original) {
          translationCache[cacheKey] = translated;
          el.textContent = translated;
        }
      } catch (err) {
        console.warn('Translation failed for:', original.substring(0, 50));
      }
    }
  }
  
  // Translate entire page
  async function translatePage(targetLang) {
    if (isTranslating) return;
    isTranslating = true;
    
    // Show loading indicator
    const indicator = document.createElement('div');
    indicator.id = 'translate-loading';
    indicator.style.cssText = 'position: fixed; top: 80px; right: 20px; background: rgba(59, 130, 246, 0.9); color: white; padding: 12px 20px; border-radius: 8px; z-index: 999; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    indicator.textContent = targetLang === 'en' ? '🌍 Translating to English...' : '🌍 Retour au français...';
    document.body.appendChild(indicator);
    
    if (targetLang === 'fr') {
      // Restore original French
      selectorsToTranslate.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const original = el.getAttribute('data-original-text');
          if (original) el.textContent = original;
        });
      });
      
      // Remove indicator quickly
      setTimeout(() => {
        indicator.remove();
        isTranslating = false;
      }, 300);
    } else {
      // Translate to target language
      const elementsToTranslate = [];
      selectorsToTranslate.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          if (el.hasAttribute('data-original-text')) {
            elementsToTranslate.push(el);
          }
        });
      });
      
      // Translate in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < elementsToTranslate.length; i += batchSize) {
        const batch = elementsToTranslate.slice(i, i + batchSize);
        await Promise.all(batch.map(el => translateElement(el, targetLang)));
        
        // Update progress
        const progress = Math.round(((i + batchSize) / elementsToTranslate.length) * 100);
        indicator.textContent = `🌍 Translating... ${Math.min(progress, 100)}%`;
      }
      
      indicator.textContent = '✓ Translation complete!';
      setTimeout(() => {
        indicator.remove();
        isTranslating = false;
      }, 1000);
    }
  }
  
  // Initialize
  function init() {
    // Wait for i18n to be ready
    if (!window.i18n || !window.i18n.autoTranslate) {
      setTimeout(init, 100);
      return;
    }
    
    // Store original text
    storeOriginalText();
    
    // Listen for language changes
    window.addEventListener('languageChanged', (e) => {
      const lang = e.detail && e.detail.language;
      if (lang) {
        translatePage(lang);
      }
    });
    
    // Check current language and translate if needed
    const currentLang = window.i18n.getCurrentLanguage();
    if (currentLang === 'en') {
      translatePage('en');
    }
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
