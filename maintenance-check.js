// Maintenance mode check - blocks access for non-admin users
(function() {
  'use strict';
  
  // Configuration
  const MAINTENANCE_ENABLED = true; // Set to false to disable maintenance mode
  const ADMIN_SESSION_KEY = 'clipsou_admin_session_v1';
  const ADMIN_REMEMBER_KEY = 'clipsou_admin_remember_v1';
  const ADMIN_LOGGED_KEY = 'clipsou_admin_logged_in_v1';
  
  // Don't redirect if we're already on maintenance page or admin page
  const currentPage = window.location.pathname;
  if (currentPage.includes('maintenance.html') || currentPage.includes('/admin/')) {
    return;
  }
  
  // Check if maintenance mode is enabled
  if (!MAINTENANCE_ENABLED) {
    return;
  }
  
  // Check if user is admin (has active admin session)
  function isAdmin() {
    // Admin dashboard stores session flag in sessionStorage (per tab)
    try {
      if (window.sessionStorage && sessionStorage.getItem(ADMIN_SESSION_KEY) === '1') {
        return true;
      }
    } catch {}

    // Broadcast flags stored in localStorage (shared across tabs/origin)
    try {
      if (window.localStorage) {
        if (localStorage.getItem(ADMIN_LOGGED_KEY) === '1') {
          return true;
        }
        if (localStorage.getItem(ADMIN_REMEMBER_KEY) === '1') {
          return true;
        }
      }
    } catch {}

    return false;
  }
  
  // Redirect to maintenance page if not admin
  if (!isAdmin()) {
    window.location.href = 'maintenance.html';
  }
})();
