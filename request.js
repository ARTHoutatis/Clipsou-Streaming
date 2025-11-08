/**
 * User Film Request System
 * Allows users to submit film requests with rate limiting (1 per day)
 */

(function() {
  'use strict';

  // Allowed genres with canonical names and aliases
  const GENRE_DEFINITIONS = [
    { name: 'Action', aliases: [] },
    { name: 'Ambience', aliases: ['Ambiance'] },
    { name: 'Animation', aliases: [] },
    { name: 'Aventure', aliases: [] },
    { name: 'Biopic', aliases: [] },
    { name: 'Brickfilm', aliases: [] },
    { name: 'Comédie', aliases: ['Comedie', 'Comedy'] },
    { name: 'Documentaire', aliases: [] },
    { name: 'Drame', aliases: [] },
    { name: 'Émission', aliases: ['Emission'] },
    { name: 'Enfants', aliases: [] },
    { name: 'Événement', aliases: ['Evenement'] },
    { name: 'Familial', aliases: [] },
    { name: 'Fantastique', aliases: [] },
    { name: 'Faux film pour enfants', aliases: ['Faux-film-pour-enfants'] },
    { name: 'Found Footage', aliases: ['Found-footage'] },
    { name: 'Guerre', aliases: [] },
    { name: 'Historique', aliases: [] },
    { name: 'Horreur', aliases: [] },
    { name: 'Horreur psychologique', aliases: [] },
    { name: 'Live Action', aliases: ['Live-Action'] },
    { name: 'Mini-série', aliases: ['Mini serie', 'Mini série', 'Mini-series', 'mini serie'] },
    { name: 'Musical', aliases: [] },
    { name: 'Mystère', aliases: ['Mystere'] },
    { name: 'Policier', aliases: [] },
    { name: 'Psychologique', aliases: [] },
    { name: 'Romance', aliases: [] },
    { name: 'Science-Fiction', aliases: ['Science fiction'] },
    { name: 'Sitcom', aliases: [] },
    { name: 'Super-héros', aliases: ['Super heros', 'Super-heros'] },
    { name: 'Thriller', aliases: [] },
    { name: 'Western', aliases: [] }
  ];

  function normalizeGenreToken(str) {
    return String(str || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]+/g, '');
  }

  const GENRE_CANONICAL_MAP = new Map();
  GENRE_DEFINITIONS.forEach(({ name, aliases = [] }) => {
    const baseKey = normalizeGenreToken(name);
    if (!GENRE_CANONICAL_MAP.has(baseKey)) {
      GENRE_CANONICAL_MAP.set(baseKey, name);
    }
    aliases.forEach(alias => {
      const aliasKey = normalizeGenreToken(alias);
      if (!GENRE_CANONICAL_MAP.has(aliasKey)) {
        GENRE_CANONICAL_MAP.set(aliasKey, name);
      }
    });
  });

  const ALLOWED_GENRES_SET = new Set(GENRE_CANONICAL_MAP.keys());
  const ALLOWED_GENRES = Array.from(
    new Set(GENRE_DEFINITIONS.map(def => GENRE_CANONICAL_MAP.get(normalizeGenreToken(def.name)) || def.name))
  ).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

  function canonicalizeGenre(value) {
    if (!value) return null;
    const key = normalizeGenreToken(value);
    if (!key) return null;
    return GENRE_CANONICAL_MAP.get(key) || null;
  }

  // Storage keys
  const STORAGE_KEY_REQUEST = 'user_pending_request';
  const STORAGE_KEY_LAST_SUBMIT = 'user_last_submit_time';
  const STORAGE_KEY_HISTORY = 'user_requests_history';
  const STORAGE_KEY_HISTORY_MAP = 'user_requests_history_map_v1';
  const STORAGE_KEY_TERMS_ACCEPTED = 'user_terms_accepted';
  const STORAGE_KEY_FINGERPRINT = 'user_browser_fp';
  const STORAGE_KEY_SUBMIT_LOG = 'user_submit_log_v1';
  const STORAGE_KEY_FORM_DRAFT = 'user_form_draft_v1';
  const STORAGE_KEY_CURRENT_SLIDE = 'user_current_slide';
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
  let cancelRequestBtn, newRequestBtn;
  let actors = [];
  let episodes = [];
  
  // Stepper state
  let currentSlide = 1;
  const totalSlides = 4;
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

  function populateGenreDatalist() {
    const datalist = document.getElementById('genresDatalist');
    if (!datalist) return;
    datalist.innerHTML = '';
    ALLOWED_GENRES.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      datalist.appendChild(opt);
    });
  }

  function setupGenreValidation() {
    populateGenreDatalist();
    const genreInputs = ['genre1','genre2','genre3'].map(id => document.getElementById(id)).filter(Boolean);
    const errorEl = ensureGenreErrorNode();

    const validate = () => {
      let hasInvalid = false;
      genreInputs.forEach(input => {
        const raw = (input.value || '').trim();
        if (!raw) {
          input.setCustomValidity('');
          return;
        }
        const canonical = canonicalizeGenre(raw);
        if (!canonical) {
          input.setCustomValidity('Genre non supporté.');
          hasInvalid = true;
        } else {
          if (canonical !== raw) {
            input.value = canonical;
          }
          input.setCustomValidity('');
        }
      });
      errorEl.hidden = !hasInvalid;
    };

    genreInputs.forEach(input => {
      input.addEventListener('input', validate);
      input.addEventListener('change', validate);
      input.addEventListener('blur', validate);
    });

    validate();
  }

  function ensureGenreErrorNode() {
    let err = document.getElementById('genresError');
    if (err) return err;
    err = document.createElement('div');
    err.id = 'genresError';
    err.className = 'error-message';
    err.hidden = true;
    err.textContent = 'Veuillez choisir les genres uniquement dans la liste proposée ou saisir un nom existant.';
    const genreGrid = document.getElementById('genre1')?.closest('.grid');
    if (genreGrid && genreGrid.parentElement) {
      genreGrid.parentElement.insertBefore(err, genreGrid.nextSibling);
    }
    return err;
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

  /**
   * Prefill studio badge from user's history
   * Finds the last request with a studio badge and reuses it
   */
  function prefillStudioBadge() {
    try {
      const history = getRequestHistory();
      
      // Find the most recent request that has a studio badge
      const lastRequestWithBadge = history.find(req => 
        req && req.studioBadge && req.studioBadge.trim() !== ''
      );
      
      if (lastRequestWithBadge && lastRequestWithBadge.studioBadge) {
        const hiddenInput = document.getElementById('studioBadge');
        const preview = document.getElementById('studioBadgePreview');
        const clearBtn = document.getElementById('studioBadgeClearBtn');
        const fileInput = document.getElementById('studioBadgeFileInput');
        
        if (hiddenInput && preview) {
          // Set the hidden input value
          hiddenInput.value = lastRequestWithBadge.studioBadge;
          
          // Show the preview
          preview.src = lastRequestWithBadge.studioBadge;
          preview.hidden = false;
          
          // Enable the clear button
          if (clearBtn) {
            clearBtn.disabled = false;
          }
          
          // Keep file input disabled (it's already uploaded)
          if (fileInput) {
            fileInput.disabled = false;
          }
          
          console.log('✓ Badge studio pré-rempli depuis l\'historique');
        }
      }
    } catch (e) {
      console.error('Error prefilling studio badge:', e);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Log configuration for debugging
    console.log('🔧 Request system initialization');
    console.log('🔧 Worker URL config:', {
      hasConfig: !!(window.ClipsouConfig && window.ClipsouConfig.workerUrl),
      workerUrl: window.ClipsouConfig?.workerUrl || 'not configured',
      localStorageUrl: localStorage.getItem('clipsou_worker_url') || 'not set'
    });
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
    newRequestBtn = document.getElementById('newRequestBtn');

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

    // Submit button - explicit handler since button has type="button"
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleSubmit(e);
      });
    }

    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', handleReset);
    }

    // Cancel request button
    if (cancelRequestBtn) {
      cancelRequestBtn.addEventListener('click', handleCancelRequest);
    }

    if (newRequestBtn) {
      newRequestBtn.addEventListener('click', handleNewRequest);
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
        
        // Reset video verification when switching types
        isVideoValid = false;
        lastVerifiedUrl = null;
        const statusDiv = document.getElementById('videoVerificationStatus');
        if (statusDiv) {
          statusDiv.hidden = true;
        }
      });
    }

    // Setup image uploads
    setupImageUploads();

    // Setup real-time video verification
    setupVideoVerification();

    // Prefill studio badge from history
    prefillStudioBadge();

    // Render history
    renderHistory();

    // Genres validation setup
    setupGenreValidation();

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

    // Restore form draft if exists (after all DOM elements are initialized)
    setTimeout(() => {
      const draftRestored = loadFormDraft();
      if (draftRestored) {
        console.log('💾 Brouillon restauré - Vous pouvez reprendre où vous en étiez');
      }

      // Restore saved slide/step
      const savedSlide = loadCurrentSlide();
      if (savedSlide > 1 && window.GoogleAuth && window.GoogleAuth.isAuthenticated()) {
        console.log('📍 Restauration de l\'étape', savedSlide);
        goToSlide(savedSlide);
      }
    }, 100);

    // Setup auto-save for form fields
    setupAutoSave();
  }
  
  /**
   * Setup auto-save for form fields
   */
  function setupAutoSave() {
    // Debounce function to avoid saving too often
    let saveTimeout;
    const debouncedSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveFormDraft();
      }, 1000); // Save 1 second after user stops typing
    };

    // Listen to all form inputs
    const formInputs = [
      'title', 'type', 'genre1', 'genre2', 'genre3', 'description',
      'portraitImage', 'landscapeImage', 'studioBadge', 'watchUrl'
    ];

    formInputs.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('input', debouncedSave);
        element.addEventListener('change', debouncedSave);
      }
    });

    // Compteur de caractères pour la description (limite 400)
    const descriptionInput = document.getElementById('description');
    const descriptionCounter = document.getElementById('descriptionCounter');
    if (descriptionInput && descriptionCounter) {
      const updateCounter = () => {
        const currentLength = descriptionInput.value.length;
        const maxLength = 400;
        descriptionCounter.textContent = `(${currentLength}/${maxLength})`;
        
        // Changer la couleur si proche de la limite
        if (currentLength >= maxLength) {
          descriptionCounter.style.color = '#ef4444'; // Rouge
        } else if (currentLength >= maxLength * 0.9) {
          descriptionCounter.style.color = '#f59e0b'; // Orange
        } else {
          descriptionCounter.style.color = '#888'; // Gris par défaut
        }
      };
      
      descriptionInput.addEventListener('input', updateCounter);
      // Initialiser le compteur
      updateCounter();
    }

    console.log('💾 Auto-sauvegarde activée');
  }

  /**
   * Setup stepper navigation
   */
  function setupStepperNavigation() {
    // Navigation buttons pour les 4 étapes
    // Étape 1 : Conditions
    const nextStep1 = document.getElementById('nextStep1');
    // Étape 2 : Connexion
    const nextStep2 = document.getElementById('nextStep2');
    const prevStep2 = document.getElementById('prevStep2');
    // Étape 3 : Guide
    const nextStep3 = document.getElementById('nextStep3');
    const prevStep3 = document.getElementById('prevStep3');
    // Étape 4 : Formulaire
    const prevStep4 = document.getElementById('prevStep4');
    
    if (nextStep1) nextStep1.addEventListener('click', () => goToSlide(2));
    if (nextStep2) nextStep2.addEventListener('click', () => goToSlide(3));
    if (prevStep2) prevStep2.addEventListener('click', () => goToSlide(1));
    if (nextStep3) nextStep3.addEventListener('click', () => goToSlide(4));
    if (prevStep3) prevStep3.addEventListener('click', () => goToSlide(2));
    if (prevStep4) prevStep4.addEventListener('click', () => goToSlide(3));
    
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
    
    // Validation: Can't leave slide 1 without accepting terms
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
    
    // Validation: Can't go past slide 2 without Google authentication
    if (slideNumber > 2 && (!window.GoogleAuth || !window.GoogleAuth.isAuthenticated())) {
      isTransitioning = false;
      alert('Veuillez vous connecter avec Google pour continuer.');
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
      
      // Save current slide to localStorage
      saveCurrentSlide(slideNumber);
      
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
      
      // Cookie layer removed for GDPR compliance - localStorage + sessionStorage sufficient
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
    
    // Cookie check removed for GDPR compliance
    
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

    const actionsContainer = pendingRequestNotice.querySelector('.pending-actions');
    const canStartNew = canStartNewRequest(request);
    const shouldHideCancel = request.status === 'approved';

    if (cancelRequestBtn) {
      cancelRequestBtn.hidden = shouldHideCancel;
    }

    if (newRequestBtn) {
      newRequestBtn.hidden = !canStartNew;
    }

    if (actionsContainer) {
      const cancelHidden = !cancelRequestBtn || cancelRequestBtn.hidden;
      const newHidden = !newRequestBtn || newRequestBtn.hidden;
      actionsContainer.hidden = cancelHidden && newHidden;
    }

    pendingRequestNotice.hidden = false;
    formSection.style.opacity = '0.5';
    formSection.style.pointerEvents = 'none';
  }

  /**
   * Check if user can start a new request
   */
  function canStartNewRequest(request) {
    if (!request) return false;
    if (isAdmin()) return true;

    const status = request.status || 'pending';
    if (status === 'pending') {
      return false;
    }

    const lastSubmitTime = getLastSubmitTimeSecure();
    const referenceTime = lastSubmitTime || request.submittedAt || 0;
    if (!referenceTime) {
      return true;
    }

    const elapsed = Date.now() - referenceTime;
    return elapsed >= RATE_LIMIT_HOURS * 60 * 60 * 1000;
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
        console.warn('⚠️ Worker URL not configured - request saved locally only');
        console.info('To enable GitHub sync, configure ClipsouConfig.workerUrl or clipsou_worker_url');
        return false;
      }

      console.log('📤 Publishing request to GitHub via worker:', workerUrl);
      console.log('📤 Request data:', { id: request.id, title: request.title, hasOAuth: !!(request.submittedBy && request.youtubeChannel) });

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
        const errorText = await response.text();
        console.error('❌ Worker response error:', response.status, errorText);
        throw new Error(`Worker error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Request published to GitHub successfully:', result);
      return true;

    } catch (error) {
      console.error('❌ Failed to publish request to GitHub:', error);
      // Don't throw - let the main submission continue even if GitHub sync fails
      return false;
    }
  }

  /**
   * Setup real-time video verification
   */
  let videoVerificationTimer = null;
  let lastVerifiedUrl = null;
  let isVideoValid = false;

  function setupVideoVerification() {
    const watchUrlInput = document.getElementById('watchUrl');
    const statusDiv = document.getElementById('videoVerificationStatus');
    
    if (!watchUrlInput || !statusDiv) return;

    // Debounce function to avoid too many API calls
    function debounceVerify() {
      clearTimeout(videoVerificationTimer);
      
      const url = watchUrlInput.value.trim();
      
      // Hide status if empty
      if (!url) {
        statusDiv.hidden = true;
        isVideoValid = false;
        lastVerifiedUrl = null;
        return;
      }

      // Don't verify if URL hasn't changed
      if (url === lastVerifiedUrl) {
        return;
      }

      // Check if it's a valid YouTube URL format first
      if (!isValidYouTubeUrl(url)) {
        statusDiv.hidden = false;
        statusDiv.className = 'verification-status error';
        statusDiv.innerHTML = '❌ URL YouTube invalide. Formats acceptés : youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...';
        isVideoValid = false;
        return;
      }

      // Show verifying status
      statusDiv.hidden = false;
      statusDiv.className = 'verification-status verifying';
      statusDiv.innerHTML = '<div class="spinner"></div><span>Vérification de la propriété de la vidéo...</span>';

      // Wait 1 second before verifying
      videoVerificationTimer = setTimeout(async () => {
        try {
          console.log('🔍 [Video Verification] Starting verification for URL:', url);
          
          // Check GoogleAuth availability
          if (!window.GoogleAuth) {
            console.error('❌ [Video Verification] window.GoogleAuth is not defined');
            statusDiv.className = 'verification-status error';
            const authMissingMsg = window.i18n ? window.i18n.translate('video.verify.auth.missing') : '❌ Système d\'authentification non chargé';
            statusDiv.innerHTML = authMissingMsg;
            isVideoValid = false;
            return;
          }
          
          console.log('✓ [Video Verification] GoogleAuth exists');
          console.log('✓ [Video Verification] isAuthenticated:', window.GoogleAuth.isAuthenticated());
          
          if (!window.GoogleAuth.isAuthenticated()) {
            console.warn('⚠️ [Video Verification] User is not authenticated');
            statusDiv.className = 'verification-status error';
            const authRequiredMsg = window.i18n ? window.i18n.translate('video.verify.auth.required') : '❌ Vous devez être connecté pour vérifier la vidéo';
            statusDiv.innerHTML = authRequiredMsg;
            isVideoValid = false;
            return;
          }

          console.log('🚀 [Video Verification] Calling verifyVideoOwnership...');
          const verification = await window.GoogleAuth.verifyVideoOwnership(url);
          console.log('📊 [Video Verification] Result:', verification);
          
          lastVerifiedUrl = url;

          if (verification.valid) {
            console.log('✅ [Video Verification] Video is valid');
            statusDiv.className = 'verification-status success';
            const successMsg = window.i18n 
              ? window.i18n.translate('video.verify.success').replace('{title}', verification.videoTitle || 'N/A')
              : `✅ Vidéo vérifiée : "${verification.videoTitle || 'Titre non disponible'}"`;
            statusDiv.innerHTML = successMsg;
            isVideoValid = true;
          } else {
            console.warn('❌ [Video Verification] Video is invalid:', verification.error);
            statusDiv.className = 'verification-status error';
            // L'erreur est déjà traduite dans google-auth.js
            statusDiv.innerHTML = verification.error || (window.i18n ? window.i18n.translate('video.verify.error') : '❌ Cette vidéo ne vous appartient pas');
            isVideoValid = false;
          }

        } catch (error) {
          console.error('💥 [Video Verification] Exception caught:', error);
          console.error('Stack trace:', error.stack);
          statusDiv.className = 'verification-status error';
          const retryMsg = window.i18n ? window.i18n.translate('video.verify.error.retry') : '❌ Erreur lors de la vérification. Veuillez réessayer.';
          statusDiv.innerHTML = retryMsg;
          isVideoValid = false;
        }
      }, 1000); // 1 second debounce
    }

    // Add event listeners
    watchUrlInput.addEventListener('input', debounceVerify);
    watchUrlInput.addEventListener('blur', debounceVerify);
    watchUrlInput.addEventListener('paste', () => {
      // Delay to let paste complete
      setTimeout(debounceVerify, 100);
    });
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(e) {
    e.preventDefault();

    console.log('📤 [Submit] Starting form submission process...');

    // Disable submit button to prevent double submission
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<div class="spinner"></div> Envoi en cours...';
    }

    try {
      // Check Google authentication
      if (!window.GoogleAuth || !window.GoogleAuth.isAuthenticated()) {
        alert('❌ Connexion Google requise\n\n' +
              'Vous devez être connecté avec votre compte Google pour soumettre un film.\n\n' +
              '💡 Cliquez sur le bouton "Se connecter avec Google" à l\'étape 1.');
        return;
      }

      const youtubeChannel = window.GoogleAuth.getYouTubeChannel();
      if (!youtubeChannel) {
        alert('❌ Chaîne YouTube introuvable\n\n' +
              'Impossible de récupérer les informations de votre chaîne YouTube.\n\n' +
              'Solutions :\n' +
              '• Déconnectez-vous et reconnectez-vous avec Google\n' +
              '• Vérifiez que vous avez une chaîne YouTube active\n' +
              '• Vérifiez que vous avez autorisé l\'accès à YouTube');
        return;
      }

      // Check if user is banned
      const currentUser = window.GoogleAuth.getCurrentUser();
      const userEmail = currentUser?.user?.email;
      const channelId = youtubeChannel?.id;
      
      console.log('📤 [Submit] User authenticated:', { email: userEmail, channelId });
      
      if (window.ClipsouAdmin && typeof window.ClipsouAdmin.isUserBanned === 'function') {
        if (window.ClipsouAdmin.isUserBanned(userEmail, channelId)) {
          alert('❌ Votre compte a été banni.\n\nVous ne pouvez plus soumettre de demandes sur Clipsou Streaming.\n\nSi vous pensez qu\'il s\'agit d\'une erreur, veuillez contacter l\'administrateur.');
          return;
        }
      }

      const termsError = document.getElementById('termsError');

      // Validate terms accepted
      if (!termsCheckbox.checked) {
        alert('❌ Conditions non acceptées\n\nVous devez accepter les conditions d\'utilisation pour soumettre votre demande.');
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

      console.log('📤 [Submit] Gathering form data...');

      // Gather form data
      const rawGenres = [
        document.getElementById('genre1').value.trim(),
        document.getElementById('genre2').value.trim(),
        document.getElementById('genre3').value.trim()
      ].filter(str => str && str.trim().length > 0);
      const canonicalResults = rawGenres.map(g => canonicalizeGenre(g));
      const invalidEntries = [];
      const canonGenres = canonicalResults.map((val, idx) => {
        if (!val) {
          invalidEntries.push(rawGenres[idx]);
          return null;
        }
        return val;
      }).filter(Boolean);

      // Validate that we have user data before proceeding
      if (!currentUser) {
        alert('❌ Informations utilisateur manquantes\n\n' +
              'Impossible de récupérer vos informations Google.\n\n' +
              'Solutions :\n' +
              '• Déconnectez-vous et reconnectez-vous avec Google\n' +
              '• Rechargez la page\n' +
              '• Videz le cache de votre navigateur');
        return;
      }

      const formData = {
        title: document.getElementById('title').value.trim(),
        type: document.getElementById('type').value,
        genres: canonGenres,
        description: document.getElementById('description').value.trim(),
        portraitImage: document.getElementById('portraitImage').value.trim(),
        landscapeImage: document.getElementById('landscapeImage').value.trim(),
        studioBadge: document.getElementById('studioBadge').value.trim() || null,
        watchUrl: document.getElementById('watchUrl').value.trim(),
        actors: actors.slice(), // Copy actors array
        episodes: episodes.slice(), // Copy episodes array
        submittedAt: Date.now(),
        status: 'pending',
        // YouTube channel information (verified via OAuth)
        youtubeChannel: {
          id: youtubeChannel.id,
          title: youtubeChannel.title,
          customUrl: youtubeChannel.customUrl || '',
          verifiedAt: Date.now()
        },
        // User information
        submittedBy: {
          email: currentUser?.user?.email || '',
          name: currentUser?.user?.name || '',
          googleId: currentUser?.user?.id || ''
        }
      };

      if (invalidEntries.length > 0) {
        alert('❌ Genres invalides\n\n' +
              'Les genres doivent être sélectionnés parmi la liste proposée.\n\n' +
              'Genres invalides : ' + invalidEntries.join(', ') + '\n\n' +
              '💡 Utilisez l\'auto-complétion pour sélectionner des genres valides.');
        return;
      }

      console.log('📤 [Submit] Validating form data...');

      // Validate all required fields at once
      const isSerie = (formData.type === 'série');
      const missingFields = [];
      
      // Check basic fields
      if (!formData.title) missingFields.push('Titre');
      if (!formData.type) missingFields.push('Type');
      if (formData.genres.length < 3) missingFields.push('3 Genres');
      if (!formData.description) missingFields.push('Description');
      
      // Check images
      if (!formData.portraitImage) missingFields.push('Image : Affiche Portrait');
      if (!formData.landscapeImage) missingFields.push('Image : Image Fiche');
      
      // Check YouTube URL (only for non-series)
      if (!isSerie && !formData.watchUrl) missingFields.push('Lien YouTube');
      
      // If any fields are missing, show error
      if (missingFields.length > 0) {
        alert('❌ Champs obligatoires manquants\n\n' +
              'Veuillez remplir les champs suivants :\n' +
              missingFields.map(f => '• ' + f).join('\n') + '\n\n' +
              '💡 Les champs marqués d\'une étoile (*) sont obligatoires.\n' +
              '💡 Pour les images, utilisez le bouton "Upload" Cloudinary.');
        return;
      }

      // Validate description length (max 400 characters)
      if (formData.description && formData.description.length > 400) {
        alert('❌ Description trop longue\n\n' +
              'La description doit faire maximum 400 caractères.\n\n' +
              `Actuellement : ${formData.description.length} caractères\n` +
              '💡 Veuillez raccourcir votre description.');
        return;
      }

      // Validate YouTube URL (only for non-series)
      if (!isSerie && !isValidYouTubeUrl(formData.watchUrl)) {
        alert('❌ URL YouTube invalide\n\n' +
              'Le lien YouTube fourni n\'est pas valide.\n\n' +
              'Formats acceptés :\n' +
              '• https://www.youtube.com/watch?v=...\n' +
              '• https://youtu.be/...\n' +
              '• https://www.youtube.com/embed/...');
        return;
      }

      // Check video ownership verification status (only for films and trailers)
      if (!isSerie && formData.watchUrl && !isVideoValid) {
        alert('❌ Propriété de la vidéo non vérifiée\n\n' +
              'La vidéo YouTube n\'a pas été vérifiée ou ne vous appartient pas.\n\n' +
              '💡 Veuillez saisir une URL de vidéo appartenant à votre chaîne YouTube connectée.\n\n' +
              '⏱️ Attendez que le statut de vérification affiche "✅ Vidéo vérifiée".');
        const watchUrlInput = document.getElementById('watchUrl');
        if (watchUrlInput) {
          watchUrlInput.focus();
          watchUrlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      console.log('📤 [Submit] Validation passed, saving request...');

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
      console.log('📤 [Submit] Publishing to GitHub...');
      publishUserRequestToGitHub(requestWithId).then(success => {
        if (success) {
          console.log('✅ [Submit] GitHub publish completed successfully');
        } else {
          console.warn('⚠️ [Submit] GitHub publish failed, but request was saved locally');
        }
      }).catch(err => {
        console.error('❌ [Submit] GitHub publish error:', err);
      });

      // Show success message
      showSuccessMessage();

      // Disable form
      formSection.style.opacity = '0.5';
      formSection.style.pointerEvents = 'none';

      // Clear form draft and saved slide since submission was successful
      clearFormDraft();
      clearCurrentSlide();

      console.log('✅ [Submit] Request submitted successfully:', requestWithId);
      
    } catch (error) {
      console.error('❌ [Submit] Submission error:', error);
      
      // Show detailed error message
      let errorMessage = '❌ Erreur lors de l\'envoi\n\n';
      errorMessage += 'Une erreur est survenue lors de la soumission de votre demande.\n\n';
      
      if (error.message) {
        errorMessage += 'Détails : ' + error.message + '\n\n';
      }
      
      errorMessage += 'Solutions possibles :\n';
      errorMessage += '• Vérifiez votre connexion Internet\n';
      errorMessage += '• Reconnectez-vous avec Google\n';
      errorMessage += '• Rechargez la page et réessayez\n';
      errorMessage += '• Contactez un administrateur si le problème persiste';
      
      alert(errorMessage);
    } finally {
      // Re-enable submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '📤 Envoyer la demande';
      }
    }
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
      
      // Clear images (except studio badge which will be prefilled)
      ['portraitImage', 'landscapeImage'].forEach(id => {
        const hiddenInput = document.getElementById(id);
        const preview = document.getElementById(id.replace('Image', 'Preview'));
        if (hiddenInput) hiddenInput.value = '';
        if (preview) {
          preview.src = '';
          preview.hidden = true;
        }
      });
      
      // Clear studio badge first, then prefill from history
      const studioBadgeInput = document.getElementById('studioBadge');
      const studioBadgePreview = document.getElementById('studioBadgePreview');
      if (studioBadgeInput) studioBadgeInput.value = '';
      if (studioBadgePreview) {
        studioBadgePreview.src = '';
        studioBadgePreview.hidden = true;
      }
      
      // Prefill studio badge from history
      prefillStudioBadge();
      
      // Reset video verification status
      isVideoValid = false;
      lastVerifiedUrl = null;
      const statusDiv = document.getElementById('videoVerificationStatus');
      if (statusDiv) {
        statusDiv.hidden = true;
      }
      
      // Keep terms checkbox checked if it was
      if (termsCheckbox.checked) {
        termsCheckbox.checked = true;
      }

      // Clear saved draft
      clearFormDraft();
    }
  }

  /**
   * Handle new request after previous one processed
   */
  function handleNewRequest() {
    const pendingRequest = getPendingRequest();

    if (!canStartNewRequest(pendingRequest)) {
      alert('Vous pourrez soumettre une nouvelle demande une fois le délai de 24 heures écoulé.');
      return;
    }

    // Remove only local pending state, keep history/GitHub record intact
    localStorage.removeItem(STORAGE_KEY_REQUEST);

    if (pendingRequestNotice) {
      pendingRequestNotice.hidden = true;
    }

    // Re-enable form and navigation
    enableForm();
    const stepperContainer = document.getElementById('stepperContainer');
    const slidesContainer = document.querySelector('.slides-container');
    if (stepperContainer) stepperContainer.hidden = false;
    if (slidesContainer) slidesContainer.hidden = false;

    if (requestForm) {
      requestForm.reset();
      requestForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Clear saved draft and slide
    clearFormDraft();
    clearCurrentSlide();

    alert('Vous pouvez maintenant soumettre une nouvelle demande.');
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

    // Save draft
    saveFormDraft();
  }

  /**
   * Remove actor from list
   */
  function removeActor(index) {
    actors.splice(index, 1);
    renderActorsList();
    
    // Save draft
    saveFormDraft();
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

    // Save draft
    saveFormDraft();
  }

  /**
   * Remove episode from list
   */
  function removeEpisode(index) {
    episodes.splice(index, 1);
    renderEpisodesList();
    
    // Save draft
    saveFormDraft();
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
    // Show popup confirmation
    alert('✅ Demande envoyée avec succès !\n\n' +
          '📋 Votre demande a été enregistrée et sera examinée par les administrateurs.\n\n' +
          '⏰ Vous recevrez une notification une fois que votre demande sera traitée.\n\n' +
          '💡 Vous ne pouvez soumettre qu\'une seule demande toutes les 24 heures.');

    if (!successMessage) return;

    successMessage.hidden = false;
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Hide after 15 seconds
    setTimeout(() => {
      successMessage.hidden = true;
    }, 15000);
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
   * Save form draft to localStorage
   */
  function saveFormDraft() {
    try {
      const draft = {
        title: document.getElementById('title')?.value || '',
        type: document.getElementById('type')?.value || '',
        genre1: document.getElementById('genre1')?.value || '',
        genre2: document.getElementById('genre2')?.value || '',
        genre3: document.getElementById('genre3')?.value || '',
        description: document.getElementById('description')?.value || '',
        portraitImage: document.getElementById('portraitImage')?.value || '',
        landscapeImage: document.getElementById('landscapeImage')?.value || '',
        studioBadge: document.getElementById('studioBadge')?.value || '',
        watchUrl: document.getElementById('watchUrl')?.value || '',
        actors: actors.slice(),
        episodes: episodes.slice(),
        savedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY_FORM_DRAFT, JSON.stringify(draft));
      console.log('📝 Form draft saved');
    } catch (e) {
      console.error('Error saving form draft:', e);
    }
  }

  /**
   * Load form draft from localStorage
   */
  function loadFormDraft() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_FORM_DRAFT);
      if (!data) return false;

      const draft = JSON.parse(data);
      
      // Check if draft is not too old (7 days)
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - draft.savedAt > maxAge) {
        console.log('📝 Draft too old, clearing...');
        clearFormDraft();
        return false;
      }

      console.log('📝 Restoring form draft...');

      // Restore basic fields
      const titleInput = document.getElementById('title');
      const typeInput = document.getElementById('type');
      const genre1Input = document.getElementById('genre1');
      const genre2Input = document.getElementById('genre2');
      const genre3Input = document.getElementById('genre3');
      const descInput = document.getElementById('description');
      const portraitInput = document.getElementById('portraitImage');
      const landscapeInput = document.getElementById('landscapeImage');
      const studioBadgeInput = document.getElementById('studioBadge');
      const watchUrlInput = document.getElementById('watchUrl');

      if (titleInput) titleInput.value = draft.title || '';
      if (typeInput) typeInput.value = draft.type || '';
      if (genre1Input) genre1Input.value = draft.genre1 || '';
      if (genre2Input) genre2Input.value = draft.genre2 || '';
      if (genre3Input) genre3Input.value = draft.genre3 || '';
      if (descInput) descInput.value = draft.description || '';
      if (portraitInput) portraitInput.value = draft.portraitImage || '';
      if (landscapeInput) landscapeInput.value = draft.landscapeImage || '';
      if (studioBadgeInput) studioBadgeInput.value = draft.studioBadge || '';
      if (watchUrlInput) watchUrlInput.value = draft.watchUrl || '';

      // Restore image previews
      if (draft.portraitImage) {
        const preview = document.getElementById('portraitPreview');
        if (preview) {
          preview.src = draft.portraitImage;
          preview.hidden = false;
        }
      }
      if (draft.landscapeImage) {
        const preview = document.getElementById('landscapePreview');
        if (preview) {
          preview.src = draft.landscapeImage;
          preview.hidden = false;
        }
      }
      if (draft.studioBadge) {
        const preview = document.getElementById('studioBadgePreview');
        if (preview) {
          preview.src = draft.studioBadge;
          preview.hidden = false;
        }
      }

      // Restore actors and episodes
      if (Array.isArray(draft.actors)) {
        actors = draft.actors.slice();
        renderActorsList();
      }
      if (Array.isArray(draft.episodes)) {
        episodes = draft.episodes.slice();
        renderEpisodesList();
      }

      // Trigger type change to show/hide episodes
      if (typeInput) {
        typeInput.dispatchEvent(new Event('change'));
      }

      // Trigger description input to update character counter
      if (descInput) {
        descInput.dispatchEvent(new Event('input'));
      }

      console.log('✅ Form draft restored');
      return true;
    } catch (e) {
      console.error('Error loading form draft:', e);
      return false;
    }
  }

  /**
   * Clear form draft from localStorage
   */
  function clearFormDraft() {
    try {
      localStorage.removeItem(STORAGE_KEY_FORM_DRAFT);
      console.log('📝 Form draft cleared');
    } catch (e) {
      console.error('Error clearing form draft:', e);
    }
  }

  /**
   * Save current slide/step
   */
  function saveCurrentSlide(slideNumber) {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT_SLIDE, slideNumber.toString());
    } catch (e) {
      console.error('Error saving current slide:', e);
    }
  }

  /**
   * Load saved slide/step
   */
  function loadCurrentSlide() {
    try {
      const slide = localStorage.getItem(STORAGE_KEY_CURRENT_SLIDE);
      return slide ? parseInt(slide, 10) : 1;
    } catch (e) {
      console.error('Error loading current slide:', e);
      return 1;
    }
  }

  /**
   * Clear saved slide
   */
  function clearCurrentSlide() {
    try {
      localStorage.removeItem(STORAGE_KEY_CURRENT_SLIDE);
    } catch (e) {
      console.error('Error clearing current slide:', e);
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
    // Save to user's personal history
    const history = getRequestHistory();
    history.unshift({
      id: request.id || Date.now().toString(),
      ...request,
      submittedAt: request.submittedAt || Date.now()
    });
    saveRequestHistory(history);
    renderHistory();
    
    // ALSO save to admin-visible requests list (shared storage)
    try {
      const adminRequests = JSON.parse(localStorage.getItem('user_requests_history') || '[]');
      
      // Check if already exists
      const existingIndex = adminRequests.findIndex(r => r.id === request.id);
      
      if (existingIndex === -1) {
        // Add new request
        adminRequests.unshift({
          ...request,
          status: request.status || 'pending',
          submittedAt: request.submittedAt || Date.now()
        });
        localStorage.setItem('user_requests_history', JSON.stringify(adminRequests));
        console.log('✓ Request added to admin-visible list');
      }
    } catch (e) {
      console.error('Error adding to admin requests:', e);
    }
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

  // Expose functions and variables globally
  window.__deleteHistoryItem = deleteFromHistory;
  window.goToSlide = goToSlide;
  Object.defineProperty(window, 'currentSlide', {
    get: function() { return currentSlide; }
  });

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

})();
