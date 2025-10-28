/**
 * User Film Request System
 * Allows users to submit film requests with rate limiting (1 per day)
 */

(function() {
  'use strict';

  // Storage keys
  const STORAGE_KEY_REQUEST = 'user_pending_request';
  const STORAGE_KEY_LAST_SUBMIT = 'user_last_submit_time';
  const STORAGE_KEY_HISTORY = 'user_requests_history';
  const STORAGE_KEY_HISTORY_MAP = 'user_requests_history_map_v1';
  const STORAGE_KEY_TERMS_ACCEPTED = 'user_terms_accepted';
  const STORAGE_KEY_FINGERPRINT = 'user_browser_fp';
  const STORAGE_KEY_SUBMIT_LOG = 'user_submit_log_v1';
  const RATE_LIMIT_HOURS = 24;

  // Cloudinary configuration (unsigned upload)
  const CLOUDINARY = {
    cloudName: 'dlaisw4zm',
    uploadPreset: 'dlaisw4zm_unsigned',
    folder: ''
  };

  // DOM elements
  let termsCheckbox, submitBtn, resetBtn;
  let formSection, requestForm;
  let rateLimitNotice, pendingRequestNotice, successMessage;
  let cancelRequestBtn;
  let actors = [];
  let episodes = [];
  
  // Stepper state
  let currentSlide = 1;
  const totalSlides = 3;
  let isTransitioning = false;

  /**
   * Upload image to Cloudinary
   */
  function uploadImageToCloudinary(file) {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', CLOUDINARY.uploadPreset);
      if (CLOUDINARY.folder) fd.append('folder', CLOUDINARY.folder);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`, true);

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText || '{}');
              if (json && json.secure_url) {
                resolve(json.secure_url);
                return;
              }
            } catch (e) {
              console.error('Erreur parsing réponse:', e);
            }
            reject(new Error('Réponse upload invalide'));
          } else {
            reject(new Error('Échec upload: ' + xhr.status));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Erreur réseau lors de l\'upload'));
      xhr.send(fd);
    });
  }

  /**
   * Downscale image before upload for optimization
   */
  function downscaleImage(file, options = {}) {
    return new Promise((resolve, reject) => {
      const { maxW = 2000, maxH = 2000, quality = 0.85, mime = 'image/webp' } = options;
      
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      img.onload = () => {
        let w = img.width;
        let h = img.height;

        // Calculate new dimensions
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Erreur conversion image'));
          }
        }, mime, quality);
      };

      img.onerror = () => reject(new Error('Erreur chargement image'));
      reader.onerror = () => reject(new Error('Erreur lecture fichier'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Setup image upload handlers
   */
  function setupImageUploads() {
    // Portrait image
    setupImageUpload({
      fileInput: 'portraitFileInput',
      clearBtn: 'portraitClearBtn',
      preview: 'portraitPreview',
      hiddenInput: 'portraitImage',
      maxW: 720,
      maxH: 960
    });

    // Landscape image
    setupImageUpload({
      fileInput: 'landscapeFileInput',
      clearBtn: 'landscapeClearBtn',
      preview: 'landscapePreview',
      hiddenInput: 'landscapeImage',
      maxW: 1920,
      maxH: 1080
    });

    // Studio badge
    setupImageUpload({
      fileInput: 'studioBadgeFileInput',
      clearBtn: 'studioBadgeClearBtn',
      preview: 'studioBadgePreview',
      hiddenInput: 'studioBadge',
      maxW: 400,
      maxH: 160
    });
  }

  /**
   * Setup single image upload
   */
  function setupImageUpload(config) {
    const fileInput = document.getElementById(config.fileInput);
    const clearBtn = document.getElementById(config.clearBtn);
    const preview = document.getElementById(config.preview);
    const hiddenInput = document.getElementById(config.hiddenInput);

    if (!fileInput) return;

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('Fichier trop volumineux. Maximum 10MB.');
        fileInput.value = '';
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image valide.');
        fileInput.value = '';
        return;
      }

      try {
        // Downscale image
        const optimized = await downscaleImage(file, {
          maxW: config.maxW,
          maxH: config.maxH,
          quality: 0.85,
          mime: 'image/webp'
        });

        // Upload to Cloudinary
        const url = await uploadImageToCloudinary(optimized);

        // Update UI
        if (hiddenInput) hiddenInput.value = url;
        if (preview) {
          preview.src = url;
          preview.hidden = false;
        }

      } catch (error) {
        console.error('Erreur upload:', error);
        alert('Erreur lors de l\'upload de l\'image. Veuillez réessayer.');
        fileInput.value = '';
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (fileInput) fileInput.value = '';
        if (hiddenInput) hiddenInput.value = '';
        if (preview) {
          preview.src = '';
          preview.hidden = true;
        }
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Get DOM elements
    termsCheckbox = document.getElementById('termsAccepted');
    submitBtn = document.getElementById('submitBtn');
    resetBtn = document.getElementById('resetBtn');
    formSection = document.getElementById('requestFormSection');
    requestForm = document.getElementById('requestForm');
    rateLimitNotice = document.getElementById('rateLimitNotice');
    pendingRequestNotice = document.getElementById('pendingRequestNotice');
    successMessage = document.getElementById('successMessage');
    cancelRequestBtn = document.getElementById('cancelRequestBtn');

    // Check rate limit and pending request
    checkRateLimitAndPendingRequest();

    // Restore terms acceptance state
    if (termsCheckbox) {
      const wasAccepted = getTermsAccepted();
      termsCheckbox.checked = wasAccepted;
      
      // Terms checkbox listener
      termsCheckbox.addEventListener('change', handleTermsChange);
      
      // Trigger initial state if was accepted
      if (wasAccepted) {
        handleTermsChange({ target: termsCheckbox });
      }
    }

    // Form submission
    if (requestForm) {
      requestForm.addEventListener('submit', handleSubmit);
    }

    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', handleReset);
    }

    // Cancel request button
    if (cancelRequestBtn) {
      cancelRequestBtn.addEventListener('click', handleCancelRequest);
    }

    // Actor management
    const addActorBtn = document.getElementById('addActorBtn');
    if (addActorBtn) {
      addActorBtn.addEventListener('click', addActor);
    }

    // Episode management
    const addEpisodeBtn = document.getElementById('addEpisodeBtn');
    if (addEpisodeBtn) {
      addEpisodeBtn.addEventListener('click', addEpisode);
    }

    // Show/hide episodes fieldset and watchUrl based on type
    const typeSelect = document.getElementById('type');
    if (typeSelect) {
      typeSelect.addEventListener('change', () => {
        const episodesFieldset = document.getElementById('episodesFieldset');
        const watchUrlFieldset = document.getElementById('watchUrlFieldset');
        const isSerie = (typeSelect.value === 'série');
        
        if (episodesFieldset) {
          episodesFieldset.style.display = isSerie ? 'block' : 'none';
        }
        if (watchUrlFieldset) {
          watchUrlFieldset.style.display = isSerie ? 'none' : 'block';
        }
      });
    }

    // Setup image uploads
    setupImageUploads();
    
    // Render history
    renderHistory();
    
    // Log protection status (dev only)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const fp = getBrowserFingerprint();
      const lastSubmit = getLastSubmitTimeSecure();
      console.log('%c🛡️ Anti-Bypass Protection Active', 'color: #4ade80; font-weight: bold');
      console.log('Browser Fingerprint:', fp);
      console.log('Last Submit Time:', lastSubmit ? new Date(lastSubmit).toLocaleString('fr-FR') : 'None');
    }
    
    // Setup stepper navigation
    setupStepperNavigation();
  }
  
  /**
   * Setup stepper navigation
   */
  function setupStepperNavigation() {
    // Navigation buttons
    const nextStep1 = document.getElementById('nextStep1');
    const nextStep2 = document.getElementById('nextStep2');
    const prevStep2 = document.getElementById('prevStep2');
    const prevStep3 = document.getElementById('prevStep3');
    
    if (nextStep1) nextStep1.addEventListener('click', () => goToSlide(2));
    if (nextStep2) nextStep2.addEventListener('click', () => goToSlide(3));
    if (prevStep2) prevStep2.addEventListener('click', () => goToSlide(1));
    if (prevStep3) prevStep3.addEventListener('click', () => goToSlide(2));
    
    // Step circles clickable (only for completed steps)
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => {
      step.addEventListener('click', () => {
        const stepNum = parseInt(step.dataset.step, 10);
        if (stepNum < currentSlide || step.classList.contains('completed')) {
          goToSlide(stepNum);
        }
      });
    });
  }
  
  /**
   * Navigate to a specific slide
   */
  function goToSlide(slideNumber) {
    if (slideNumber < 1 || slideNumber > totalSlides) return;
    
    // Don't navigate if already on this slide or if transitioning
    if (slideNumber === currentSlide || isTransitioning) return;
    
    // Set transitioning flag
    isTransitioning = true;
    
    // Validation: Can't go to slide 2 or 3 without accepting terms
    if (slideNumber > 1 && !termsCheckbox.checked) {
      isTransitioning = false; // Reset flag
      const termsError = document.getElementById('termsError');
      if (termsError) {
        termsError.hidden = false;
        // Smooth scroll to terms checkbox
        const termsSection = document.querySelector('.terms-section');
        if (termsSection) {
          termsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setTimeout(() => {
          termsError.hidden = true;
        }, 5000);
      }
      return;
    }
    
    const slides = document.querySelectorAll('.slide');
    const currentSlideEl = document.querySelector(`.slide[data-slide="${currentSlide}"]`);
    const targetSlide = document.querySelector(`.slide[data-slide="${slideNumber}"]`);
    
    if (!targetSlide) return;
    
    // Add slide-out to current slide
    if (currentSlideEl) {
      currentSlideEl.classList.add('slide-out');
      currentSlideEl.classList.remove('active');
    }
    
    // Remove slide-out from all other slides
    slides.forEach(slide => {
      if (slide !== currentSlideEl) {
        slide.classList.remove('slide-out');
      }
    });
    
    // Smooth scroll to top first
    const stepperContainer = document.getElementById('stepperContainer');
    if (stepperContainer) {
      window.scrollTo({
        top: stepperContainer.offsetTop - 20,
        behavior: 'smooth'
      });
    }
    
    // Update stepper immediately for better UX
    updateStepper(slideNumber);
    
    // Small delay for smooth transition after scroll starts
    setTimeout(() => {
      // Activate target slide
      targetSlide.classList.add('active');
      targetSlide.classList.remove('slide-out');
      
      // Update current slide
      currentSlide = slideNumber;
      
      // Reset transitioning flag after animation completes
      setTimeout(() => {
        isTransitioning = false;
      }, 250); // Match CSS transition duration
    }, 100);
  }
  
  /**
   * Update stepper visual state
   */
  function updateStepper(activeSlide) {
    const steps = document.querySelectorAll('.step');
    
    steps.forEach(step => {
      const stepNum = parseInt(step.dataset.step, 10);
      
      // Remove all states
      step.classList.remove('active', 'completed');
      
      // Set appropriate state
      if (stepNum < activeSlide) {
        step.classList.add('completed');
      } else if (stepNum === activeSlide) {
        step.classList.add('active');
      }
    });
  }

  /**
   * ===== ANTI-BYPASS PROTECTION SYSTEM =====
   * This system prevents users from bypassing the 24h rate limit by clearing localStorage.
   * 
   * How it works:
   * 1. Browser Fingerprinting: Creates a semi-unique ID based on browser characteristics
   *    - User agent, language, screen size, timezone, canvas fingerprint
   *    - This ID persists even if localStorage is cleared
   * 
   * 2. Multi-Layer Storage: Saves submission timestamps in 3 places:
   *    - localStorage: Main storage with fingerprint-indexed log
   *    - sessionStorage: Backup that survives localStorage clearing
   *    - Cookies: Additional layer with 48h expiry
   * 
   * 3. Verification: Checks all 3 storage locations and uses the most recent timestamp
   *    - Even if user clears localStorage, sessionStorage and cookies remain
   *    - Even if user clears all storage, fingerprint will be regenerated identically
   * 
   * Note: This is a client-side protection and not 100% foolproof, but makes it
   * significantly harder for users to bypass the rate limit.
   */

  /**
   * Generate a browser fingerprint
   * This creates a semi-unique identifier based on browser characteristics
   */
  function generateFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fingerprint', 2, 2);
      const canvasData = canvas.toDataURL();
      
      const data = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        !!window.sessionStorage,
        !!window.localStorage,
        canvasData.substring(0, 100)
      ].join('|');
      
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return 'fp_' + Math.abs(hash).toString(36);
    } catch (e) {
      return 'fp_' + Math.random().toString(36).substr(2, 9);
    }
  }

  /**
   * Get or create browser fingerprint
   */
  function getBrowserFingerprint() {
    try {
      let fp = localStorage.getItem(STORAGE_KEY_FINGERPRINT);
      if (!fp) {
        fp = generateFingerprint();
        localStorage.setItem(STORAGE_KEY_FINGERPRINT, fp);
      }
      return fp;
    } catch (e) {
      return generateFingerprint();
    }
  }

  /**
   * Get submit log (multi-layer storage)
   */
  function getSubmitLog() {
    try {
      const fp = getBrowserFingerprint();
      const log = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBMIT_LOG) || '{}');
      return log[fp] || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Save submit log (multi-layer storage)
   */
  function saveSubmitLog(timestamp) {
    try {
      const fp = getBrowserFingerprint();
      const log = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBMIT_LOG) || '{}');
      log[fp] = timestamp;
      
      // Clean old entries (older than 48h)
      const cutoff = Date.now() - (48 * 60 * 60 * 1000);
      Object.keys(log).forEach(key => {
        if (log[key] < cutoff) {
          delete log[key];
        }
      });
      
      localStorage.setItem(STORAGE_KEY_SUBMIT_LOG, JSON.stringify(log));
      
      // Also save in session storage as backup
      try {
        sessionStorage.setItem(STORAGE_KEY_SUBMIT_LOG + '_' + fp, timestamp.toString());
      } catch (e) {}
      
      // Try to save in cookie as additional layer
      try {
        const expires = new Date(timestamp + (48 * 60 * 60 * 1000)).toUTCString();
        document.cookie = `clipsou_submit_${fp}=${timestamp}; expires=${expires}; path=/; SameSite=Strict`;
      } catch (e) {}
    } catch (e) {
      console.error('Error saving submit log:', e);
    }
  }

  /**
   * Get last submit time with multi-layer check
   */
  function getLastSubmitTimeSecure() {
    const fp = getBrowserFingerprint();
    let timestamps = [];
    
    // Check localStorage (submit log)
    try {
      const logTime = getSubmitLog();
      if (logTime) timestamps.push(logTime);
    } catch (e) {}
    
    // Check old localStorage key
    try {
      const oldTime = getLastSubmitTime();
      if (oldTime) timestamps.push(oldTime);
    } catch (e) {}
    
    // Check sessionStorage
    try {
      const sessTime = sessionStorage.getItem(STORAGE_KEY_SUBMIT_LOG + '_' + fp);
      if (sessTime) timestamps.push(parseInt(sessTime, 10));
    } catch (e) {}
    
    // Check cookies
    try {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === `clipsou_submit_${fp}`) {
          const cookieTime = parseInt(value, 10);
          if (cookieTime) timestamps.push(cookieTime);
        }
      }
    } catch (e) {}
    
    // Return the most recent timestamp
    return timestamps.length > 0 ? Math.max(...timestamps) : null;
  }

  /**
   * Check if user is admin
   */
  function isAdmin() {
    try {
      return localStorage.getItem('clipsou_admin_logged_in_v1') === '1';
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if user has rate limit or pending request
   */
  async function checkRateLimitAndPendingRequest() {
    const stepperContainer = document.getElementById('stepperContainer');
    const slidesContainer = document.querySelector('.slides-container');
    
    // Check for pending request first and sync status from GitHub
    const pendingRequest = getPendingRequest();
    if (pendingRequest) {
      console.log('Pending request found:', {
        title: pendingRequest.title,
        status: pendingRequest.status || 'pending',
        id: pendingRequest.id
      });
      
      // Try to sync status from GitHub
      const synced = await syncRequestStatusFromGitHub(pendingRequest);
      console.log('Sync result:', synced ? 'Updated' : 'No change');
      
      // Re-check after sync
      const updatedRequest = getPendingRequest();
      if (updatedRequest) {
        console.log('Updated request status:', updatedRequest.status || 'pending');
        // Ensure status is set (default to pending if not present)
        if (!updatedRequest.status) {
          updatedRequest.status = 'pending';
          savePendingRequest(updatedRequest);
        }
        showPendingRequest(updatedRequest);
        // Hide stepper when there's a pending request
        if (stepperContainer) stepperContainer.hidden = true;
        if (slidesContainer) slidesContainer.hidden = true;
        return;
      }
    }

    // Admins bypass rate limit
    if (isAdmin()) {
      enableForm();
      // Show stepper for admins
      if (stepperContainer) stepperContainer.hidden = false;
      if (slidesContainer) slidesContainer.hidden = false;
      return;
    }

    // Check rate limit for regular users (multi-layer check)
    const lastSubmitTime = getLastSubmitTimeSecure();
    if (lastSubmitTime) {
      const hoursSinceLastSubmit = (Date.now() - lastSubmitTime) / (1000 * 60 * 60);
      if (hoursSinceLastSubmit < RATE_LIMIT_HOURS) {
        showRateLimitNotice(lastSubmitTime);
        // Hide stepper when rate limited
        if (stepperContainer) stepperContainer.hidden = true;
        if (slidesContainer) slidesContainer.hidden = true;
        return;
      }
    }

    // No restrictions - enable form and show stepper
    enableForm();
    if (stepperContainer) stepperContainer.hidden = false;
    if (slidesContainer) slidesContainer.hidden = false;
  }

  /**
   * Show rate limit notice
   */
  function showRateLimitNotice(lastSubmitTime) {
    if (!rateLimitNotice) return;

    const nextAllowedTime = new Date(lastSubmitTime + (RATE_LIMIT_HOURS * 60 * 60 * 1000));
    const timeRemaining = calculateTimeRemaining(nextAllowedTime);

    const nextRequestTimeEl = document.getElementById('nextRequestTime');
    if (nextRequestTimeEl) {
      nextRequestTimeEl.textContent = `Prochaine demande possible : ${nextAllowedTime.toLocaleString('fr-FR')} (${timeRemaining})`;
    }

    rateLimitNotice.hidden = false;
    formSection.style.opacity = '0.5';
    formSection.style.pointerEvents = 'none';

    // Démarrer le countdown et débloquer automatiquement quand c'est fini
    startRateLimitCountdown(nextAllowedTime);
  }

  /**
   * Start countdown and auto-unlock form when rate limit expires
   */
  function startRateLimitCountdown(nextAllowedTime) {
    // Clear any existing interval
    if (window.rateLimitInterval) {
      clearInterval(window.rateLimitInterval);
    }

    window.rateLimitInterval = setInterval(() => {
      const timeLeft = nextAllowedTime.getTime() - Date.now();
      
      // Si le délai est terminé, débloquer le formulaire
      if (timeLeft <= 0) {
        clearInterval(window.rateLimitInterval);
        console.log('✓ Rate limit expiré - Débloquage du formulaire');
        
        // Cacher le notice
        if (rateLimitNotice) {
          rateLimitNotice.hidden = true;
        }
        
        // Débloquer le formulaire
        enableForm();
        if (stepperContainer) stepperContainer.hidden = false;
        if (slidesContainer) slidesContainer.hidden = false;
        
        // Afficher un message de confirmation
        alert('✓ Vous pouvez maintenant soumettre une nouvelle demande !');
        
        return;
      }

      // Mettre à jour le countdown
      const timeRemaining = calculateTimeRemaining(nextAllowedTime);
      const nextRequestTimeEl = document.getElementById('nextRequestTime');
      if (nextRequestTimeEl) {
        nextRequestTimeEl.textContent = `Prochaine demande possible : ${nextAllowedTime.toLocaleString('fr-FR')} (${timeRemaining})`;
      }
    }, 1000); // Mise à jour toutes les secondes
  }

  /**
   * Get status badge HTML
   */
  function getStatusBadge(status) {
    const badges = {
      pending: '<span style="background:#f59e0b;color:#000;padding:4px 10px;border-radius:12px;font-size:13px;font-weight:700;">⏳ En attente</span>',
      approved: '<span style="background:#10b981;color:#fff;padding:4px 10px;border-radius:12px;font-size:13px;font-weight:700;">✅ Acceptée</span>',
      rejected: '<span style="background:#ef4444;color:#fff;padding:4px 10px;border-radius:12px;font-size:13px;font-weight:700;">❌ Refusée</span>'
    };
    return badges[status] || badges.pending;
  }

  /**
   * Sync request status from GitHub
   */
  async function syncRequestStatusFromGitHub(request) {
    try {
      const response = await fetch('/data/user-requests.json?v=' + Date.now(), {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.debug('Could not fetch user-requests.json:', response.status);
        return false;
      }
      
      const requests = await response.json();
      if (!Array.isArray(requests)) {
        console.debug('Invalid user-requests.json format');
        return false;
      }
      
      // Find this request
      const githubRequest = requests.find(r => r && r.id === request.id);
      if (githubRequest) {
        console.debug(`Found request on GitHub with status: ${githubRequest.status}`);
        
        if (githubRequest.status !== request.status) {
          // Update local status
          const updated = { ...request, status: githubRequest.status, processedAt: githubRequest.processedAt };
          savePendingRequest(updated);
          console.log(`✓ Status updated from '${request.status}' to '${githubRequest.status}'`);
          return true;
        }
      } else {
        console.debug('Request not found on GitHub (may have been deleted)');
      }
      
      return false;
    } catch (error) {
      console.debug('Could not sync status from GitHub:', error);
      return false;
    }
  }

  /**
   * Show pending request notice
   */
  function showPendingRequest(request) {
    if (!pendingRequestNotice) return;

    const detailsEl = document.getElementById('pendingDetails');
    const statusBadge = getStatusBadge(request.status);
    
    if (detailsEl) {
      detailsEl.innerHTML = `
        <p><strong>Titre :</strong> ${escapeHtml(request.title)}</p>
        <p><strong>Type :</strong> ${escapeHtml(request.type)}</p>
        <p><strong>Genres :</strong> ${escapeHtml(request.genres.join(', '))}</p>
        <p><strong>Date de soumission :</strong> ${new Date(request.submittedAt).toLocaleString('fr-FR')}</p>
        <p><strong>Statut :</strong> ${statusBadge}</p>
      `;
    }
    
    // Change notice style and message based on status
    const noticeTitle = document.getElementById('pendingNoticeTitle');
    const noticeMessage = document.getElementById('pendingNoticeMessage');
    
    if (request.status === 'approved') {
      if (noticeTitle) noticeTitle.textContent = '✅ Demande acceptée';
      if (noticeMessage) {
        noticeMessage.textContent = 'Votre demande a été acceptée par les administrateurs ! Elle sera publiée prochainement sur le site.';
      }
      pendingRequestNotice.className = 'notice notice-success';
    } else if (request.status === 'rejected') {
      if (noticeTitle) noticeTitle.textContent = '❌ Demande refusée';
      if (noticeMessage) {
        noticeMessage.textContent = 'Votre demande a été refusée par les administrateurs. Vous pouvez annuler cette demande et en soumettre une nouvelle dans 24 heures.';
      }
      pendingRequestNotice.className = 'notice notice-error';
    } else {
      // pending status
      if (noticeTitle) noticeTitle.textContent = '📋 Demande en cours';
      if (noticeMessage) {
        noticeMessage.textContent = 'Vous avez une demande en attente de validation par les administrateurs.';
      }
      pendingRequestNotice.className = 'notice notice-info';
    }

    pendingRequestNotice.hidden = false;
    formSection.style.opacity = '0.5';
    formSection.style.pointerEvents = 'none';
  }

  /**
   * Enable form for input
   */
  function enableForm() {
    // Enable all form fields
    const fields = requestForm.querySelectorAll('input, textarea, select, button, fieldset');
    fields.forEach(field => {
      field.disabled = false;
    });

    // But submit button stays disabled until terms are accepted
    if (submitBtn) {
      submitBtn.disabled = !termsCheckbox.checked;
    }

    formSection.style.opacity = '1';
    formSection.style.pointerEvents = 'auto';
  }

  /**
   * Handle terms checkbox change
   */
  function handleTermsChange(e) {
    const isChecked = e.target.checked;
    
    // Save terms acceptance state to localStorage
    saveTermsAccepted(isChecked);
    
    // Hide error message if terms are now accepted
    const termsError = document.getElementById('termsError');
    if (isChecked && termsError) {
      termsError.hidden = true;
    }
    
    // Enable/disable form fields based on terms acceptance
    const fields = requestForm.querySelectorAll('input:not(#termsAccepted), textarea, select, fieldset');
    fields.forEach(field => {
      field.disabled = !isChecked;
    });

    // Enable/disable buttons
    if (submitBtn) {
      submitBtn.disabled = !isChecked;
    }
    if (resetBtn) {
      resetBtn.disabled = !isChecked;
    }
  }

  /**
   * Publish user request to GitHub (best effort)
   */
  async function publishUserRequestToGitHub(request) {
    try {
      // Get worker URL from global config or fallback to localStorage
      let workerUrl = null;
      
      // Try global config first
      if (window.ClipsouConfig && window.ClipsouConfig.workerUrl) {
        workerUrl = window.ClipsouConfig.workerUrl;
      }
      
      // Fallback to localStorage (for backward compatibility)
      if (!workerUrl || workerUrl.includes('votre-worker')) {
        workerUrl = localStorage.getItem('clipsou_worker_url');
      }
      
      if (!workerUrl || workerUrl.includes('votre-worker')) {
        console.info('ℹ️ Worker URL not configured - request saved locally only');
        return false;
      }

      console.log('📤 Publishing request to GitHub via worker...');

      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'user_request_submit',
          request: request
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      console.log('✅ Request published to GitHub successfully');
      return true;
    } catch (error) {
      console.warn('⚠️ Could not publish to GitHub (request saved locally):', error.message);
      return false;
    }
  }

  /**
   * Handle form submission
   */
  function handleSubmit(e) {
    e.preventDefault();

    const termsError = document.getElementById('termsError');

    // Validate terms accepted
    if (!termsCheckbox.checked) {
      if (termsError) {
        termsError.hidden = false;
        // Scroll to terms section
        termsCheckbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Auto-hide after 5 seconds
        setTimeout(() => {
          termsError.hidden = true;
        }, 5000);
      }
      return;
    }
    
    // Hide error message if visible
    if (termsError) {
      termsError.hidden = true;
    }

    // Gather form data
    const formData = {
      title: document.getElementById('title').value.trim(),
      type: document.getElementById('type').value,
      genres: [
        document.getElementById('genre1').value.trim(),
        document.getElementById('genre2').value.trim(),
        document.getElementById('genre3').value.trim()
      ].filter(g => g),
      description: document.getElementById('description').value.trim(),
      portraitImage: document.getElementById('portraitImage').value.trim(),
      landscapeImage: document.getElementById('landscapeImage').value.trim(),
      studioBadge: document.getElementById('studioBadge').value.trim() || null,
      watchUrl: document.getElementById('watchUrl').value.trim(),
      actors: actors.slice(), // Copy actors array
      episodes: episodes.slice(), // Copy episodes array
      submittedAt: Date.now(),
      status: 'pending'
    };

    // Validate required fields
    const isSerie = (formData.type === 'série');
    if (!formData.title || !formData.type || formData.genres.length < 3 || !formData.description) {
      alert('Veuillez remplir tous les champs obligatoires (marqués d\'une étoile *).');
      return;
    }
    
    // watchUrl est requis seulement pour les films et trailers, pas pour les séries
    if (!isSerie && !formData.watchUrl) {
      alert('Veuillez remplir le lien YouTube pour les films et trailers.');
      return;
    }

    // Validate images
    if (!formData.portraitImage || !formData.landscapeImage) {
      alert('Veuillez importer les deux images obligatoires (Affiche Portrait et Image Fiche).');
      return;
    }

    // Validate YouTube URL (only for non-series)
    if (!isSerie && !isValidYouTubeUrl(formData.watchUrl)) {
      alert('Veuillez entrer un lien YouTube valide.');
      return;
    }

    // Generate unique ID for the request
    const requestId = 'user_req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Add ID to form data
    const requestWithId = {
      ...formData,
      id: requestId
    };
    
    // Save request to localStorage (with ID!)
    const now = Date.now();
    savePendingRequest(requestWithId);
    saveLastSubmitTime(now);
    saveSubmitLog(now); // Multi-layer protection
    
    // Add to history
    addToHistory(requestWithId);

    // Publish to GitHub (best effort - doesn't block submission)
    publishUserRequestToGitHub(requestWithId).catch(err => {
      console.warn('Failed to publish to GitHub, request saved locally:', err);
    });

    // Show success message
    showSuccessMessage();

    // Disable form
    formSection.style.opacity = '0.5';
    formSection.style.pointerEvents = 'none';

    console.log('Request submitted:', requestWithId);
  }

  /**
   * Handle form reset
   */
  function handleReset() {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser le formulaire ?')) {
      requestForm.reset();
      actors = [];
      episodes = [];
      renderActorsList();
      renderEpisodesList();
      
      // Clear images
      ['portraitImage', 'landscapeImage', 'studioBadge'].forEach(id => {
        const hiddenInput = document.getElementById(id);
        const preview = document.getElementById(id.replace('Image', 'Preview').replace('Badge', 'BadgePreview'));
        if (hiddenInput) hiddenInput.value = '';
        if (preview) {
          preview.src = '';
          preview.hidden = true;
        }
      });
      
      // Keep terms checkbox checked if it was
      if (termsCheckbox.checked) {
        termsCheckbox.checked = true;
      }
    }
  }

  /**
   * Handle cancel request
   */
  async function handleCancelRequest() {
    if (!confirm('Êtes-vous sûr de vouloir annuler votre demande en cours ? Cette action est irréversible.')) {
      return;
    }

    // Get pending request
    const pendingRequest = getPendingRequest();
    
    // Publish deletion to GitHub so admins don't see it anymore
    if (pendingRequest && pendingRequest.id) {
      try {
        await publishUserRequestDeleteToGitHub(pendingRequest.id);
      } catch (error) {
        console.warn('Could not delete request from GitHub:', error);
      }
    }

    // Remove pending request from storage
    localStorage.removeItem(STORAGE_KEY_REQUEST);

    // Hide pending notice
    if (pendingRequestNotice) {
      pendingRequestNotice.hidden = true;
    }

    // Enable form
    enableForm();

    // Show success feedback
    alert('Votre demande a été annulée. Vous pouvez maintenant soumettre une nouvelle demande.');

    // Reload to reset state
    window.location.reload();
  }

  /**
   * Publish user request deletion to GitHub (when user cancels)
   */
  async function publishUserRequestDeleteToGitHub(requestId) {
    try {
      let workerUrl = null;
      
      if (window.ClipsouConfig && window.ClipsouConfig.workerUrl) {
        workerUrl = window.ClipsouConfig.workerUrl;
      }
      
      if (!workerUrl || workerUrl.includes('votre-worker')) {
        workerUrl = localStorage.getItem('clipsou_worker_url');
      }
      
      if (!workerUrl || workerUrl.includes('votre-worker')) {
        return false;
      }

      console.log('🗑️ Deleting request from GitHub...');

      // This needs admin auth, so we'll use a public endpoint
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'user_request_cancel',
          id: requestId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log('✅ Request deleted from GitHub successfully');
      return true;
    } catch (error) {
      console.warn('⚠️ Could not delete from GitHub:', error.message);
      return false;
    }
  }

  /**
   * Add actor to list
   */
  function addActor() {
    const nameInput = document.getElementById('actorName');
    const roleInput = document.getElementById('actorRole');

    const name = nameInput.value.trim();
    const role = roleInput.value.trim();

    if (!name) {
      alert('Veuillez entrer le nom de l\'acteur.');
      return;
    }

    actors.push({ name, role: role || '' });
    renderActorsList();

    // Clear inputs
    nameInput.value = '';
    roleInput.value = '';
  }

  /**
   * Remove actor from list
   */
  function removeActor(index) {
    actors.splice(index, 1);
    renderActorsList();
  }

  /**
   * Render actors list
   */
  function renderActorsList() {
    const actorsList = document.getElementById('actorsList');
    if (!actorsList) return;

    if (actors.length === 0) {
      actorsList.innerHTML = '<p style="color: #94a3b8; font-size: 14px;">Aucun acteur ajouté</p>';
      return;
    }

    actorsList.innerHTML = actors.map((actor, index) => `
      <div class="actor-chip">
        <span>${escapeHtml(actor.name)}${actor.role ? ` – ${escapeHtml(actor.role)}` : ''}</span>
        <button type="button" class="remove" onclick="window.__removeActor(${index})" title="Retirer">×</button>
      </div>
    `).join('');
  }

  /**
   * Add episode to the list
   */
  function addEpisode() {
    const titleInput = document.getElementById('episodeTitle');
    const urlInput = document.getElementById('episodeUrl');

    if (!titleInput || !urlInput) return;

    const title = titleInput.value.trim();
    const url = urlInput.value.trim();

    if (!title) {
      alert('Veuillez entrer le titre de l\'épisode.');
      return;
    }

    if (!url) {
      alert('Veuillez entrer le lien YouTube de l\'épisode.');
      return;
    }

    episodes.push({ title, url });
    renderEpisodesList();

    // Clear inputs
    titleInput.value = '';
    urlInput.value = '';
  }

  /**
   * Remove episode from list
   */
  function removeEpisode(index) {
    episodes.splice(index, 1);
    renderEpisodesList();
  }

  /**
   * Render episodes list
   */
  function renderEpisodesList() {
    const episodesList = document.getElementById('episodesList');
    if (!episodesList) return;

    if (episodes.length === 0) {
      episodesList.innerHTML = '<p style="color: #94a3b8; font-size: 14px;">Aucun épisode ajouté</p>';
      return;
    }

    episodesList.innerHTML = episodes.map((episode, index) => `
      <div class="actor-chip">
        <span>Ép. ${index + 1}: ${escapeHtml(episode.title)}</span>
        <button type="button" class="remove" onclick="window.__removeEpisode(${index})" title="Retirer">×</button>
      </div>
    `).join('');
  }

  // Expose removeActor globally for onclick handlers
  window.__removeActor = removeActor;
  window.__removeEpisode = removeEpisode;

  /**
   * Show success message
   */
  function showSuccessMessage() {
    if (!successMessage) return;

    successMessage.hidden = false;
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Hide after 10 seconds
    setTimeout(() => {
      successMessage.hidden = true;
    }, 10000);
  }

  /**
   * Validate YouTube URL
   */
  function isValidYouTubeUrl(url) {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/
    ];
    return patterns.some(pattern => pattern.test(url));
  }

  /**
   * Calculate time remaining
   */
  function calculateTimeRemaining(targetTime) {
    const now = Date.now();
    const diff = targetTime - now;

    if (diff <= 0) return 'maintenant';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `dans ${hours}h ${minutes}min`;
    } else {
      return `dans ${minutes}min`;
    }
  }

  /**
   * Get pending request from localStorage
   */
  function getPendingRequest() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_REQUEST);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error reading pending request:', e);
      return null;
    }
  }

  /**
   * Save pending request to localStorage
   */
  function savePendingRequest(request) {
    try {
      localStorage.setItem(STORAGE_KEY_REQUEST, JSON.stringify(request));
    } catch (e) {
      console.error('Error saving pending request:', e);
    }
  }

  /**
   * Get last submit time from localStorage
   */
  function getLastSubmitTime() {
    try {
      const time = localStorage.getItem(STORAGE_KEY_LAST_SUBMIT);
      return time ? parseInt(time, 10) : null;
    } catch (e) {
      console.error('Error reading last submit time:', e);
      return null;
    }
  }

  /**
   * Save last submit time to localStorage
   */
  function saveLastSubmitTime(timestamp) {
    try {
      localStorage.setItem(STORAGE_KEY_LAST_SUBMIT, timestamp.toString());
    } catch (e) {
      console.error('Error saving last submit time:', e);
    }
  }

  /**
   * Get terms accepted state from localStorage
   */
  function getTermsAccepted() {
    try {
      const accepted = localStorage.getItem(STORAGE_KEY_TERMS_ACCEPTED);
      return accepted === 'true';
    } catch (e) {
      console.error('Error reading terms accepted:', e);
      return false;
    }
  }

  /**
   * Save terms accepted state to localStorage
   */
  function saveTermsAccepted(accepted) {
    try {
      localStorage.setItem(STORAGE_KEY_TERMS_ACCEPTED, accepted.toString());
    } catch (e) {
      console.error('Error saving terms accepted:', e);
    }
  }

  /**
   * Get request history from localStorage
   */
  function getFingerprint(){
    return getBrowserFingerprint();
  }

  function getHistoryMap() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY_MAP);
      const parsed = raw ? JSON.parse(raw) : null;
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
      console.error('Error reading history map:', e);
      return {};
    }
  }

  function saveHistoryMap(map) {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY_MAP, JSON.stringify(map));
    } catch (e) {
      console.error('Error saving history map:', e);
    }
  }

  function getRequestHistory() {
    const map = getHistoryMap();
    const fp = getFingerprint();
    const legacy = (() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })();
    const list = Array.isArray(map[fp]) ? map[fp] : [];
    return list.length ? list : legacy;
  }

  function saveRequestHistory(history) {
    const map = getHistoryMap();
    const fp = getFingerprint();
    map[fp] = history;
    saveHistoryMap(map);
    // Also populate legacy key (back-compat)
    try { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history)); } catch {}
  }

  /**
   * Add request to history
   */
  function addToHistory(request) {
    const history = getRequestHistory();
    history.unshift({
      id: Date.now().toString(),
      ...request,
      submittedAt: Date.now()
    });
    saveRequestHistory(history);
    renderHistory();
  }

  /**
   * Delete request from history
   */
  function deleteFromHistory(id) {
    if (!confirm('Voulez-vous vraiment supprimer cette demande de l\'historique ?')) {
      return;
    }
    const history = getRequestHistory().filter(item => item.id !== id);
    saveRequestHistory(history);
    renderHistory();
  }

  /**
   * Render history list
   */
  function renderHistory() {
    const historySection = document.getElementById('historySection');
    const historyList = document.getElementById('historyList');
    const history = getRequestHistory();

    if (!historyList) return;

    if (history.length === 0) {
      historySection.hidden = true;
      return;
    }

    historySection.hidden = false;
    historyList.innerHTML = '';

    history.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'history-item';

      const statusClass = item.status || 'pending';
      const statusText = {
        pending: 'En attente',
        approved: 'Approuvé',
        rejected: 'Rejeté'
      }[statusClass] || 'En attente';

      const date = new Date(item.submittedAt);
      const dateStr = date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const timeStr = date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Calculate next request time (admins bypass this)
      let nextRequestStr = '';
      if (isAdmin()) {
        nextRequestStr = '<span style="color: #fbbf24;">👑 Admin - Pas de limite de demandes</span>';
      } else {
        const nextRequestTime = item.submittedAt + (RATE_LIMIT_HOURS * 60 * 60 * 1000);
        const timeRemaining = nextRequestTime - Date.now();
        const canRequestAgain = timeRemaining <= 0;

        if (!canRequestAgain) {
          const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
          const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
          nextRequestStr = `<span>⏳ Prochaine demande possible dans ${hours}h ${minutes}min</span>`;
        } else {
          nextRequestStr = '<span style="color: #4ade80;">✓ Vous pouvez faire une nouvelle demande</span>';
        }
      }

      itemEl.innerHTML = `
        <div class="history-item-content">
          <div class="history-item-header">
            <h3 class="history-item-title">${escapeHtml(item.title || 'Sans titre')}</h3>
            <span class="history-item-status ${statusClass}">${statusText}</span>
          </div>
          <div class="history-item-meta">
            <span>📅 ${dateStr} à ${timeStr}</span>
            <span>🎬 ${escapeHtml(item.type || 'Film')}</span>
            ${nextRequestStr}
          </div>
        </div>
        <div class="history-item-actions">
          <button class="btn danger" onclick="window.__deleteHistoryItem('${item.id}')">
            Supprimer
          </button>
        </div>
      `;

      historyList.appendChild(itemEl);
    });
  }

  // Expose delete function globally for onclick
  window.__deleteHistoryItem = deleteFromHistory;

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

})();
