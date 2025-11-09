/**
 * Admin Authentication System with Google OAuth
 * Manages admin access control and admin list
 */

'use strict';

(function() {
  // Storage keys
  const STORAGE_KEY_ADMINS = 'clipsou_admin_list_v1';
  const STORAGE_KEY_CURRENT_ADMIN = 'clipsou_current_admin_v1';

  // Schema metadata
  const ADMIN_SCHEMA_VERSION = 1;

  // Super admin (cannot be removed or banned)
  const SUPER_ADMIN_EMAIL = 'arthurcapon54@gmail.com';

  // Default admin list (emails autorisés)
  const DEFAULT_ADMINS = [
    // Ajoutez ici les emails Google des admins autorisés
    // Ex: 'admin@example.com'
  ];

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

  /**
   * Normalize email by trimming and lowercasing.
   * Returns an empty string when invalid.
   */
  function normalizeEmail(email) {
    if (typeof email !== 'string') return '';
    return email.trim().toLowerCase();
  }

  function isEmailStructureValid(email) {
    return EMAIL_PATTERN.test(email);
  }

  function formatAdminDate(timestamp) {
    if (!Number.isFinite(timestamp)) return '';
    try {
      return new Date(timestamp).toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  /**
   * Check if an email is the super admin
   */
  function isSuperAdmin(email) {
    return normalizeEmail(email) === normalizeEmail(SUPER_ADMIN_EMAIL);
  }

  /**
   * Canonicalize an admin entry regardless of source format.
   */
  function canonicalizeAdminEntry(entry, { fallbackAddedBy } = {}) {
    if (!entry) return null;

    if (typeof entry === 'string') {
      const email = normalizeEmail(entry);
      if (!email) return null;
      return {
        email,
        name: '',
        addedAt: Date.now(),
        addedBy: fallbackAddedBy || 'legacy',
        schema: ADMIN_SCHEMA_VERSION
      };
    }

    if (typeof entry === 'object') {
      const email = normalizeEmail(entry.email || entry.mail || entry.address);
      if (!email) return null;

      const name = typeof entry.name === 'string' ? entry.name.trim() : '';
      const addedAtCandidate = Number(entry.addedAt);
      const addedAt = Number.isFinite(addedAtCandidate) && addedAtCandidate > 0
        ? addedAtCandidate
        : Date.now();
      const addedBy = normalizeEmail(entry.addedBy) || fallbackAddedBy || 'legacy';

      return {
        email,
        name,
        addedAt,
        addedBy,
        schema: ADMIN_SCHEMA_VERSION
      };
    }

    return null;
  }

  /**
   * Build a unique, canonical admin array.
   */
  function buildAdminList(rawList, { fallbackAddedBy } = {}) {
    const seen = new Set();
    const result = [];

    if (Array.isArray(rawList)) {
      rawList.forEach(item => {
        const canonical = canonicalizeAdminEntry(item, { fallbackAddedBy });
        if (!canonical) return;
        if (seen.has(canonical.email)) return;
        seen.add(canonical.email);
        result.push(canonical);
      });
    }

    return result;
  }

  /**
   * Retrieve admin list declared in configuration (config.js).
   */
  function getConfiguredAdmins() {
    const configAdmins = window.ClipsouConfig && Array.isArray(window.ClipsouConfig.admins)
      ? window.ClipsouConfig.admins
      : DEFAULT_ADMINS;
    return buildAdminList(configAdmins, { fallbackAddedBy: 'config' });
  }

  /**
   * Read raw admin data from storage.
   */
  function readAdminsFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ADMINS);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return buildAdminList(parsed, { fallbackAddedBy: 'storage' });
    } catch (error) {
      console.error('Error loading admin list:', error);
      return null;
    }
  }

  /**
   * Persist admins to storage in canonical form.
   */
  function persistAdmins(list) {
    try {
      const canonical = buildAdminList(list, { fallbackAddedBy: 'system' });
      localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(canonical));
      return canonical;
    } catch (error) {
      console.error('Error saving admin list:', error);
      return null;
    }
  }

  let cachedAdmins = null;

  function cloneAdminList(admins) {
    return Array.isArray(admins) ? admins.map(admin => ({ ...admin })) : [];
  }

  /**
   * Invalidate cached admin list to force reload from storage
   */
  function invalidateAdminCache() {
    cachedAdmins = null;
  }

  function loadAdminList() {
    if (Array.isArray(cachedAdmins)) {
      return cachedAdmins;
    }

    const fromStorage = readAdminsFromStorage();
    const fromConfig = getConfiguredAdmins();

    let merged = buildAdminList([
      ...fromConfig,
      ...(fromStorage || [])
    ], { fallbackAddedBy: 'system' });

    // Persist merged list when storage is empty or missing configured entries
    if (!fromStorage || merged.length !== fromStorage.length) {
      const persisted = persistAdmins(merged);
      if (persisted) {
        merged = persisted;
      }
    }

    cachedAdmins = merged;
    return cachedAdmins;
  }

  /**
   * Get admin list (immutable clone)
   */
  function getAdminList() {
    return cloneAdminList(loadAdminList());
  }

  /**
   * Save admin list to localStorage
   */
  function saveAdminList(list) {
    const persisted = persistAdmins(list);
    if (persisted) {
      cachedAdmins = persisted;
      return true;
    }
    return false;
  }

  /**
   * Check if email is in admin list
   */
  function isEmailAdmin(email) {
    if (!email) return false;
    const admins = getAdminList();
    const normalizedEmail = String(email).toLowerCase().trim();
    return admins.some(admin => {
      const adminEmail = String(admin.email || admin).toLowerCase().trim();
      return adminEmail === normalizedEmail;
    });
  }

  /**
   * Get current admin info
   */
  function getCurrentAdmin() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENT_ADMIN);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Save current admin info
   */
  function saveCurrentAdmin(adminInfo) {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT_ADMIN, JSON.stringify(adminInfo));
    } catch (e) {
      console.error('Error saving current admin:', e);
    }
  }

  /**
   * Clear current admin
   */
  function clearCurrentAdmin() {
    try {
      localStorage.removeItem(STORAGE_KEY_CURRENT_ADMIN);
    } catch (e) {
      console.error('Error clearing current admin:', e);
    }
  }

  /**
   * Add admin to list
   */
  function addAdmin(email, name, options = {}) {
    // Only super admin can add admins (unless it's system/bootstrap)
    const current = getCurrentAdmin();
    if (current && !options.addedBy && !isSuperAdmin(current.email)) {
      return { success: false, message: '⛔ Seul le Super Admin peut ajouter des administrateurs.' };
    }

    const admins = loadAdminList();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return { success: false, message: 'Adresse email invalide.' };
    }

    // Check duplicates
    if (admins.some(admin => admin.email === normalizedEmail)) {
      return { success: false, message: 'Cet email est déjà dans la liste des admins.' };
    }

    const addedBy = options.addedBy || current?.email || 'system';
    const entry = canonicalizeAdminEntry({
      email: normalizedEmail,
      name: name || '',
      addedAt: Date.now(),
      addedBy
    }, { fallbackAddedBy: 'system' });

    const updatedList = [...admins, entry];
    if (saveAdminList(updatedList)) {
      return { success: true, message: 'Admin ajouté avec succès.' };
    }

    return { success: false, message: 'Impossible d\'enregistrer la liste des admins. Vérifiez l\'espace de stockage.' };
  }

  /**
   * Remove admin from list
   */
  function removeAdmin(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return { success: false, message: 'Adresse email invalide.' };
    }

    // Only super admin can remove admins
    const currentAdmin = getCurrentAdmin();
    if (currentAdmin && !isSuperAdmin(currentAdmin.email)) {
      return { success: false, message: '⛔ Seul le Super Admin peut retirer des administrateurs.' };
    }

    // Prevent removing super admin
    if (isSuperAdmin(normalizedEmail)) {
      return { success: false, message: '🔒 Impossible de retirer le Super Admin.' };
    }

    const admins = loadAdminList();

    // Prevent removing yourself
    if (currentAdmin && normalizeEmail(currentAdmin.email) === normalizedEmail) {
      return { success: false, message: 'Vous ne pouvez pas vous retirer vous-même de la liste.' };
    }

    const filtered = admins.filter(admin => admin.email !== normalizedEmail);

    if (filtered.length === admins.length) {
      return { success: false, message: 'Admin introuvable dans la liste.' };
    }

    if (saveAdminList(filtered)) {
      return { success: true, message: 'Admin retiré avec succès.' };
    }

    return { success: false, message: 'Impossible de sauvegarder la nouvelle liste. Vérifiez l\'espace de stockage.' };
  }

  /**
   * Ban an admin (only super admin can do this)
   */
  function banAdmin(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return { success: false, message: 'Adresse email invalide.' };
    }

    // Check if current user is super admin
    const currentAdmin = getCurrentAdmin();
    if (!currentAdmin || !isSuperAdmin(currentAdmin.email)) {
      return { success: false, message: '⛔ Seul le Super Admin peut bannir des administrateurs.' };
    }

    // Prevent banning super admin
    if (isSuperAdmin(normalizedEmail)) {
      return { success: false, message: '🔒 Impossible de bannir le Super Admin.' };
    }

    // Prevent banning yourself
    if (currentAdmin && normalizeEmail(currentAdmin.email) === normalizedEmail) {
      return { success: false, message: 'Vous ne pouvez pas vous bannir vous-même.' };
    }

    const admins = loadAdminList();
    
    // Check if admin exists
    const adminToBan = admins.find(admin => admin.email === normalizedEmail);
    if (!adminToBan) {
      return { success: false, message: 'Admin introuvable dans la liste.' };
    }

    // Mark admin as banned
    const updatedAdmins = admins.map(admin => {
      if (admin.email === normalizedEmail) {
        return {
          ...admin,
          banned: true,
          bannedAt: Date.now(),
          bannedBy: currentAdmin.email
        };
      }
      return admin;
    });

    if (saveAdminList(updatedAdmins)) {
      return { success: true, message: `Admin ${normalizedEmail} banni avec succès.`, bannedAdmin: adminToBan };
    }

    return { success: false, message: 'Impossible de sauvegarder les modifications.' };
  }

  /**
   * Unban an admin (only super admin can do this)
   */
  function unbanAdmin(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return { success: false, message: 'Adresse email invalide.' };
    }

    // Check if current user is super admin
    const currentAdmin = getCurrentAdmin();
    if (!currentAdmin || !isSuperAdmin(currentAdmin.email)) {
      return { success: false, message: '⛔ Seul le Super Admin peut débannir des administrateurs.' };
    }

    const admins = loadAdminList();
    
    // Unmark admin as banned
    const updatedAdmins = admins.map(admin => {
      if (admin.email === normalizedEmail && admin.banned) {
        const { banned, bannedAt, bannedBy, ...cleanAdmin } = admin;
        return cleanAdmin;
      }
      return admin;
    });

    if (saveAdminList(updatedAdmins)) {
      return { success: true, message: `Admin ${normalizedEmail} débanni avec succès.` };
    }

    return { success: false, message: 'Impossible de sauvegarder les modifications.' };
  }

  function ensureAdminProvision(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return false;

    const admins = loadAdminList();

    if (!admins.length) {
      const result = addAdmin(normalizedEmail, '', { addedBy: 'bootstrap' });
      if (result.success) {
        console.info('[AdminAuth] First admin auto-provisioned:', normalizedEmail);
        return true;
      }
      console.warn('[AdminAuth] Unable to auto-provision first admin');
      return false;
    }

    return admins.some(admin => admin.email === normalizedEmail);
  }

  /**
   * Initialize Google OAuth for admin
   */
  function initGoogleAuth() {
    return new Promise((resolve, reject) => {
      // Check if google-auth.js is loaded
      if (!window.GoogleAuth) {
        console.error('GoogleAuth not loaded. Make sure google-auth.js is included before admin-auth.js');
        reject(new Error('GoogleAuth not available'));
        return;
      }

      // Wait for GoogleAuth to be ready
      const checkReady = setInterval(() => {
        if (window.GoogleAuth && typeof window.GoogleAuth.isAuthenticated === 'function') {
          clearInterval(checkReady);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkReady);
        reject(new Error('GoogleAuth initialization timeout'));
      }, 10000);
    });
  }

  /**
   * Check admin authentication (password + Google)
   */
  async function checkAdminAuth() {
    // Check password authentication (existing system)
    const isPasswordAuth = localStorage.getItem('clipsou_admin_logged_in_v1') === '1';
    
    if (!isPasswordAuth) {
      return { authenticated: false, reason: 'password' };
    }

    // Check Google authentication
    try {
      await initGoogleAuth();
      
      if (!window.GoogleAuth.isAuthenticated()) {
        return { authenticated: false, reason: 'google_not_authenticated' };
      }

      const user = window.GoogleAuth.getCurrentUser();
      if (!user || !user.user || !user.user.email) {
        return { authenticated: false, reason: 'google_no_email' };
      }

      const email = user.user.email;
      
      // Auto-provision first admin if list is empty
      const provisioned = ensureAdminProvision(email);

      // Check if email is in admin list
      if (!provisioned && !isEmailAdmin(email)) {
        return { authenticated: false, reason: 'not_admin', email };
      }

      // Check if admin is banned (super admin cannot be banned)
      if (!isSuperAdmin(email)) {
        const admins = loadAdminList();
        const adminEntry = admins.find(admin => admin.email === normalizeEmail(email));
        if (adminEntry && adminEntry.banned) {
          return { authenticated: false, reason: 'banned', email, bannedBy: adminEntry.bannedBy };
        }
      }

      // Save current admin info
      saveCurrentAdmin({
        email: email,
        name: user.user.name || email,
        picture: user.user.picture || '',
        authenticatedAt: Date.now()
      });

      return { authenticated: true, admin: getCurrentAdmin() };
    } catch (error) {
      console.error('Error checking Google auth:', error);
      return { authenticated: false, reason: 'google_error', error };
    }
  }

  /**
   * Render admin list popup
   */
  function showAdminListPopup() {
    // Remove existing popup if any
    const existing = document.getElementById('adminListPopup');
    if (existing) existing.remove();

    // Invalidate cache to force reload from localStorage
    // This ensures we see the latest admin list from other sessions
    invalidateAdminCache();

    const admins = getAdminList();
    const currentAdmin = getCurrentAdmin();
    const isCurrentSuperAdmin = currentAdmin && isSuperAdmin(currentAdmin.email);

    // Create popup
    const popup = document.createElement('div');
    popup.id = 'adminListPopup';
    popup.className = 'admin-popup-overlay';
    
    const addAdminSection = isCurrentSuperAdmin ? `
      <div class="admin-add-section">
        <h3>Ajouter un admin</h3>
        <div class="admin-add-form">
          <label class="admin-add-field">
            <span>Email Google <strong class="required">*</strong></span>
            <input type="email" id="newAdminEmail" placeholder="email@gmail.com" autocomplete="off" spellcheck="false"/>
          </label>
          <label class="admin-add-field">
            <span>Nom complet</span>
            <input type="text" id="newAdminName" placeholder="Arthur Capon" autocomplete="off"/>
          </label>
          <div class="admin-add-actions">
            <button type="button" id="addAdminBtn" class="btn">Ajouter</button>
          </div>
        </div>
        <p class="muted small" id="adminAddHelper" hidden>Le nouvel admin pourra se connecter immédiatement via OAuth Google.</p>
      </div>
    ` : '';
    
    popup.innerHTML = `
      <div class="admin-popup">
        <div class="admin-popup-header">
          <h2>👥 Liste des Administrateurs</h2>
          <button type="button" class="admin-popup-close" title="Fermer">&times;</button>
        </div>
        
        <div class="admin-popup-body">
          <div class="admin-list-section">
            <div class="admin-list-header">
              <h3>Admins actuels (${admins.length})</h3>
              ${isCurrentSuperAdmin ? '<button type="button" id="exportAdminListBtn" class="btn secondary small" title="Copier la liste des admins">📋 Exporter</button>' : ''}
            </div>
            <div class="admin-list" id="adminListContent"></div>
          </div>

          ${addAdminSection}
        </div>
      </div>
    `;

    document.body.appendChild(popup);

    // Render admin list
    renderAdminList();

    // Event listeners
    popup.querySelector('.admin-popup-close').addEventListener('click', () => popup.remove());
    popup.addEventListener('click', (e) => {
      if (e.target === popup) popup.remove();
    });

    const emailInput = document.getElementById('newAdminEmail');
    const nameInput = document.getElementById('newAdminName');
    const addBtn = document.getElementById('addAdminBtn');
    const exportBtn = document.getElementById('exportAdminListBtn');
    const helper = document.getElementById('adminAddHelper');

    if (helper) {
      helper.hidden = admins.length === 0;
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', handleExportAdminList);
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => handleAddAdmin({ emailInput, nameInput, helper }));
    }

    if (emailInput) {
      emailInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleAddAdmin({ emailInput, nameInput, helper });
        }
      });
    }
  }

  /**
   * Render admin list in popup
   */
  function renderAdminList() {
    const container = document.getElementById('adminListContent');
    if (!container) return;

    const admins = getAdminList();
    const currentAdmin = getCurrentAdmin();

    if (admins.length === 0) {
      container.innerHTML = '<p class="muted">Aucun admin configuré. Ajoutez votre premier admin pour activer l\'accès OAuth.</p>';
      return;
    }

    const isCurrentSuperAdmin = currentAdmin && isSuperAdmin(currentAdmin.email);

    container.innerHTML = admins.map(admin => {
      const email = admin.email;
      const name = admin.name;
      const addedAt = formatAdminDate(admin.addedAt);
      const isCurrent = currentAdmin && normalizeEmail(currentAdmin.email) === email;
      const addedBy = normalizeEmail(admin.addedBy);
      const isSuperAdminUser = isSuperAdmin(email);
      const isBanned = admin.banned === true;

      const metaParts = [];
      if (addedAt) metaParts.push(`Ajouté le ${addedAt}`);
      if (addedBy && addedBy !== email) metaParts.push(`Par ${addedBy}`);

      return `
        <div class="admin-item ${isCurrent ? 'current' : ''} ${isBanned ? 'banned' : ''}" data-email="${email}">
          <div class="admin-info">
            <strong>${name || email}</strong>
            <span class="admin-email">${email}</span>
            ${metaParts.length ? `<span class="admin-date">${metaParts.join(' • ')}</span>` : ''}
            ${isCurrent ? '<span class="admin-badge" title="Vous êtes connecté avec ce compte">Vous</span>' : ''}
            ${isSuperAdminUser ? '<span class="admin-badge super" title="Super Administrateur">👑 Super Admin</span>' : ''}
            ${isBanned ? '<span class="admin-badge banned" title="Cet admin est banni">🚫 Banni</span>' : ''}
          </div>
          <div class="admin-actions">
            ${isCurrentSuperAdmin && !isCurrent && !isSuperAdminUser ? `<button type="button" class="btn secondary small admin-remove-btn" data-email="${email}">Retirer</button>` : ''}
            ${isCurrentSuperAdmin && !isCurrent && !isSuperAdminUser && !isBanned ? `<button type="button" class="btn danger small admin-ban-btn" data-email="${email}">Bannir</button>` : ''}
            ${isCurrentSuperAdmin && !isCurrent && !isSuperAdminUser && isBanned ? `<button type="button" class="btn primary small admin-unban-btn" data-email="${email}">Débannir</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.admin-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-email');
        if (email) {
          handleRemoveAdmin(email);
        }
      });
    });

    container.querySelectorAll('.admin-ban-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-email');
        if (email) {
          handleBanAdmin(email);
        }
      });
    });

    container.querySelectorAll('.admin-unban-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-email');
        if (email) {
          handleUnbanAdmin(email);
        }
      });
    });
  }

  /**
   * Handle add admin
   */
  function handleAddAdmin({ emailInput, nameInput, helper } = {}) {
    if (!emailInput) return;

    const rawEmail = emailInput.value;
    const rawName = nameInput ? nameInput.value : '';

    const normalized = normalizeEmail(rawEmail);
    if (!normalized) {
      alert('Veuillez saisir un email Google.');
      emailInput.focus();
      return;
    }

    if (!isEmailStructureValid(normalized)) {
      alert('Le format de l\'email semble incorrect. Exemple attendu : admin@gmail.com');
      emailInput.focus();
      return;
    }

    const result = addAdmin(normalized, rawName.trim());

    if (result.success) {
      if (emailInput) emailInput.value = '';
      if (nameInput) nameInput.value = '';
      if (helper) helper.hidden = false;
      renderAdminList();
      console.log('✓ Admin ajouté:', normalized);
    } else {
      alert(result.message);
    }
  }

  function handleExportAdminList() {
    const admins = getAdminList();
    if (!admins.length) {
      alert('Aucun administrateur à exporter. Ajoutez au moins un admin avant d\'exporter la liste.');
      return;
    }

    const payload = JSON.stringify(admins, null, 2);

    const notifySuccess = () => alert('✓ Liste des administrateurs copiée dans le presse-papier.');
    const notifyFailure = () => alert('Copie automatique impossible. Voici la liste :\n\n' + payload);

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(payload).then(notifySuccess).catch(notifyFailure);
      return;
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = payload;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) {
        notifySuccess();
        return;
      }
    } catch (error) {
      console.error('Clipboard fallback error:', error);
    }

    notifyFailure();
  }

  /**
   * Handle remove admin
   */
  function handleRemoveAdmin(email) {
    if (!confirm(`Voulez-vous vraiment retirer ${email} de la liste des admins ?`)) {
      return;
    }

    const result = removeAdmin(email);
    
    if (result.success) {
      renderAdminList();
      console.log('✓ Admin retiré:', email);
    } else {
      alert(result.message);
    }
  }

  /**
   * Handle ban admin
   */
  function handleBanAdmin(email) {
    if (!confirm(`⚠️ BANNIR ${email}\n\nCet administrateur ne pourra plus accéder au panneau admin.\n\nConfirmez-vous le bannissement ?`)) {
      return;
    }

    const result = banAdmin(email);
    
    if (result.success) {
      renderAdminList();
      alert(`✅ ${email} a été banni avec succès.\n\nCet admin ne peut plus se connecter au panneau.`);
      console.log('✓ Admin banni:', email);
    } else {
      alert(result.message);
    }
  }

  /**
   * Handle unban admin
   */
  function handleUnbanAdmin(email) {
    if (!confirm(`Débannir ${email} ?\n\nCet administrateur pourra à nouveau accéder au panneau admin.`)) {
      return;
    }

    const result = unbanAdmin(email);
    
    if (result.success) {
      renderAdminList();
      alert(`✅ ${email} a été débanni avec succès.`);
      console.log('✓ Admin débanni:', email);
    } else {
      alert(result.message);
    }
  }

  /**
   * Show admin info in header
   */
  function displayAdminInfo() {
    const admin = getCurrentAdmin();
    if (!admin) return;

    const authSection = document.querySelector('.auth');
    if (!authSection) return;

    // Add admin info display
    let infoDiv = document.getElementById('adminInfo');
    if (!infoDiv) {
      infoDiv = document.createElement('div');
      infoDiv.id = 'adminInfo';
      infoDiv.className = 'admin-info-display';
      authSection.insertBefore(infoDiv, authSection.firstChild);
    }

    const isSuper = isSuperAdmin(admin.email);
    
    infoDiv.innerHTML = `
      <div class="admin-profile">
        ${admin.picture ? `<img src="${admin.picture}" alt="${admin.name}" class="admin-avatar" />` : ''}
        <div class="admin-details">
          <strong>${admin.name} ${isSuper ? '<span class="admin-badge super mini" title="Super Administrateur">👑</span>' : ''}</strong>
          <span class="muted small">${admin.email}</span>
        </div>
      </div>
    `;
  }

  // Flag to prevent multiple auth checks
  let isAuthCheckInProgress = false;
  let hasShownAuthError = false;

  /**
   * Initialize admin authentication system
   */
  async function initAdminAuth() {
    // Prevent multiple simultaneous auth checks
    if (isAuthCheckInProgress) {
      console.log('⏳ Auth check already in progress, skipping...');
      return;
    }

    console.log('🔐 Initializing admin authentication...');
    isAuthCheckInProgress = true;

    try {
      // Check authentication
      const authResult = await checkAdminAuth();

      if (!authResult.authenticated) {
        console.log('❌ Admin authentication failed:', authResult.reason);
        
        // Clear admin session
        clearCurrentAdmin();
        
        // Check if we're on the login page or main admin page
        const loginEl = document.getElementById('login');
        const appEl = document.getElementById('app');
        const isLoginPage = loginEl && !loginEl.hidden && appEl && appEl.hidden;
        
        // If we're on login page, don't show error popup (let the login form handle it)
        if (isLoginPage) {
          console.log('📝 On login page, letting form handle authentication');
          return;
        }
        
        // Only show error once to prevent infinite loops
        if (hasShownAuthError) {
          console.log('⚠️ Already shown auth error, redirecting silently...');
          localStorage.removeItem('clipsou_admin_logged_in_v1');
          window.location.replace('./admin.html');
          return;
        }
        
        hasShownAuthError = true;
        
        // Show appropriate message based on reason
        let message = '';
        
        switch (authResult.reason) {
          case 'password':
            // Let the existing password system handle this
            return;
          case 'google_not_authenticated':
            message = '🔒 Session expirée\n\nVotre session Google a expiré. Vous allez être redirigé vers la page de connexion.';
            break;
          case 'not_admin':
            message = `❌ Accès refusé\n\nLe compte Google ${authResult.email} n'est pas autorisé.`;
            break;
          case 'google_error':
            message = '❌ Erreur d\'authentification Google\n\nVous allez être redirigé vers la page de connexion.';
            break;
          default:
            message = '❌ Authentification échouée\n\nRedirection vers la page de connexion...';
        }

        if (message) {
          alert(message);
          // Logout from admin
          localStorage.removeItem('clipsou_admin_logged_in_v1');
          
          // Always redirect to login page
          window.location.replace('./admin.html');
        }
        return;
      }

      console.log('✅ Admin authenticated:', authResult.admin.email);
      
      // Reset error flag on successful auth
      hasShownAuthError = false;
      
      // Update UI immediately
      displayAdminInfo();
      
      // Invalidate admin cache to force fresh data
      invalidateAdminCache();
    } finally {
      isAuthCheckInProgress = false;
    }
  }

  // Expose public API
  window.AdminAuth = {
    checkAdminAuth,
    showAdminListPopup,
    handleRemoveAdmin,
    handleBanAdmin,
    handleUnbanAdmin,
    isEmailAdmin,
    isSuperAdmin,
    getAdminList,
    getCurrentAdmin,
    initAdminAuth,
    displayAdminInfo,
    invalidateAdminCache
  };

  // Listen for Google Auth success to update UI immediately
  window.addEventListener('googleAuthSuccess', () => {
    console.log('[AdminAuth] 🎉 Google auth success detected, updating UI...');
    
    // Wait a bit for auth to settle
    setTimeout(async () => {
      try {
        // Re-check admin auth
        const authResult = await checkAdminAuth();
        
        if (authResult.authenticated) {
          console.log('[AdminAuth] ✅ Admin authenticated after Google login');
          
          // Reset error flag
          hasShownAuthError = false;
          
          // Update UI
          displayAdminInfo();
          
          // Invalidate cache to get fresh admin list
          invalidateAdminCache();
          
          // If admin list popup is open, refresh it
          const popup = document.getElementById('adminListPopup');
          if (popup) {
            console.log('[AdminAuth] Refreshing admin list popup after login');
            renderAdminList();
          }
        }
      } catch (error) {
        console.error('[AdminAuth] Error updating UI after Google login:', error);
      }
    }, 300);
  });

  // Listen for storage changes from other tabs/windows
  // This allows real-time updates when another admin modifies the list
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY_ADMINS) {
      console.log('[AdminAuth] Admin list changed in another tab, invalidating cache');
      invalidateAdminCache();
      
      // If admin list popup is open, refresh it
      const popup = document.getElementById('adminListPopup');
      if (popup) {
        console.log('[AdminAuth] Refreshing admin list popup');
        renderAdminList();
      }
    }
  });

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Small delay to ensure other scripts are loaded
      setTimeout(initAdminAuth, 500);
    });
  } else {
    setTimeout(initAdminAuth, 500);
  }
})();
