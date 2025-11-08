/**
 * Google OAuth Authentication Module
 * Handles user authentication and YouTube channel verification
 */

(function() {
  'use strict';

  // Storage keys for authentication
  const STORAGE_KEY_AUTH = 'google_auth_data';
  const STORAGE_KEY_USER = 'google_user_data';
  const STORAGE_KEY_CHANNEL = 'youtube_channel_data';

  // DOM elements
  let googleSignInButton, userInfoDiv, logoutBtn, authErrorDiv;
  let googleButton = null; // Référence au bouton Google pour mise à jour dynamique
  let realOAuthButton = null; // Référence au bouton OAuth réel (mode dev)

  // OAuth state
  let tokenClient = null;
  let initPromise = null;
  let silentAuthAttempted = false;
  let refreshTimer = null;

  const GOOGLE_ICON_SVG = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      `;
  
  function getGoogleButtonHTML() {
    // Vérifier la langue actuelle dans localStorage
    const currentLang = localStorage.getItem('site_language') || 'fr';
    let text = 'Se connecter à Google'; // Défaut français
    
    if (window.i18n) {
      text = window.i18n.translate('request.auth.google');
      console.log('[Google Button] Using i18n translation:', text, '(lang:', window.i18n.getCurrentLanguage() + ')');
    } else if (currentLang === 'en') {
      text = 'Sign in with Google'; // Fallback anglais si i18n pas chargé
      console.log('[Google Button] Using fallback EN:', text);
    } else {
      console.log('[Google Button] Using fallback FR:', text);
    }
    
    return GOOGLE_ICON_SVG + text;
  }

  // Authentication state
  let googleAuth = null;
  let currentUser = null;

  /**
   * Check if running in local development mode
   */
  function isLocalDev() {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '';
  }

  /**
   * Check if user wants to force real OAuth in local mode
   */
  function shouldForceRealOAuth() {
    // Check URL parameter ?oauth=true or ?oauth=real
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('oauth') === 'true' || urlParams.get('oauth') === 'real') {
      return true;
    }
    
    // Check localStorage preference
    const preference = localStorage.getItem('clipsou_force_real_oauth');
    return preference === 'true';
  }

  /**
   * Set OAuth preference for local development
   */
  function setOAuthPreference(useRealOAuth) {
    localStorage.setItem('clipsou_force_real_oauth', useRealOAuth ? 'true' : 'false');
  }

  /**
   * Create fake dev user for local testing
   */
  function createDevUser() {
    return {
      accessToken: 'dev_token_' + Date.now(),
      expiresAt: Date.now() + (24 * 3600 * 1000), // 24 hours
      user: {
        email: 'dev@localhost.test',
        name: 'Dev User (Local)',
        id: 'dev_' + Date.now(),
        picture: 'https://via.placeholder.com/100/4ade80/ffffff?text=DEV'
      },
      channel: {
        id: 'UCDevChannel123456789',
        title: 'Dev Test Channel',
        thumbnail: '',
        customUrl: '@devtestchannel',
        description: 'Development test channel for local testing'
      },
      authenticatedAt: Date.now()
    };
  }

  /**
   * Initialize Google OAuth
   */
  function initGoogleAuth() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      console.log('[OAuth] Initializing Google Authentication...');

      // Get DOM elements
      googleSignInButton = document.getElementById('googleSignInButton');
      userInfoDiv = document.getElementById('userInfo');
      logoutBtn = document.getElementById('logoutBtn');
      authErrorDiv = document.getElementById('authError');

      if (!googleSignInButton) {
        console.error('[OAuth] Google Sign-In button not found');
        return currentUser;
      }

      // Hide user info and logout button by default (will be shown when user is authenticated)
      if (userInfoDiv) userInfoDiv.hidden = true;
      if (logoutBtn) logoutBtn.hidden = true;

      // Check for local development mode
      if (isLocalDev() && !shouldForceRealOAuth()) {
        console.warn('[OAuth] 🚧 LOCAL DEVELOPMENT MODE - OAuth bypassed');
        console.log('%c🚧 MODE DÉVELOPPEMENT LOCAL', 'color: #f59e0b; font-size: 16px; font-weight: bold;');
        console.log('%cOAuth Google et vérifications de vidéo désactivés pour faciliter les tests.', 'color: #fbbf24;');
        console.log('%cPour tester l\'OAuth réel en local : ajoutez ?oauth=true à l\'URL', 'color: #fbbf24;');

        const savedDevAuth = getSavedAuth();
        if (savedDevAuth && isAuthValid(savedDevAuth)) {
          console.log('[OAuth] Using saved dev user');
          currentUser = savedDevAuth;
          showMainContent();
          return currentUser;
        }

        googleSignInButton.innerHTML = '';

        const devBtn = document.createElement('button');
        devBtn.className = 'btn primary';
        devBtn.style.cssText = 'display: inline-flex; align-items: center; gap: 12px; font-size: 16px; padding: 14px 32px; background: #f59e0b;';
        devBtn.innerHTML = `
          <span>🚧</span>
          Se connecter en mode DEV (Local)
        `;

        devBtn.onclick = () => {
          console.log('[OAuth] Creating dev user for local testing');
          const devUser = createDevUser();
          saveAuth(devUser);
          currentUser = devUser;
          showMainContent();

          setTimeout(() => {
            alert('🚧 MODE DÉVELOPPEMENT\n\nVous êtes connecté avec un compte de test local.\nCe mode permet de tester les fonctionnalités sans OAuth Google.\n\nEmail: dev@localhost.test\nChaîne: Dev Test Channel');
          }, 500);
        };

        googleSignInButton.appendChild(devBtn);

        const realOAuthBtn = document.createElement('button');
        realOAuthBtn.className = 'btn secondary';
        realOAuthBtn.style.cssText = 'display: inline-flex; align-items: center; gap: 12px; font-size: 16px; padding: 14px 32px; margin-top: 12px;';
        const currentLang = localStorage.getItem('site_language') || 'fr';
        const googleText = window.i18n ? window.i18n.translate('request.auth.google') : (currentLang === 'en' ? 'Sign in with Google' : 'Se connecter à Google');
        realOAuthBtn.innerHTML = getGoogleButtonHTML().replace(googleText, 'Tester OAuth Google réel');

        realOAuthBtn.onclick = () => {
          console.log('[OAuth] Switching to real OAuth mode');
          setOAuthPreference(true);
          window.location.reload();
        };

        // Stocker la référence globale pour mise à jour dynamique
        realOAuthButton = realOAuthBtn;

        googleSignInButton.appendChild(realOAuthBtn);

        const devNotice = document.createElement('div');
        devNotice.style.cssText = `
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fbbf24;
          padding: 12px 16px;
          border-radius: 8px;
          margin-top: 16px;
          font-size: 14px;
          text-align: center;
        `;
        devNotice.innerHTML = '🚧 <strong>Mode développement local</strong> - Les vérifications OAuth sont désactivées<br><small>Cliquez sur "Tester OAuth Google réel" pour activer l\'authentification Google</small>';
        googleSignInButton.appendChild(devNotice);

        return currentUser;
      }

      if (isLocalDev() && shouldForceRealOAuth()) {
        console.log('[OAuth] 🔐 LOCAL MODE with REAL OAuth enabled');
        console.log('%c🔐 OAuth Google activé en local', 'color: #2563eb; font-size: 16px; font-weight: bold;');
      }

      const savedAuth = getSavedAuth();
      if (savedAuth && isAuthValid(savedAuth)) {
        console.log('[OAuth] Valid authentication found in storage');
        currentUser = savedAuth;
        showMainContent();
        
        // Calculate time until token expires
        const timeUntilExpiry = Math.floor((savedAuth.expiresAt - Date.now()) / 1000);
        
        // If token expires in less than 5 minutes or already expired, refresh immediately
        if (timeUntilExpiry < 300) {
          console.log('[OAuth] Token expires soon or expired, attempting silent refresh...');
          // Attempt silent refresh in background without blocking UI
          refreshAccessToken(savedAuth).then(success => {
            if (success) {
              console.log('[OAuth] Token refreshed successfully');
            } else {
              console.log('[OAuth] Silent refresh failed, but keeping session active');
              // Keep session active anyway for 30 days since last auth
            }
          });
        } else {
          scheduleTokenRefresh(timeUntilExpiry);
        }
        
        return currentUser;
      }

      await initializeGoogleSignIn(savedAuth);
      return currentUser;
    })();

    return initPromise;
  }

  /**
   * Initialize Google Sign-In button
   */
  async function initializeGoogleSignIn(savedAuth) {
    try {
      await waitForGoogleLibrary();
    } catch (error) {
      console.error('[OAuth] Google Identity Services failed to load', error);
      showAuthError('Impossible de charger les services Google.');
      return;
    }

    const config = window.ClipsouConfig?.google;
    if (!config || !config.clientId) {
      showAuthError('Configuration OAuth manquante');
      console.error('[OAuth] Google OAuth configuration not found in ClipsouConfig');
      return;
    }

    console.log('[OAuth] Rendering Google Sign-In button');

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: config.scopes,
      callback: () => {}
    });

    const button = document.createElement('button');
    button.className = 'btn primary';
    button.style.cssText = 'display: inline-flex; align-items: center; gap: 12px; font-size: 16px; padding: 14px 32px;';
    button.innerHTML = getGoogleButtonHTML();
    
    // Stocker la référence globale pour mise à jour dynamique
    googleButton = button;

    button.onclick = () => {
      console.log('[OAuth] User clicked sign-in button');
      const previousHTML = button.innerHTML;
      button.disabled = true;
      button.textContent = 'Connexion...';

      let hasReceivedResponse = false;

      // Timeout de sécurité : si aucune réponse après 30 secondes, réactiver le bouton
      const safetyTimeout = setTimeout(() => {
        if (!hasReceivedResponse) {
          console.warn('[OAuth] No response from Google after 30s, re-enabling button');
          button.disabled = false;
          button.innerHTML = previousHTML;
        }
      }, 30000);

      // Détecter si l'utilisateur ferme la popup et revient sur la page
      // sans avoir complété l'authentification
      const handleFocus = () => {
        setTimeout(() => {
          if (!hasReceivedResponse && button.disabled) {
            console.log('[OAuth] User returned to page without completing auth, re-enabling button');
            clearTimeout(safetyTimeout);
            button.disabled = false;
            button.innerHTML = previousHTML;
            window.removeEventListener('focus', handleFocus);
          }
        }, 1000); // Délai de 1 seconde pour laisser le temps à Google de répondre
      };
      window.addEventListener('focus', handleFocus, { once: true });

      try {
        tokenClient.callback = (response) => {
          // Annuler le timeout de sécurité puisqu'on a une réponse
          hasReceivedResponse = true;
          clearTimeout(safetyTimeout);
          window.removeEventListener('focus', handleFocus);
          
          handleTokenResponse(response, { button, previousHTML }).then((success) => {
            if (success) {
              // nothing to do, showMainContent already called
            }
          });
        };
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (error) {
        hasReceivedResponse = true;
        clearTimeout(safetyTimeout);
        window.removeEventListener('focus', handleFocus);
        console.error('[OAuth] Error requesting access token:', error);
        showAuthError('Erreur lors de la connexion. Veuillez réessayer.');
        button.disabled = false;
        button.innerHTML = previousHTML;
      }
    };

    googleSignInButton.innerHTML = '';
    googleSignInButton.appendChild(button);

    if (savedAuth && !isAuthValid(savedAuth) && !silentAuthAttempted) {
      await attemptSilentSignIn(savedAuth);
    }
  }

  function waitForGoogleLibrary() {
    if (typeof google !== 'undefined' && google.accounts) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100; // ~10s with 100ms interval
      const interval = setInterval(() => {
        attempts += 1;
        if (typeof google !== 'undefined' && google.accounts) {
          clearInterval(interval);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('Google Identity Services not available'));
        }
      }, 100);
    });
  }

  async function attemptSilentSignIn(savedAuth) {
    if (silentAuthAttempted) return;
    silentAuthAttempted = true;

    if (isLocalDev() && !shouldForceRealOAuth()) {
      return;
    }

    const success = await refreshAccessToken(savedAuth);
    if (!success) {
      console.warn('[OAuth] Silent sign-in failed, but keeping session active for 30 days');
      // Don't clear auth - let the user stay connected for 30 days
    }
  }

  function scheduleTokenRefresh(expiresInSeconds) {
    if (!expiresInSeconds || isLocalDev() && !shouldForceRealOAuth()) {
      return;
    }

    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    const safetyWindow = Math.max((expiresInSeconds - 120) * 1000, 15000);
    refreshTimer = setTimeout(() => {
      refreshAccessToken();
    }, safetyWindow);
  }

  async function refreshAccessToken(existingAuth = null) {
    if (isLocalDev() && !shouldForceRealOAuth()) {
      return true;
    }

    const savedAuth = existingAuth || getSavedAuth();
    if (!savedAuth) {
      // Don't clear auth immediately, just return false
      console.warn('[OAuth] No saved auth to refresh');
      return false;
    }

    try {
      await waitForGoogleLibrary();

      const config = window.ClipsouConfig?.google;
      if (!config || !config.clientId) {
        console.error('[OAuth] Impossible de rafraîchir le token: configuration manquante');
        // Don't clear auth, just fail silently
        return false;
      }

      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: config.clientId,
          scope: config.scopes,
          callback: () => {}
        });
      }

      return await new Promise((resolve) => {
        tokenClient.callback = (response) => {
          handleTokenResponse(response, { silent: true, savedAuth }).then(resolve);
        };

        try {
          tokenClient.requestAccessToken({ prompt: 'none' });
        } catch (error) {
          console.warn('[OAuth] Silent refresh failed, but keeping session active:', error);
          // Don't clear auth, just fail silently
          resolve(false);
        }
      });
    } catch (error) {
      console.warn('[OAuth] Error refreshing access token, but keeping session active:', error);
      // Don't clear auth, just fail silently
      return false;
    }
  }

  /**
   * Handle Google OAuth response
   */
  async function handleTokenResponse(response, options = {}) {
    const { button, previousHTML, silent = false, savedAuth = null } = options;
    console.log('[OAuth] Received response from Google');

    if (response.error) {
      if (silent) {
        console.warn('[OAuth] Silent token request failed:', response.error);
        // Don't clear auth even if consent/interaction required
        // Let the session stay active for 30 days
        console.log('[OAuth] Keeping session active despite refresh failure');
      } else {
        console.error('[OAuth] Error from Google:', response.error);
        showAuthError(`Erreur: ${response.error}`);
        if (button) {
          button.disabled = false;
          button.innerHTML = previousHTML || getGoogleButtonHTML();
        }
      }
      return false;
    }

    const expiresInSeconds = Number(response.expires_in || 3600);

    try {
      if (silent && savedAuth) {
        const refreshedAuth = {
          ...savedAuth,
          accessToken: response.access_token,
          expiresAt: Date.now() + expiresInSeconds * 1000,
          authenticatedAt: Date.now()
        };
        saveAuth(refreshedAuth);
        currentUser = refreshedAuth;
        scheduleTokenRefresh(expiresInSeconds);
        showMainContent();
        return true;
      }

      const accessToken = response.access_token;
      console.log('[OAuth] Access token received, fetching user info...');

      const userInfo = await fetchUserInfo(accessToken);
      console.log('[OAuth] User info received:', userInfo.email);

      console.log('[OAuth] Fetching YouTube channel info...');
      const channelInfo = await fetchYouTubeChannel(accessToken);

      if (!channelInfo) {
        showAuthError('Aucune chaîne YouTube trouvée pour ce compte. Vous devez avoir une chaîne YouTube pour soumettre un film.');
        if (button) {
          button.disabled = false;
          button.innerHTML = previousHTML || getGoogleButtonHTML();
        }
        return false;
      }

      console.log('[OAuth] Channel info received:', channelInfo.title);

      const authData = {
        accessToken,
        expiresAt: Date.now() + expiresInSeconds * 1000,
        user: userInfo,
        channel: channelInfo,
        authenticatedAt: Date.now()
      };

      saveAuth(authData);
      currentUser = authData;
      console.log('[OAuth] Authentication successful');
      scheduleTokenRefresh(expiresInSeconds);
      showMainContent();
      return true;
    } catch (error) {
      console.error('[OAuth] Error during authentication:', error);
      showAuthError('Erreur lors de la récupération des informations. Veuillez réessayer.');
      if (silent) {
        console.warn('[OAuth] Silent refresh error, but keeping session active');
        // Don't clear auth - let session stay active
      }
      return false;
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = previousHTML || getGoogleButtonHTML();
      }
    }
  }

  /**
   * Fetch user info from Google
   */
  async function fetchUserInfo(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return await response.json();
  }

  /**
   * Fetch YouTube channel info
   */
  async function fetchYouTubeChannel(accessToken) {
    const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch YouTube channel');
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const channel = data.items[0];
    return {
      id: channel.id,
      title: channel.snippet.title,
      thumbnail: channel.snippet.thumbnails?.default?.url || '',
      customUrl: channel.snippet.customUrl || '',
      description: channel.snippet.description || ''
    };
  }

  /**
   * Show main content (authenticated)
   */
  function showMainContent() {
    if (!currentUser) return;

    // Masquer le message d'erreur d'authentification si visible
    if (authErrorDiv) {
      authErrorDiv.hidden = true;
    }

    // Check if user is banned
    const userEmail = currentUser?.user?.email;
    const channelId = currentUser?.channel?.id;
    
    if (window.ClipsouAdmin && typeof window.ClipsouAdmin.isUserBanned === 'function') {
      if (window.ClipsouAdmin.isUserBanned(userEmail, channelId)) {
        setTimeout(() => {
          alert('⚠️ Votre compte a été banni.\n\nVous ne pouvez plus soumettre de demandes sur Clipsou Streaming.\n\nSi vous pensez qu\'il s\'agit d\'une erreur, veuillez contacter l\'administrateur.');
        }, 500);
      }
    }

    // Display user info in header
    displayUserInfo();

    // Show logout button
    if (logoutBtn) {
      logoutBtn.hidden = false;
      logoutBtn.onclick = handleLogout;
    }

    // Show the "Next" button on step 1 for authenticated users
    const authNextNav = document.getElementById('authNextNav');
    if (authNextNav) {
      authNextNav.hidden = false;
    }

    // Hide the Google Sign-In button if user is already logged in
    const googleSignInButton = document.getElementById('googleSignInButton');
    if (googleSignInButton) {
      googleSignInButton.style.display = 'none';
    }

    // Navigate to step 2 (Terms) only if on step 1
    // Use a small delay to ensure the slide system is initialized
    setTimeout(() => {
      if (typeof window.goToSlide === 'function' && typeof window.currentSlide !== 'undefined') {
        // Only auto-navigate if we're on step 1
        if (window.currentSlide === 1) {
          window.goToSlide(2);
        }
      } else {
        console.warn('[OAuth] Slide navigation not available yet');
      }
    }, 100);
  }

  /**
   * Display user information
   */
  function displayUserInfo() {
    if (!userInfoDiv || !currentUser) return;

    const { user, channel } = currentUser;
    
    // Show different badge based on mode
    let badge = '';
    if (isLocalDev()) {
      if (shouldForceRealOAuth()) {
        badge = '<span style="background: #2563eb; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 8px;">LOCAL + OAuth Réel</span>';
      } else {
        badge = '<span style="background: #f59e0b; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 8px;">DEV</span>';
      }
    }
    
    userInfoDiv.innerHTML = `
      ${user.picture ? `<img src="${user.picture}" alt="${user.name}">` : ''}
      <div class="user-info-text">
        <div class="user-info-name">${user.name}${badge}</div>
        <div class="user-info-channel">📺 ${channel.title}</div>
      </div>
    `;
    userInfoDiv.hidden = false;
    
    // Add a button to switch back to DEV mode if in local + real OAuth
    if (isLocalDev() && shouldForceRealOAuth()) {
      const switchBtn = document.createElement('button');
      switchBtn.className = 'btn secondary';
      switchBtn.style.cssText = 'margin-top: 8px; font-size: 13px; padding: 8px 12px; height: auto;';
      switchBtn.textContent = '↩️ Revenir en mode DEV';
      switchBtn.title = 'Désactiver OAuth réel et revenir au mode développement';
      switchBtn.onclick = () => {
        if (confirm('Revenir en mode développement local (sans OAuth réel) ?')) {
          setOAuthPreference(false);
          clearAuth();
          window.location.reload();
        }
      };
      
      // Find the auth section or user info container to append the button
      const authSection = document.querySelector('.auth-section') || document.querySelector('.slide[data-slide="1"]');
      if (authSection && !document.getElementById('switchToDevBtn')) {
        switchBtn.id = 'switchToDevBtn';
        authSection.appendChild(switchBtn);
      }
    }
  }

  /**
   * Handle logout
   */
  function handleLogout() {
    console.log('[OAuth] User logging out');
    
    // Clear authentication data
    clearAuth();
    currentUser = null;

    // Hide user info and logout button
    if (userInfoDiv) userInfoDiv.hidden = true;
    if (logoutBtn) logoutBtn.hidden = true;

    // Masquer le message d'erreur d'authentification si visible
    if (authErrorDiv) {
      authErrorDiv.hidden = true;
    }

    // Hide the "Next" button on step 1
    const authNextNav = document.getElementById('authNextNav');
    if (authNextNav) {
      authNextNav.hidden = true;
    }

    // Show the Google Sign-In button again
    const googleSignInButton = document.getElementById('googleSignInButton');
    if (googleSignInButton) {
      googleSignInButton.style.display = '';
    }

    // Navigate back to step 1 (login)
    if (typeof window.goToSlide === 'function') {
      window.goToSlide(1);
    }
    
    // Re-initialize Google Sign-In
    initializeGoogleSignIn();
  }

  /**
   * Show authentication error
   */
  function showAuthError(message) {
    if (!authErrorDiv) return;
    authErrorDiv.textContent = `⚠️ ${message}`;
    authErrorDiv.hidden = false;
    
    // Si c'est l'erreur de chaîne YouTube manquante, garder le message visible
    // jusqu'à reconnexion ou fermeture de page
    const isYouTubeChannelError = message.includes('chaîne YouTube');
    
    if (!isYouTubeChannelError) {
      // Pour les autres erreurs, masquer après 5 secondes
      setTimeout(() => {
        authErrorDiv.hidden = true;
      }, 5000);
    }
    // Sinon, le message reste affiché indéfiniment
  }

  /**
   * Save authentication data to localStorage
   */
  function saveAuth(authData) {
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authData));
    } catch (error) {
      console.error('[OAuth] Error saving auth data:', error);
    }
  }

  /**
   * Get saved authentication data
   */
  function getSavedAuth() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_AUTH);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[OAuth] Error reading auth data:', error);
      return null;
    }
  }

  /**
   * Check if authentication is still valid
   */
  function isAuthValid(authData) {
    if (!authData || !authData.expiresAt) return false;
    
    // For admins and dev users, extend session validity significantly
    // Check if this is a dev user or if user has been authenticated recently
    if (authData.user && (authData.user.email?.includes('dev@localhost') || authData.authenticatedAt)) {
      // Consider valid for 30 days from last authentication
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const sessionAge = Date.now() - (authData.authenticatedAt || 0);
      
      // If session is less than 30 days old, consider it valid
      if (sessionAge < thirtyDaysMs) {
        return true;
      }
    }
    
    return Date.now() < authData.expiresAt;
  }

  /**
   * Clear authentication data
   */
  function clearAuth() {
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch (error) {
      console.error('[OAuth] Error clearing auth data:', error);
    }
    currentUser = null;
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  /**
   * Get current authenticated user
   */
  function getCurrentUser() {
    return currentUser;
  }

  /**
   * Get YouTube channel info for current user
   */
  function getYouTubeChannel() {
    return currentUser?.channel || null;
  }

  /**
   * Check if user is authenticated
   */
  function isAuthenticated() {
    if (currentUser && isAuthValid(currentUser)) {
      return true;
    }
    const savedAuth = getSavedAuth();
    if (savedAuth && isAuthValid(savedAuth)) {
      currentUser = savedAuth;
      return true;
    }
    return false;
  }

  /**
   * Extract video ID from YouTube URL
   */
  function extractVideoId(url) {
    if (!url) return null;
    
    // Patterns pour différents formats d'URL YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // ID direct
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Verify that a YouTube video belongs to the authenticated user's channel
   * @param {string} videoUrl - YouTube video URL or ID
   * @returns {Promise<{valid: boolean, error?: string, videoTitle?: string}>}
   */
  async function verifyVideoOwnership(videoUrl) {
    console.log('[OAuth] Verifying video ownership for:', videoUrl);
    
    // Skip verification in local dev mode ONLY if not using real OAuth
    if (isLocalDev() && !shouldForceRealOAuth()) {
      console.warn('[OAuth] 🚧 DEV MODE - Skipping video ownership verification');
      return { 
        valid: true, 
        videoTitle: 'Dev Test Video (verification bypassed)'
      };
    }
    
    // If in local mode with real OAuth, log it
    if (isLocalDev() && shouldForceRealOAuth()) {
      console.log('[OAuth] 🔐 LOCAL MODE with REAL OAuth - Performing real video verification');
    }
    
    if (!currentUser || !currentUser.accessToken) {
      return { valid: false, error: 'Non authentifié' };
    }

    // Try to refresh token if close to expiry
    if (currentUser.expiresAt && Date.now() > currentUser.expiresAt - 60000) {
      console.log('[OAuth] Token expiring soon, attempting refresh for video verification...');
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        console.warn('[OAuth] Token refresh failed, but continuing with expired token');
        // Continue anyway - the token might still work or we'll get a proper API error
      }
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return { valid: false, error: 'URL YouTube invalide' };
    }

    try {
      // Récupérer les informations de la vidéo
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${currentUser.accessToken}`
          }
        }
      );

      if (!response.ok) {
        console.error('[OAuth] YouTube API error:', response.status);
        return { valid: false, error: 'Erreur lors de la vérification de la vidéo' };
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return { valid: false, error: 'Vidéo introuvable ou privée' };
      }

      const video = data.items[0];
      const videoChannelId = video.snippet.channelId;
      const videoTitle = video.snippet.title;
      const userChannelId = currentUser.channel.id;

      console.log('[OAuth] Video channel:', videoChannelId);
      console.log('[OAuth] User channel:', userChannelId);

      if (videoChannelId !== userChannelId) {
        return {
          valid: false,
          error: `Cette vidéo appartient à une autre chaîne (${video.snippet.channelTitle}). Vous ne pouvez soumettre que vos propres vidéos.`,
          videoTitle
        };
      }

      console.log('[OAuth] ✅ Video ownership verified');
      return { valid: true, videoTitle };

    } catch (error) {
      console.error('[OAuth] Error verifying video:', error);
      return { valid: false, error: 'Erreur lors de la vérification de la vidéo' };
    }
  }

  // Expose public API
  window.GoogleAuth = {
    init: initGoogleAuth,
    getCurrentUser,
    getYouTubeChannel,
    isAuthenticated,
    logout: handleLogout,
    verifyVideoOwnership,
    isLocalDev,
    shouldForceRealOAuth,
    setOAuthPreference,
    refreshAccessToken
  };

  // Écouteurs globaux pour la traduction dynamique du bouton Google
  document.addEventListener('i18nReady', () => {
    console.log('[Google Button] i18n ready, updating button');
    if (googleButton && !googleButton.disabled) {
      googleButton.innerHTML = getGoogleButtonHTML();
    }
    if (realOAuthButton) {
      const currentLang = localStorage.getItem('site_language') || 'fr';
      const googleText = window.i18n ? window.i18n.translate('request.auth.google') : (currentLang === 'en' ? 'Sign in with Google' : 'Se connecter à Google');
      realOAuthButton.innerHTML = getGoogleButtonHTML().replace(googleText, 'Tester OAuth Google réel');
    }
  }, { once: true });

  document.addEventListener('languageChanged', () => {
    console.log('[Google Button] Language changed, updating button');
    if (googleButton && !googleButton.disabled) {
      googleButton.innerHTML = getGoogleButtonHTML();
    }
    if (realOAuthButton) {
      const currentLang = localStorage.getItem('site_language') || 'fr';
      const googleText = window.i18n ? window.i18n.translate('request.auth.google') : (currentLang === 'en' ? 'Sign in with Google' : 'Se connecter à Google');
      realOAuthButton.innerHTML = getGoogleButtonHTML().replace(googleText, 'Tester OAuth Google réel');
    }
  });

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initGoogleAuth(); });
  } else {
    initGoogleAuth();
  }

})();
