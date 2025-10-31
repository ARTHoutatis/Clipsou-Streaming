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
    console.log('[OAuth] Initializing Google Authentication...');
    
    // Get DOM elements
    googleSignInButton = document.getElementById('googleSignInButton');
    userInfoDiv = document.getElementById('userInfo');
    logoutBtn = document.getElementById('logoutBtn');
    authErrorDiv = document.getElementById('authError');

    if (!googleSignInButton) {
      console.error('[OAuth] Google Sign-In button not found');
      return;
    }

    // Check for local development mode
    if (isLocalDev()) {
      console.warn('[OAuth] 🚧 LOCAL DEVELOPMENT MODE - OAuth bypassed');
      console.log('%c🚧 MODE DÉVELOPPEMENT LOCAL', 'color: #f59e0b; font-size: 16px; font-weight: bold;');
      console.log('%cOAuth Google et vérifications de vidéo désactivés pour faciliter les tests.', 'color: #fbbf24;');
      console.log('%cConsultez DEV_MODE.md pour plus d\'informations.', 'color: #fbbf24;');
      
      // Check if dev user already exists
      const savedAuth = getSavedAuth();
      if (savedAuth && isAuthValid(savedAuth)) {
        console.log('[OAuth] Using saved dev user');
        currentUser = savedAuth;
        showMainContent();
        return;
      }

      // Create dev login button
      googleSignInButton.innerHTML = '';
      const devBtn = document.createElement('button');
      devBtn.className = 'btn primary';
      devBtn.style.cssText = 'display: flex; align-items: center; gap: 12px; font-size: 16px; padding: 14px 32px; background: #f59e0b;';
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
        
        // Show dev mode notice
        setTimeout(() => {
          alert('🚧 MODE DÉVELOPPEMENT\n\nVous êtes connecté avec un compte de test local.\nCe mode permet de tester les fonctionnalités sans OAuth Google.\n\nEmail: dev@localhost.test\nChaîne: Dev Test Channel');
        }, 500);
      };
      
      googleSignInButton.appendChild(devBtn);
      
      // Add dev mode indicator
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
      devNotice.innerHTML = '🚧 <strong>Mode développement local</strong> - Les vérifications OAuth sont désactivées';
      googleSignInButton.appendChild(devNotice);
      
      return;
    }

    // Check if user is already authenticated (production)
    const savedAuth = getSavedAuth();
    if (savedAuth && isAuthValid(savedAuth)) {
      console.log('[OAuth] Valid authentication found in storage');
      currentUser = savedAuth;
      showMainContent();
      return;
    }

    // Initialize Google Sign-In (production)
    initializeGoogleSignIn();
  }

  /**
   * Initialize Google Sign-In button
   */
  function initializeGoogleSignIn() {
    if (typeof google === 'undefined' || !google.accounts) {
      console.warn('[OAuth] Google Identity Services not loaded yet, retrying...');
      setTimeout(initializeGoogleSignIn, 100);
      return;
    }

    const config = window.ClipsouConfig?.google;
    if (!config || !config.clientId) {
      showAuthError('Configuration OAuth manquante');
      console.error('[OAuth] Google OAuth configuration not found in ClipsouConfig');
      return;
    }

    console.log('[OAuth] Rendering Google Sign-In button');

    try {
      // Initialize OAuth client
      const client = google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: config.scopes,
        callback: handleGoogleResponse
      });

      // Create custom sign-in button
      const button = document.createElement('button');
      button.className = 'btn primary';
      button.style.cssText = 'display: flex; align-items: center; gap: 12px; font-size: 16px; padding: 14px 32px;';
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Se connecter avec Google
      `;
      
      button.onclick = () => {
        console.log('[OAuth] User clicked sign-in button');
        button.disabled = true;
        button.textContent = 'Connexion...';
        
        try {
          client.requestAccessToken();
        } catch (error) {
          console.error('[OAuth] Error requesting access token:', error);
          showAuthError('Erreur lors de la connexion. Veuillez réessayer.');
          button.disabled = false;
          button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Se connecter avec Google
          `;
        }
      };

      googleSignInButton.innerHTML = '';
      googleSignInButton.appendChild(button);

    } catch (error) {
      console.error('[OAuth] Error initializing Google Sign-In:', error);
      showAuthError('Erreur d\'initialisation de la connexion Google');
    }
  }

  /**
   * Handle Google OAuth response
   */
  async function handleGoogleResponse(response) {
    console.log('[OAuth] Received response from Google');
    
    if (response.error) {
      console.error('[OAuth] Error from Google:', response.error);
      showAuthError(`Erreur: ${response.error}`);
      
      // Reset button
      const button = googleSignInButton.querySelector('button');
      if (button) {
        button.disabled = false;
        button.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Se connecter avec Google
        `;
      }
      return;
    }

    try {
      const accessToken = response.access_token;
      console.log('[OAuth] Access token received, fetching user info...');

      // Fetch user info
      const userInfo = await fetchUserInfo(accessToken);
      console.log('[OAuth] User info received:', userInfo.email);

      // Fetch YouTube channel info
      console.log('[OAuth] Fetching YouTube channel info...');
      const channelInfo = await fetchYouTubeChannel(accessToken);
      
      if (!channelInfo) {
        showAuthError('Aucune chaîne YouTube trouvée pour ce compte. Vous devez avoir une chaîne YouTube pour soumettre un film.');
        return;
      }

      console.log('[OAuth] Channel info received:', channelInfo.title);

      // Save authentication data
      const authData = {
        accessToken,
        expiresAt: Date.now() + (3600 * 1000), // 1 hour
        user: userInfo,
        channel: channelInfo,
        authenticatedAt: Date.now()
      };

      saveAuth(authData);
      currentUser = authData;

      console.log('[OAuth] Authentication successful');
      showMainContent();

    } catch (error) {
      console.error('[OAuth] Error during authentication:', error);
      showAuthError('Erreur lors de la récupération des informations. Veuillez réessayer.');
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
    
    const devBadge = isLocalDev() ? '<span style="background: #f59e0b; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 8px;">DEV</span>' : '';
    
    userInfoDiv.innerHTML = `
      ${user.picture ? `<img src="${user.picture}" alt="${user.name}">` : ''}
      <div class="user-info-text">
        <div class="user-info-name">${user.name}${devBadge}</div>
        <div class="user-info-channel">📺 ${channel.title}</div>
      </div>
    `;
    userInfoDiv.hidden = false;
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
    
    setTimeout(() => {
      authErrorDiv.hidden = true;
    }, 5000);
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
    return currentUser !== null;
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
    
    // Skip verification in local dev mode
    if (isLocalDev()) {
      console.warn('[OAuth] 🚧 DEV MODE - Skipping video ownership verification');
      return { 
        valid: true, 
        videoTitle: 'Dev Test Video (verification bypassed)'
      };
    }
    
    if (!currentUser || !currentUser.accessToken) {
      return { valid: false, error: 'Non authentifié' };
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
    isLocalDev
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGoogleAuth);
  } else {
    initGoogleAuth();
  }

})();
