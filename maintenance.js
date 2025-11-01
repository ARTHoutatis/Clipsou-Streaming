/**
 * Maintenance Mode System
 * Redirects all non-admin users to maintenance page
 */

// Check if user is admin
function isAdmin() {
  try {
    const sessionKey = 'clipsou_admin_session_v1';
    const sessionData = sessionStorage.getItem(sessionKey);
    
    console.log('🔍 Admin check - sessionKey:', sessionKey);
    console.log('🔍 Admin check - sessionData:', sessionData);
    
    // L'admin stocke juste '1' dans sessionStorage, pas un objet JSON
    if (sessionData === '1') {
      console.log('✅ Admin session found (value: "1")');
      
      // Vérifier aussi le remember flag dans localStorage
      const rememberFlag = localStorage.getItem('clipsou_admin_remember_v1');
      console.log('🔍 Admin check - remember flag:', rememberFlag);
      
      // Si remember est activé, la session est valide
      if (rememberFlag === '1') {
        console.log('✅ Admin access granted (remember flag active)');
        return true;
      }
      
      // Sinon, la session sessionStorage est valide pour la session actuelle
      console.log('✅ Admin access granted (session active)');
      return true;
    }
    
    console.log('❌ No valid admin session found');
    return false;
  } catch (e) {
    console.error('❌ Error checking admin status:', e);
    return false;
  }
}

// Check if accessing admin pages
function isAdminPage() {
  const pathname = window.location.pathname;
  return pathname.includes('/admin/') || pathname.includes('admin.html');
}

// Check if accessing maintenance page
function isMaintenancePage() {
  const pathname = window.location.pathname;
  return pathname.includes('maintenance.html');
}

// Check if running locally (for logging only)
function isLocalDev() {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '';
}

// Main maintenance check
function checkMaintenance() {
  // Log if in local development (but don't bypass)
  if (isLocalDev()) {
    console.log('🚧 Local development mode - maintenance active for testing');
  }

  // If already on maintenance page, don't redirect
  if (isMaintenancePage()) {
    return;
  }

  // If admin is connected, allow access to ALL pages (not just admin pages)
  if (isAdmin()) {
    console.log('✅ Admin access granted - full site access during maintenance');
    return;
  }

  // Redirect to maintenance page
  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  const maintenanceUrl = 'maintenance.html?from=' + encodeURIComponent(currentPath);
  
  console.log('🔧 Maintenance mode active - redirecting non-admin users');
  window.location.replace(maintenanceUrl);
}

// Show maintenance banner (optional - for when site is partially available)
function showMaintenanceBanner() {
  // This could be used to show a banner on the main site
  // when maintenance is scheduled but not yet active
  const banner = document.createElement('div');
  banner.id = 'maintenance-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(90deg, #f59e0b, #d97706);
    color: #000;
    padding: 12px;
    text-align: center;
    font-weight: 600;
    z-index: 10000;
    font-size: 14px;
  `;
  banner.innerHTML = `
    🔧 <strong>Maintenance prévue</strong> : Clipsou Streaming sera en maintenance pour une mise à jour majeure. 
    <a href="maintenance.html" style="color: inherit; text-decoration: underline;">En savoir plus</a>
  `;
  
  document.body.insertBefore(banner, document.body.firstChild);
  
  // Adjust body padding to account for banner
  document.body.style.paddingTop = '48px';
}

// Show popup informing users about OAuth validation issues
function showOAuthValidationNotice() {
  const STORAGE_KEY = 'clipsou_oauth_notice_dismissed_v1';

  if (sessionStorage.getItem(STORAGE_KEY) === '1') {
    return;
  }

  const renderNotice = () => {
    if (document.getElementById('oauth-validation-notice')) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'oauth-validation-notice';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(11, 17, 23, 0.72);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      z-index: 100000;
      backdrop-filter: blur(2px);
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      max-width: 420px;
      width: 100%;
      background: #111827;
      color: #f9fafb;
      border-radius: 16px;
      padding: 28px 32px;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(96, 165, 250, 0.35);
      position: relative;
      font-family: inherit;
    `;

    const title = document.createElement('h2');
    title.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 12px 0;
      font-size: 1.3rem;
    `;
    title.innerHTML = `
      <span style="font-size: 1.6rem;">⚠️</span>
      Authentification Google en cours de validation
    `;

    const message = document.createElement('p');
    message.style.cssText = `
      margin: 0 0 18px 0;
      line-height: 1.5;
      color: rgba(229, 231, 235, 0.9);
      font-size: 0.98rem;
    `;
    message.innerHTML = `
      Notre intégration OAuth Google est actuellement en cours de validation. <br>
      La connexion via Google peut être temporairement indisponible ou afficher un message d'avertissement. <br>
      Vos données restent protégées et aucune action supplémentaire n'est requise de votre part.
    `;

    const button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border: none;
      border-radius: 9999px;
      padding: 10px 20px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #f9fafb;
      transition: transform 0.2s;
    `;
    button.textContent = 'Compris, je continue';

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-1px)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
    });

    const closeNotice = () => {
      sessionStorage.setItem(STORAGE_KEY, '1');
      overlay.remove();
    };

    button.addEventListener('click', closeNotice);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeNotice();
      }
    });

    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(button);
    overlay.appendChild(card);

    document.body.appendChild(overlay);
  };

  if (document.body) {
    renderNotice();
  } else {
    document.addEventListener('DOMContentLoaded', renderNotice, { once: true });
  }
}

// Initialize maintenance system
(function() {
  'use strict';
  
  // Check if maintenance mode is enabled
  const MAINTENANCE_ENABLED = false; // Set to false to disable maintenance
  
  if (MAINTENANCE_ENABLED) {
    checkMaintenance();
  } else {
    // If maintenance is disabled but scheduled, show banner
    // showMaintenanceBanner();
    showOAuthValidationNotice();
  }
  
  console.log('Maintenance system initialized');
})();

// Expose functions for testing
window.MaintenanceSystem = {
  isAdmin,
  isAdminPage,
  isMaintenancePage,
  isLocalDev,
  checkMaintenance
};

// Note: Local bypass is disabled for testing purposes
// In production, you might want to re-enable it by uncommenting:
/*
// Main maintenance check
function checkMaintenance() {
  // Bypass for local development
  if (isLocalDev()) {
    console.log('🚧 Local development mode - maintenance bypassed');
    return;
  }
  // ... rest of the function
}
*/
