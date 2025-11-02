/**
 * Cookie Consent Banner for YouTube Videos
 * Manages user consent for third-party YouTube cookies
 * GDPR/ePrivacy compliant
 */

(function() {
  'use strict';

  const CONSENT_KEY = 'clipsou_youtube_consent';
  const CONSENT_VERSION = 'v1';

  /**
   * Check if user has already given consent
   */
  function hasConsent() {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) return false;
      const data = JSON.parse(stored);
      return data && data.version === CONSENT_VERSION && data.accepted === true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Save consent decision
   */
  function saveConsent(accepted) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        version: CONSENT_VERSION,
        accepted: accepted,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Error saving consent:', e);
    }
  }

  /**
   * Show consent banner
   */
  function showBanner() {
    // Check if banner already exists
    if (document.getElementById('cookie-consent-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Consentement aux cookies');
    banner.innerHTML = `
      <div class="cookie-consent-content">
        <div class="cookie-consent-text">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
            <path d="M12,1A11,11,0,1,0,23,12,11.013,11.013,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9.011,9.011,0,0,1,12,21Zm1-3H11V16h2Zm0-4H11V6h2Z"></path>
          </svg>
          <div>
            <strong>Cookies YouTube</strong>
            <p>Ce site intègre des vidéos YouTube qui peuvent déposer des cookies tiers pour améliorer votre expérience et analyser le trafic. En cliquant sur "Accepter", vous consentez à l'utilisation de ces cookies.</p>
          </div>
        </div>
        <div class="cookie-consent-actions">
          <a href="privacy.html" class="cookie-btn cookie-btn-link" target="_blank" rel="noopener">En savoir plus</a>
          <button class="cookie-btn cookie-btn-secondary" id="cookie-refuse">Refuser</button>
          <button class="cookie-btn cookie-btn-primary" id="cookie-accept">Accepter</button>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #cookie-consent-banner {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, rgba(11, 17, 23, 0.98) 0%, rgba(26, 31, 46, 0.98) 100%);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
        z-index: 99999;
        padding: 20px;
        animation: slideUp 0.4s ease-out;
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .cookie-consent-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
      }
      
      .cookie-consent-text {
        flex: 1 1 400px;
        display: flex;
        align-items: flex-start;
        gap: 16px;
        color: rgba(255, 255, 255, 0.9);
      }
      
      .cookie-consent-text svg {
        margin-top: 2px;
        color: #3b82f6;
      }
      
      .cookie-consent-text strong {
        display: block;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 6px;
        color: #ffffff;
      }
      
      .cookie-consent-text p {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.8);
      }
      
      .cookie-consent-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      
      .cookie-btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        white-space: nowrap;
      }
      
      .cookie-btn-primary {
        background: #2B22EE;
        color: #ffffff;
        border: 1px solid #2B22EE;
      }
      
      .cookie-btn-primary:hover {
        filter: brightness(1.08);
      }
      
      .cookie-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .cookie-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      .cookie-btn-link {
        background: transparent;
        color: #3b82f6;
        padding: 10px 16px;
      }
      
      .cookie-btn-link:hover {
        color: #60a5fa;
        text-decoration: underline;
      }
      
      @media (max-width: 768px) {
        #cookie-consent-banner {
          padding: 16px;
        }
        
        .cookie-consent-content {
          flex-direction: column;
          align-items: stretch;
          gap: 16px;
        }
        
        .cookie-consent-text {
          flex: 1 1 auto;
        }
        
        .cookie-consent-actions {
          flex-direction: column;
          width: 100%;
        }
        
        .cookie-btn {
          width: 100%;
          justify-content: center;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(banner);

    // Event listeners
    document.getElementById('cookie-accept').addEventListener('click', () => {
      saveConsent(true);
      banner.style.animation = 'slideUp 0.3s ease-out reverse';
      setTimeout(() => {
        banner.remove();
        // Reload page to load YouTube content
        window.location.reload();
      }, 300);
    });

    document.getElementById('cookie-refuse').addEventListener('click', () => {
      saveConsent(false);
      banner.style.animation = 'slideUp 0.3s ease-out reverse';
      setTimeout(() => {
        banner.remove();
      }, 300);
    });
  }

  /**
   * Initialize consent system
   */
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Check if consent is needed (only on pages with potential YouTube embeds)
    const needsConsent = 
      document.querySelector('iframe[src*="youtube.com"]') ||
      document.querySelector('iframe[src*="youtu.be"]') ||
      document.querySelector('[data-video-id]') ||
      window.location.pathname.includes('fiche.html') ||
      window.location.pathname === '/' ||
      window.location.pathname === '/index.html';

    if (needsConsent && !hasConsent()) {
      // Show banner after a short delay for better UX
      setTimeout(showBanner, 1000);
    }
  }

  // Expose API for other scripts
  window.ClipsouConsent = {
    hasConsent: hasConsent,
    showBanner: showBanner
  };

  // Auto-initialize
  init();

})();
