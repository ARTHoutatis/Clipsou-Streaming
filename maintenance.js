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

// Initialize maintenance system
(function() {
  'use strict';
  
  // Check if maintenance mode is enabled
  const MAINTENANCE_ENABLED = true; // Set to false to disable maintenance
  
  if (MAINTENANCE_ENABLED) {
    checkMaintenance();
  } else {
    // If maintenance is disabled but scheduled, show banner
    // showMaintenanceBanner();
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
