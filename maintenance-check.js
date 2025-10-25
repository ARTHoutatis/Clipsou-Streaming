// Maintenance mode check - blocks access for non-admin users
(function() {
  'use strict';
  
  // Configuration
  const MAINTENANCE_ENABLED = true; // Set to false to disable maintenance mode
  const ADMIN_SESSION_KEY = 'clipsou_admin_session_v1';
  
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
    try {
      const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionData) return false;
      
      const session = JSON.parse(sessionData);
      if (!session || !session.loggedIn) return false;
      
      // Check if session is still valid (24 hours)
      const sessionTime = session.timestamp || 0;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (now - sessionTime > maxAge) {
        // Session expired
        return false;
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // Redirect to maintenance page if not admin
  if (!isAdmin()) {
    window.location.href = 'maintenance.html';
  }
})();
