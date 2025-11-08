// Dynamic content loader for legal pages
// Applies translations from legal-translations.js

(function() {
  'use strict';
  
  function init() {
    // Wait for translations to load
    if (!window.legalTranslations) {
      setTimeout(init, 100);
      return;
    }
    
    const pageName = getPageName();
    if (!pageName) return;
    
    const pageData = window.legalTranslations[pageName];
    if (!pageData || !pageData.sections) return;
    
    // Process each section
    pageData.sections.forEach((section, index) => {
      let sectionClass = '.legal-section';
      if (pageName === 'cgu') sectionClass = '.cgu-section';
      if (pageName === 'privacy') sectionClass = '.privacy-section';
      
      // Get all sections but exclude those with manual translations
      const allSections = Array.from(document.querySelectorAll(sectionClass));
      const sectionElements = allSections.filter(el => !el.hasAttribute('data-manual-translation'));
      
      if (sectionElements[index]) {
        wrapSection(sectionElements[index], section);
      }
    });
    
    // Update footer
    updateFooter();
    
    // Listen for language changes
    window.addEventListener('languageChanged', (e) => {
      const lang = e.detail && e.detail.language;
      updateContentLanguage(lang || 'fr');
    });
    
    // Initialize with current language
    const currentLang = window.i18n ? window.i18n.getCurrentLanguage() : 'fr';
    updateContentLanguage(currentLang);
  }
  
  function getPageName() {
    const path = window.location.pathname;
    if (path.includes('cgu')) return 'cgu';
    if (path.includes('mentions-legales')) return 'mentions';
    if (path.includes('privacy')) return 'privacy';
    return null;
  }
  
  function wrapSection(sectionEl, sectionData) {
    // Store original content as FR
    const originalContent = sectionEl.innerHTML;
    
    // Create wrapper with language classes
    const wrapper = document.createElement('div');
    wrapper.className = 'lang-section-wrapper';
    
    // FR version (original)
    const frDiv = document.createElement('div');
    frDiv.className = 'lang-fr';
    frDiv.innerHTML = originalContent;
    
    // EN version (from translations)
    const enDiv = document.createElement('div');
    enDiv.className = 'lang-en';
    enDiv.style.display = 'none';
    
    // Build EN content
    let enContent = '<h2>';
    if (sectionEl.querySelector('.icon')) {
      enContent += sectionEl.querySelector('.icon').outerHTML;
    }
    enContent += sectionData.title.en + '</h2>';
    enContent += sectionData.content.en;
    
    enDiv.innerHTML = enContent;
    
    // Replace section content with wrapper
    sectionEl.innerHTML = '';
    wrapper.appendChild(frDiv);
    wrapper.appendChild(enDiv);
    sectionEl.appendChild(wrapper);
  }
  
  function updateFooter() {
    const footer = document.querySelector('[style*="text-align: center"]');
    if (!footer || !window.legalTranslations.footer) return;
    
    const footerP = footer.querySelector('p');
    if (!footerP) return;
    
    const frSpan = document.createElement('span');
    frSpan.className = 'lang-fr';
    frSpan.innerHTML = window.legalTranslations.footer.fr;
    
    const enSpan = document.createElement('span');
    enSpan.className = 'lang-en';
    enSpan.style.display = 'none';
    enSpan.innerHTML = window.legalTranslations.footer.en;
    
    footerP.innerHTML = '';
    footerP.appendChild(frSpan);
    footerP.appendChild(enSpan);
  }
  
  function updateContentLanguage(lang) {
    const isFr = lang === 'fr';
    
    // Update all language wrappers
    document.querySelectorAll('.lang-section-wrapper .lang-fr').forEach(el => {
      el.style.display = isFr ? 'block' : 'none';
    });
    document.querySelectorAll('.lang-section-wrapper .lang-en').forEach(el => {
      el.style.display = isFr ? 'none' : 'block';
    });
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
