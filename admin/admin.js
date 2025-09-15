'use strict';

(function(){
  const APP_KEY_REQ = 'clipsou_requests_v1';
  const APP_KEY_APPROVED = 'clipsou_items_approved_v1';
  const APP_KEY_DRAFT = 'clipsou_admin_form_draft_v1';
  const APP_KEY_SESSION = 'clipsou_admin_session_v1';
  const APP_KEY_REMEMBER = 'clipsou_admin_remember_v1';
  const APP_KEY_CLD = 'clipsou_admin_cloudinary_v1';
  const APP_KEY_CLD_LOCK = 'clipsou_admin_cloudinary_lock_v1';
  const APP_KEY_PUB = 'clipsou_admin_publish_api_v1';
  const APP_KEY_PUB_TIMES = 'clipsou_admin_publish_times_v1';
  const APP_KEY_DEPLOY_TRACK = 'clipsou_admin_deploy_track_v1';
  const APP_KEY_LAST_EDIT = 'clipsou_admin_last_edit_v1';
  const APP_KEY_ACTOR_PHOTOS = 'clipsou_admin_actor_photos_v1';
  const APP_KEY_GOOGLE_PROFILE = 'clipsou_admin_google_profile_v1';
  const APP_KEY_GOOGLE_CLIENT = 'clipsou_admin_google_client_v1';
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // ===== Utilities: normalization, validation, and deduplication =====
  function normalizeTitleKey(s) {
    try {
      return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .trim();
    } catch (_) {
      return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
    }
  // ===== Google Sign-In (optional, to remember admin profile) =====
  function getGoogleClientId(){ try { return localStorage.getItem(APP_KEY_GOOGLE_CLIENT) || ''; } catch { return ''; } }
  function setGoogleClientId(id){ try { localStorage.setItem(APP_KEY_GOOGLE_CLIENT, String(id||'')); } catch {} }
  function getGoogleProfile(){ try { return JSON.parse(localStorage.getItem(APP_KEY_GOOGLE_PROFILE)||'null') || null; } catch { return null; } }
  function setGoogleProfile(p){ try { localStorage.setItem(APP_KEY_GOOGLE_PROFILE, JSON.stringify(p||{})); } catch {} }
  function clearGoogleProfile(){ try { localStorage.removeItem(APP_KEY_GOOGLE_PROFILE); } catch {} }
  function ensureGoogleClientId(){
    let cid = getGoogleClientId();
    if (!cid) {
      cid = prompt('Entrez votre Google OAuth Client ID Web (ex: 1234-abcdef.apps.googleusercontent.com):', '') || '';
      if (cid) setGoogleClientId(cid.trim());
    }
    return getGoogleClientId();
  }
  function decodeJwtPayload(jwt){
    try {
      const parts = String(jwt||'').split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1].replace(/-/g,'+').replace(/_/g,'/');
      const json = decodeURIComponent(atob(payload).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(json);
    } catch { return null; }
  }
  function initGoogle(callback){
    const cid = getGoogleClientId();
    if (!cid) return false;
    if (!(window && window.google && google.accounts && google.accounts.id)) return false;
    try {
      google.accounts.id.initialize({
        client_id: cid,
        callback: (response)=>{
          try {
            const payload = decodeJwtPayload(response && response.credential);
            if (payload && payload.sub) {
              const profile = {
                id: payload.sub,
                email: payload.email || '',
                name: payload.name || '',
                picture: payload.picture || ''
              };
              setGoogleProfile(profile);
              const stTop = document.getElementById('googleStatusTop');
              if (stTop) stTop.textContent = profile.email ? ('Compte Google lié: ' + profile.email) : 'Compte Google lié';
          }
          } catch {}
          if (typeof callback === 'function') callback();
        }
      });
      return true;
    } catch { return false; }
  }

  // Fetch public approved.json to hydrate actor photos map for admin UI
  async function fetchPublicApprovedArray(){
    const cfg = getPublishConfig();
    const tryUrls = [
      cfg && cfg.publicApprovedUrl ? cfg.publicApprovedUrl : null,
      '../data/approved.json'
    ].filter(Boolean);
    for (const u of tryUrls) {
      try {
        const res = await fetch(u + '?v=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' });
        if (!res.ok) continue;
        const json = await res.json();
        if (Array.isArray(json)) return json;
        if (json && typeof json === 'object') {
          if (Array.isArray(json.approved)) return json.approved;
          if (Array.isArray(json.items)) return json.items;
          if (Array.isArray(json.data)) return json.data;
        }
      } catch {}
    }
    return [];
  }

  function buildActorPhotoMapFromArray(arr) {
    // Note: keep normalization consistent with getActorPhotoMap()
    const map = {};
    const norm = (s)=>{
      try { return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim(); }
      catch { return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim(); }
    };
    (arr || []).forEach(it => {
      const actors = Array.isArray(it && it.actors) ? it.actors : [];
      actors.forEach(a => { if (a && a.name && a.photo) { const k = norm(a.name); if (k && !map[k]) map[k] = a.photo; } });
    });
    return map;
  }

  async function hydrateActorPhotoMapFromPublic(){
    try {
      const items = await fetchPublicApprovedArray();
      if (!items || !items.length) return;
      const current = getActorPhotoMap();
      const fromPublic = buildActorPhotoMapFromArray(items);
      const merged = { ...fromPublic, ...current }; // local overrides win
      setActorPhotoMap(merged);
      // If form currently has actors, re-render to show avatars
      try {
        const dataActors = JSON.parse($('#contentForm').dataset.actors || '[]');
        if (Array.isArray(dataActors) && dataActors.length) {
          renderActors(dataActors);
        }
      } catch {}
    } catch {}
  }

  function isValidImageLike(url) {
    if (!url) return false;
    const u = String(url).trim();
    if (/^https?:\/\//i.test(u)) return true;
    return /(\.png|\.jpe?g|\.webp)$/i.test(u);
  }

  function isValidWatchUrl(u) {
    if (!u) return false;
    try {
      const url = new URL(u, window.location.href);
      if (!/^https?:$/i.test(url.protocol)) return false;
      return /youtube\.com|youtu\.be/i.test(url.hostname);
    } catch {
      return false;
    }
  }

  function validateData(data) {
    const errors = [];
    const title = String(data.title || '').trim();
    if (title.length < 2) errors.push('Titre trop court.');
    const typeOk = ['film', 'série', 'trailer'].includes(String(data.type||'').trim());
    if (!typeOk) errors.push('Type invalide.');
    if (typeof data.rating !== 'undefined') {
      const r = data.rating;
      if (!(typeof r === 'number' && r >= 0 && r <= 5)) errors.push('Note doit être entre 0 et 5.');
      if (Math.round(r*2) !== r*2) errors.push('Note doit être par pas de 0.5.');
    }
    const genres = Array.isArray(data.genres) ? data.genres.filter(Boolean) : [];
    if (genres.length !== 3) errors.push('3 genres sont requis.');
    if (new Set(genres.map(g=>g.toLowerCase())).size !== genres.length) errors.push('Les genres doivent être uniques.');
    if (!isValidWatchUrl(data.watchUrl)) errors.push('Lien YouTube invalide.');
    if (data.portraitImage && !isValidImageLike(data.portraitImage)) errors.push('Image carte (portrait) invalide.');
    if (data.landscapeImage && !isValidImageLike(data.landscapeImage)) errors.push('Image fiche (paysage) invalide.');
    return { ok: errors.length === 0, message: errors.join('\n') };
  }

  function dedupeByIdAndTitle(items) {
    const byTitle = new Map();
    const byId = new Map();
    (items||[]).forEach(it => {
      if (!it) return;
      const key = normalizeTitleKey(it.title || '');
      const id = it.id || '';
      // Prefer last occurrence (most recently edited)
      if (key) byTitle.set(key, it);
      if (id) byId.set(id, it);
    });
    // Merge preference: ensure uniqueness by title primarily
    const out = new Map();
    byTitle.forEach((it, key) => { out.set(key, it); });
    // Ensure any items with unique ids but missing/duplicate titles are included only once
    byId.forEach(it => {
      const key = normalizeTitleKey(it.title || '');
      if (!out.has(key)) out.set(key, it);
    });
    return Array.from(out.values());
  }

  // ===== Cloudinary config (unsigned upload) =====
  // Renseignez ici votre cloud name et votre upload preset configuré en "unsigned" dans Cloudinary.
  // Doc: https://cloudinary.com/documentation/upload_images#unsigned_upload
  // Valeurs par défaut (préremplies et verrouillées par défaut dans l'UI)
  const CLOUDINARY = {
    cloudName: 'dlaisw4zm',
    uploadPreset: 'dlaisw4zm_unsigned',
    folder: ''
  };

  function getCldConfig(){
    try {
      const saved = JSON.parse(localStorage.getItem(APP_KEY_CLD) || 'null');
      const cfg = Object.assign({}, CLOUDINARY, saved || {});
      return cfg;
    } catch { return Object.assign({}, CLOUDINARY); }
  }

  function getPublishTimes(){
    try { return JSON.parse(localStorage.getItem(APP_KEY_PUB_TIMES) || '{}'); } catch { return {}; }
  }
  function setPublishTimes(map){
    try { localStorage.setItem(APP_KEY_PUB_TIMES, JSON.stringify(map||{})); } catch {}
  }

  function getDeployTrack(){
    try { return JSON.parse(localStorage.getItem(APP_KEY_DEPLOY_TRACK) || '{}'); } catch { return {}; }
  }
  function setDeployTrack(map){
    try { localStorage.setItem(APP_KEY_DEPLOY_TRACK, JSON.stringify(map||{})); } catch {}
  }

  // ===== UI: transient publish wait hint (30s) =====
  function setPublishLockUntil(ts){
    try { window.__publishLockUntil = ts; } catch { window.__publishLockUntil = ts; }
  }
  function getPublishLockUntil(){
    try { return Number(window.__publishLockUntil||0) || 0; } catch { return 0; }
  }
  function isPublishLocked(){ return Date.now() < getPublishLockUntil(); }
  function applyPublishLockUI(){
    try {
      const locked = isPublishLocked();
      const buttons = Array.from(document.querySelectorAll('.requests button, #contentForm button[type="submit"], #contentForm .btn[type="submit"]'));
      buttons.forEach(btn => {
        try {
          if (locked) {
            if (!btn.dataset.lockedGlobal) {
              btn.dataset.prevDisabled = btn.disabled ? '1' : '0';
              btn.dataset.lockedGlobal = '1';
            }
            btn.disabled = true;
            btn.setAttribute('disabled', 'disabled');
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.6';
          } else {
            if (btn.dataset.lockedGlobal) {
              const prev = btn.dataset.prevDisabled === '1';
              btn.disabled = prev;
              if (!prev) btn.removeAttribute('disabled');
              btn.style.pointerEvents = '';
              btn.style.opacity = '';
              delete btn.dataset.lockedGlobal;
              delete btn.dataset.prevDisabled;
            }
          }
        } catch {}
      });
    } catch {}
  }
  function showPublishWaitHint(){
    try {
      let el = document.getElementById('publishWaitHint');
      if (!el) {
        el = document.createElement('p');
        el.id = 'publishWaitHint';
        el.className = 'muted';
        el.style.margin = '8px 0';
        const sec = document.querySelector('.requests');
        if (sec) {
          const h2 = sec.querySelector('h2');
          if (h2) h2.insertAdjacentElement('afterend', el);
          else sec.prepend(el);
        } else {
          document.body.appendChild(el);
        }
      }
      el.textContent = "⌛Veuillez patienter 30s le temps que github fasse les modifications";
      el.hidden = false;
      // Set a global lock window for 30s and apply UI; resilient to table re-renders
      const until = Date.now() + 30000;
      setPublishLockUntil(until);
      applyPublishLockUI();
      // During the 30s window, re-apply lock UI periodically in case of dynamic re-renders
      try {
        if (window.__publishLockInterval) clearInterval(window.__publishLockInterval);
      } catch {}
      try {
        window.__publishLockInterval = setInterval(() => {
          try {
            if (!isPublishLocked()) {
              clearInterval(window.__publishLockInterval);
              window.__publishLockInterval = null;
              return;
            }
            applyPublishLockUI();
          } catch {}
        }, 250);
      } catch {}
      // Global hint timer to hide the message
      if (el._hintTO) clearTimeout(el._hintTO);
      el._hintTO = setTimeout(()=>{ try { el.hidden = true; applyPublishLockUI(); if (window.__publishLockInterval) { clearInterval(window.__publishLockInterval); window.__publishLockInterval = null; } } catch{} }, 30000);
    } catch {}
  }

  // Shallow compare of arrays (by values) and primitives inside item fields we care about
  function arraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i=0; i<a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function actorsEqual(a, b){
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i=0; i<a.length; i++) {
      const ai = a[i]||{}; const bi = b[i]||{};
      if ((ai.name||'') !== (bi.name||'')) return false;
      if ((ai.role||'') !== (bi.role||'')) return false;
      // Compare photo URLs too (optional field)
      if ((ai.photo||'') !== (bi.photo||'')) return false;
    }
    return true;
  }
  function itemMatchesPublic(expected, remote){
    if (!expected || !remote) return false;
    // Compare key fields only
    if ((expected.title||'') !== (remote.title||'')) return false;
    if ((expected.type||'') !== (remote.type||'')) return false;
    const er = (typeof expected.rating==='number') ? expected.rating : undefined;
    const rr = (typeof remote.rating==='number') ? remote.rating : undefined;
    if (er !== rr) return false;
    const eg = Array.isArray(expected.genres) ? expected.genres.slice() : [];
    const rg = Array.isArray(remote.genres) ? remote.genres.slice() : [];
    if (!arraysEqual(eg, rg)) return false;
    if ((expected.description||'') !== (remote.description||'')) return false;
    if ((expected.watchUrl||'') !== (remote.watchUrl||'')) return false;
    const ep = expected.portraitImage || '';
    const el = expected.landscapeImage || '';
    const ri = remote.image || '';
    // remote may flatten to image only: accept match if any of images equals remote.image or remote has portrait/landscape
    const rp = remote.portraitImage || '';
    const rl = remote.landscapeImage || '';
    const imageOk = (ri && (ri===ep || ri===el)) || (!ri && (rp===ep && rl===el)) || (!!rp && rp===ep) || (!!rl && rl===el);
    if (!imageOk) return false;
    const sa = Array.isArray(expected.actors) ? expected.actors.filter(x=>x&&x.name) : [];
    const ra = Array.isArray(remote.actors) ? remote.actors.filter(x=>x&&x.name) : [];
    if (sa.length || ra.length) {
      if (!actorsEqual(sa, ra)) return false;
    }
    const sb = (expected.studioBadge||'') || '';
    const rb = (remote.studioBadge||'') || '';
    if (sb || rb) { if (sb !== rb) return false; }
    return true;
  }

  // Poll GitHub Pages public JSON to detect when an approved item is live and, for upsert, when fields match the expected item
  async function isItemLivePublic(id, expected){
    const cfg = getPublishConfig();
    const absolute = (typeof window !== 'undefined' && window.location) ? (window.location.origin + '/data/approved.json') : null;
    const tryUrls = [
      cfg && cfg.publicApprovedUrl ? cfg.publicApprovedUrl : null,
      absolute,
      '../data/approved.json',
      'data/approved.json'
    ].filter(Boolean);
    for (const base of tryUrls) {
      try {
        const res = await fetch(base + '?v=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' });
        if (!res.ok) continue;
        const json = await res.json();
        // Robust detection: handle array at root or under common keys
        const collect = [];
        if (Array.isArray(json)) collect.push(json);
        if (json && typeof json === 'object') {
          if (Array.isArray(json.approved)) collect.push(json.approved);
          if (Array.isArray(json.items)) collect.push(json.items);
          if (Array.isArray(json.data)) collect.push(json.data);
        }
        for (const arr of collect) {
          const found = arr.find(x => x && x.id === id);
          if (found) {
            // If an expected item is provided (upsert), ensure the public data matches the update
            if (expected && typeof expected === 'object') {
              if (itemMatchesPublic(expected, found)) return true;
              // found but not matching yet; continue polling
            } else {
              return true;
            }
          }
        }
      } catch {}
    }
    return false;
  }

  const deployWatchers = new Map();
  function startDeploymentWatch(id, action='upsert', expected){
    if (!id) return;
    const key = id + '::' + action;
    if (deployWatchers.has(key)) return;
    const tick = async () => {
      const live = await isItemLivePublic(id, expected);
      const satisfied = (action === 'upsert') ? !!live : !live;
      if (satisfied) {
        const track = getDeployTrack();
        const prev = track[id] || {};
        track[id] = { ...prev, action, startedAt: prev.startedAt || Date.now(), confirmedAt: Date.now() };
        setDeployTrack(track);
        // On successful upsert confirmation, set the corresponding request back to 'approved'
        try {
          if (action === 'upsert') {
            const list = getRequests();
            let changed = false;
            list.forEach(r => { if (r && r.data && r.data.id === id && r.status !== 'approved') { r.status = 'approved'; changed = true; } });
            if (changed) setRequests(list);
          }
        } catch {}
        renderTable();
        const t = deployWatchers.get(key); if (t) clearTimeout(t);
        deployWatchers.delete(key);
        return;
      }
      const handle = setTimeout(tick, 30000);
      deployWatchers.set(key, handle);
    };
    const track = getDeployTrack();
    const prev = track[id] || {};
    track[id] = { ...prev, action, startedAt: prev.startedAt || Date.now(), confirmedAt: undefined };
    setDeployTrack(track);
    const handle = setTimeout(tick, 0);
    deployWatchers.set(key, handle);
  }

  function setCldConfig(cfg){
    try { localStorage.setItem(APP_KEY_CLD, JSON.stringify(cfg || {})); } catch {}
  }

  function cloudinaryConfigured(){
    const cfg = getCldConfig();
    return cfg.cloudName && cfg.uploadPreset &&
           !String(cfg.cloudName).includes('<') &&
           !String(cfg.uploadPreset).includes('<');
  }

  function cloudinaryUploadUrl(){
    const cfg = getCldConfig();
    return `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`;
  }

  function transformDeliveryUrl(url){
    // Ajoute les transformations f_auto,q_auto pour servir en WEBP/AVIF avec qualité auto
    try { return url.replace('/upload/', '/upload/f_auto,q_auto/'); } catch { return url; }
  }

  async function uploadImageToCloudinary(file){
    if (!cloudinaryConfigured()) {
      alert('Cloudinary n\'est pas configuré. Merci de renseigner « Cloud name » et « Upload preset » dans la section Stockage images (en haut de l\'admin).');
      throw new Error('Cloudinary not configured');
    }
    const cfg = getCldConfig();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', cfg.uploadPreset);
    if (cfg.folder) fd.append('folder', cfg.folder);
    const res = await fetch(cloudinaryUploadUrl(), { method: 'POST', body: fd });
    if (!res.ok) {
      const txt = await res.text().catch(()=>String(res.status));
      throw new Error('Upload failed: '+txt);
    }
    const json = await res.json();
    if (!json || !json.secure_url) throw new Error('Réponse upload invalide');
    return transformDeliveryUrl(json.secure_url);
  }

  function setPreview(imgEl, value){
    if (!imgEl) return;
    const url = (value||'').trim();
    if (!url) {
      imgEl.hidden = true;
      try { imgEl.removeAttribute('src'); } catch {}
      return;
    }
    const full = url.startsWith('http') ? url : `../${url}`;
    imgEl.src = full;
    imgEl.hidden = false;
  }

  function loadJSON(key, fallback){
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch(_) { return fallback; }
  }
  function saveJSON(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getLastEditedId(){
    try { return String(localStorage.getItem(APP_KEY_LAST_EDIT) || ''); } catch { return ''; }
  }
  function setLastEditedId(id){
    try { if (id) localStorage.setItem(APP_KEY_LAST_EDIT, String(id)); } catch {}
  }
  function clearLastEditedId(){
    try { localStorage.removeItem(APP_KEY_LAST_EDIT); } catch {}
  }

  function getActorPhotoMap(){
    // Merge sources: manual overrides (local), requests, approved. Manual overrides take precedence.
    let out = {};
    try { out = JSON.parse(localStorage.getItem(APP_KEY_ACTOR_PHOTOS) || '{}') || {}; } catch { out = {}; }
    // Robust normalization for matching actor names
    const normalizeActorKey = (s) => {
      try {
        return String(s||'')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g,'')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g,'')
          .trim();
      } catch {
        return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
      }
    };
    // Helper to set if absent (case-insensitive awareness)
    const setIfEmpty = (name, url) => {
      if (!name || !url) return;
      const key = normalizeActorKey(name);
      if (!key) return;
      if (!(key in out)) out[key] = url;
    };
    // Seed with default local assets for common actors (filenames in site root)
    try {
      const def = (function(){
        const norm = (s)=>{ try { return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim(); } catch { return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim(); } };
        const map = {};
        // Known assets available in project root
        const pairs = [
          ['Liam Roxxor','liam-roxxor.webp'],
          ['Kassielator','kassielator.webp'],
          ['Ferrisbu','ferrisbu.webp'],
          ['Clone Prod','clone-prod.webp'],
          ['Raiback','raiback.webp'],
          ['Beat Vortex','beat-vortex.webp'],
          ['Arth','arth.webp'],
          ['Steve Animation','steve-animation.webp'],
          ["Le Zebre'ifique",'le-zebre-ifique.webp']
        ];
        pairs.forEach(([name, file])=>{ const k = norm(name); if (k && !map[k]) map[k] = file; });
        return map;
      })();
      // Defaults fill missing values only; existing manual entries keep priority
      out = { ...def, ...out };
    } catch {}
    // Normalize any pre-existing manual overrides to normalized keys
    try {
      const rebuilt = {};
      for (const k in out) {
        if (!Object.prototype.hasOwnProperty.call(out,k)) continue;
        const nk = normalizeActorKey(k);
        if (!nk) continue;
        if (!(nk in rebuilt)) rebuilt[nk] = out[k];
      }
      out = rebuilt;
    } catch {}
    // From requests
    try {
      const reqs = getRequests();
      (reqs||[]).forEach(r => {
        const actors = r && r.data && Array.isArray(r.data.actors) ? r.data.actors : [];
        actors.forEach(a => { if (a && a.name && a.photo) setIfEmpty(a.name, a.photo); });
      });
    } catch {}
    // From approved
    try {
      const apr = getApproved();
      (apr||[]).forEach(it => {
        const actors = it && Array.isArray(it.actors) ? it.actors : [];
        actors.forEach(a => { if (a && a.name && a.photo) setIfEmpty(a.name, a.photo); });
      });
    } catch {}
    return out;
  }
  function setActorPhotoMap(map){
    try { localStorage.setItem(APP_KEY_ACTOR_PHOTOS, JSON.stringify(map||{})); } catch {}
  }

  // Resolve a photo for a given actor name using case-insensitive lookup
  function resolveActorPhoto(photoMap, name){
    try {
      if (!name) return '';
      // Use the same normalization as in the map
      const key = (function(){
        try {
          return String(name)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g,'')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g,'')
            .trim();
        } catch {
          return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
        }
      })();
      if (!key) return '';
      return (photoMap && photoMap[key]) || '';
    } catch { return ''; }
  }

  function uid(){ return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8); }
  function makeIdFromTitle(title){
    const base = String(title||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    return 'custom-' + base + '-' + Math.random().toString(36).slice(2,6);
  }

  function getRequests(){ return loadJSON(APP_KEY_REQ, []); }
  function setRequests(list){ saveJSON(APP_KEY_REQ, list); }
  function getApproved(){ return loadJSON(APP_KEY_APPROVED, []); }
  function setApproved(list){ saveJSON(APP_KEY_APPROVED, list); }

  function getPublishConfig(){
    try { return JSON.parse(localStorage.getItem(APP_KEY_PUB) || 'null') || {}; } catch { return {}; }
  }
  function setPublishConfig(cfg){
    try { localStorage.setItem(APP_KEY_PUB, JSON.stringify(cfg||{})); } catch {}
  }
  async function ensurePublishConfig(){
    let cfg = getPublishConfig();
    if (!cfg.url) {
      if (!confirm('Configurer l\'API de publication maintenant ?')) return null;
      const url = prompt('Entrez l\'URL de l\'API de publication (ex: https://votre-worker.workers.dev/publish-approved):', cfg.url||'');
      if (!url) return null;
      const secret = prompt('Entrez le secret de l\'API (il sera stocké uniquement dans ce navigateur):', cfg.secret||'');
      if (!secret) return null;
      // Optional: URL publique de approved.json pour vérifier le déploiement GitHub Pages
      let defaultPublic = '';
      try { defaultPublic = (window.location.origin || '') + '/data/approved.json'; } catch {}
      const publicApprovedUrl = prompt('URL publique du approved.json (optionnel, ex: https://<user>.github.io/<repo>/data/approved.json):', cfg.publicApprovedUrl || defaultPublic || '');
      cfg = { url: url.trim(), secret: secret.trim(), publicApprovedUrl: (publicApprovedUrl||'').trim() };
      setPublishConfig(cfg);
    } else if (!cfg.publicApprovedUrl) {
      // Backfill publicApprovedUrl if missing
      try {
        const guess = (window.location.origin || '') + '/data/approved.json';
        cfg.publicApprovedUrl = guess;
        setPublishConfig(cfg);
      } catch {}
    }
    return cfg;
  }

  // ===== Helpers =====
  function stampUpdatedAt(req) {
    try {
      const now = Date.now();
      if (req && typeof req === 'object') {
        if (!req.meta) req.meta = {};
        req.meta.updatedAt = now;
      }
      return req;
    } catch {}
    return req;
  }

  async function publishApproved(item, action='upsert'){
    const cfg = await ensurePublishConfig();
    if (!cfg || !cfg.url || !cfg.secret) return false;
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + cfg.secret
        },
        body: JSON.stringify(
          action === 'delete'
            ? { action: 'delete', id: item && item.id ? item.id : item }
            : { action: 'upsert', item }
        )
      });
      if (!res.ok) {
        const text = await res.text().catch(()=>String(res.status));
        alert('Publication API: échec ('+res.status+'). ' + text);
        return false;
      }
      console.log('Publication API: succès');
      return true;
    } catch (e) {
      console.error(e);
      alert('Publication API: erreur réseau.');
      return false;
    }
  }

  async function deleteApproved(id){
    return publishApproved(id, 'delete');
  }

  function renderActors(list){
    const wrap = $('#actorsList');
    wrap.innerHTML = '';
    const photoMap = getActorPhotoMap();
    // Local drag source index for reordering within this render cycle
    let dragSrcIndex = null;
    (list||[]).forEach((a, idx) => {
      const chip = document.createElement('div');
      chip.className = 'actor-chip';
      // Make each chip draggable for reordering
      chip.setAttribute('draggable', 'true');
      chip.addEventListener('dragstart', (e) => {
        dragSrcIndex = idx;
        try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(idx)); } catch {}
        chip.classList.add('dragging');
      });
      chip.addEventListener('dragover', (e) => {
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'move'; } catch {}
        chip.classList.add('drop-target');
      });
      chip.addEventListener('dragleave', () => {
        chip.classList.remove('drop-target');
      });
      chip.addEventListener('drop', (e) => {
        e.preventDefault();
        chip.classList.remove('drop-target');
        let from = (dragSrcIndex!=null) ? dragSrcIndex : -1;
        try {
          if (from < 0) from = parseInt((e.dataTransfer && e.dataTransfer.getData('text/plain'))||'-1', 10);
        } catch {}
        const to = idx;
        if (isNaN(from) || from < 0 || from === to) return;
        // Reorder list in place
        const moved = list.splice(from, 1)[0];
        list.splice(to, 0, moved);
        // Persist into form dataset and rerender to refresh indices
        try { $('#contentForm').dataset.actors = JSON.stringify(list); } catch {}
        try { saveDraft(); } catch {}
        // Re-enable submit button to reflect unsaved changes
        try {
          const btn = document.querySelector('#contentForm .actions .btn[type="submit"], #contentForm .actions button[type="submit"]');
          if (btn) { btn.disabled = false; btn.removeAttribute('disabled'); btn.style.pointerEvents = ''; }
        } catch {}
        renderActors(list);
      });
      chip.addEventListener('dragend', () => {
        chip.classList.remove('dragging');
        dragSrcIndex = null;
      });
      // Optional avatar if a.photo is present
      const effectivePhoto = (a && a.photo) || resolveActorPhoto(photoMap, a && a.name || '');
      if (effectivePhoto) {
        const img = document.createElement('img');
        img.className = 'avatar';
        img.alt = a.name || 'acteur';
        img.loading = 'lazy';
        img.decoding = 'async';
        try {
          const full = String(effectivePhoto).startsWith('http') ? effectivePhoto : ('../' + effectivePhoto);
          img.src = full;
          img.onerror = () => { try { /* silent */ } catch{} img.remove(); };
        } catch {
          img.src = effectivePhoto || '';
        }
        chip.appendChild(img);
      }
      const nameSpan = document.createElement('span'); nameSpan.textContent = a.name || '';
      const roleSpan = document.createElement('span'); roleSpan.className = 'muted small'; roleSpan.textContent = a.role || '';
      chip.appendChild(nameSpan);
      chip.appendChild(roleSpan);
      const rm = document.createElement('button');
      rm.className = 'remove';
      rm.type = 'button';
      rm.textContent = '✕';
      rm.addEventListener('click', () => {
        list.splice(idx,1);
        // Persist new list into form dataset immediately so submit/draft reflect removal
        try { $('#contentForm').dataset.actors = JSON.stringify(list); } catch {}
        renderActors(list);
        // Update draft to avoid old actors reappearing on refresh
        try { saveDraft(); } catch {}
        // Mark form as having unsaved changes so the user can re-enregistrer
        try {
          const btn = document.querySelector('#contentForm .actions .btn[type="submit"], #contentForm .actions button[type="submit"]');
          if (btn) { btn.disabled = false; btn.removeAttribute('disabled'); btn.style.pointerEvents = ''; }
        } catch {}
      });
      chip.appendChild(rm);
      wrap.appendChild(chip);
    });
  }

  function ensureAuth(){
    const app = $('#app');
    const login = $('#login');
    function showLogin(){ if (app) app.hidden = true; if (login) login.hidden = false; }
    function showApp(){ if (login) login.hidden = true; if (app) app.hidden = false; }
    // Helper to update header UI based on Firebase user
    function updateAuthUI(user){
      try {
        const gStatusTop = document.getElementById('googleStatusTop');
        const avatar = document.getElementById('googleAvatarTop');
        if (gStatusTop) {
          if (user && user.email) {
            gStatusTop.textContent = 'Connecté avec Google: ' + user.email;
            gStatusTop.classList.remove('muted');
          } else {
            gStatusTop.textContent = '';
            gStatusTop.classList.add('muted');
          }
        }
        if (avatar) {
          if (user && user.photoURL) { avatar.src = user.photoURL; avatar.style.display = ''; }
          else { avatar.removeAttribute('src'); avatar.style.display = 'none'; }
        }
      } catch {}
    }

    // Simple notice line inside login box
    function showNotice(msg){
      try {
        let st = document.getElementById('loginStatus');
        if (!st) return;
        st.textContent = msg || '';
      } catch {}
    }

    // Firebase Auth: reflect session state
    try {
      if (window.__onAuthStateChanged && window.__fbAuth) {
        window.__onAuthStateChanged(window.__fbAuth, (user)=>{
          updateAuthUI(user);
          if (user) { showApp(); initApp(); showNotice('Connecté avec Google'); }
        });
      }
    } catch {}
    // Existing session
    try {
      // If "remember" is set, auto-login without prompting
      if (localStorage.getItem(APP_KEY_REMEMBER) === '1') {
        sessionStorage.setItem(APP_KEY_SESSION, '1');
        showApp();
        initApp();
        return;
      }
      if (sessionStorage.getItem(APP_KEY_SESSION) === '1') {
        showApp();
        initApp();
        return;
      }
    } catch {}

    showLogin();
    const btn = $('#loginBtn');
    const pwdInput = $('#passwordInput');
    const showPwd = $('#showPwd');
    const gBtnTop = $('#googleLinkBtn');
    const logoutBtn = $('#logoutBtn');
    const gStatusTop = $('#googleStatusTop');
    // Create a tiny status line for diagnostics
    try {
      let st = document.getElementById('loginStatus');
      const loginBox = document.getElementById('login');
      if (!st && loginBox) {
        st = document.createElement('p');
        st.id = 'loginStatus';
        st.className = 'small muted';
        st.style.margin = '8px 0 0';
        loginBox.appendChild(st);
      }
      if (st) st.textContent = 'UI prête (handler en cours de liaison)';
    } catch {}

    // Prefill password if previously remembered
    try {
      if (localStorage.getItem(APP_KEY_REMEMBER) === '1') {
        if (pwdInput) pwdInput.value = '20Blabla30';
      }
    } catch {}

    // Show/hide password
    if (showPwd && pwdInput) {
      showPwd.addEventListener('change', () => {
        pwdInput.type = showPwd.checked ? 'text' : 'password';
      });
    }

    // If Firebase already has a user, show email/avatar immediately
    try {
      const u = (window.__fbAuth && window.__fbAuth.currentUser) || null;
      updateAuthUI(u);
    } catch {}

    // Wire Google Sign-In button (Firebase Auth)
    if (gBtnTop) {
      gBtnTop.addEventListener('click', async () => {
        try {
          if (!(window.__fbAuth && window.__GoogleAuthProvider && window.__signInWithPopup)) {
            alert('Firebase Auth non initialisé.');
            return;
          }
          const provider = new window.__GoogleAuthProvider();
          const cred = await window.__signInWithPopup(window.__fbAuth, provider);
          try { updateAuthUI(cred && cred.user); showNotice('Connecté avec Google'); } catch {}
          // onAuthStateChanged will fire and show the app
        } catch (e) {
          alert('Connexion Google impossible.');
        }
      });
    }
    // Wire logout to Firebase signOut when available
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async ()=>{
        try { if (window.__fbSignOut && window.__fbAuth) await window.__fbSignOut(window.__fbAuth); } catch {}
        try { sessionStorage.removeItem(APP_KEY_SESSION); } catch {}
        try { updateAuthUI(null); showNotice('Déconnecté'); } catch {}
        showLogin();
      });
    }



    function doLogin(){
      const pwd = (pwdInput && pwdInput.value) || '';
      if (pwd === '20Blabla30') {
        try { sessionStorage.setItem(APP_KEY_SESSION, '1'); } catch {}
        // Always remember once successfully logged in
        try { localStorage.setItem(APP_KEY_REMEMBER, '1'); } catch {}
        showApp();
        initApp();
      } else {
        alert('Mot de passe incorrect.');
      }
    }
    // Expose globally as a fallback
    try { window.__doLogin = doLogin; } catch {}
    if (btn) {
      try { btn.removeEventListener('click', doLogin); } catch {}
      btn.addEventListener('click', doLogin);
      // Fallback inline handler in case addEventListener fails in some browsers
      try { btn.onclick = doLogin; } catch {}
    }
    if (pwdInput) pwdInput.addEventListener('keydown', (e)=>{ if (e.key==='Enter') { e.preventDefault(); doLogin(); } });
    // Delegated fallback on the whole login box
    try {
      const loginBox = document.getElementById('login');
      if (loginBox && !loginBox.__delegateWired) {
        loginBox.addEventListener('click', (e)=>{
          const t = e.target;
          if (t && (t.id === 'loginBtn' || t.closest && t.closest('#loginBtn'))) {
            e.preventDefault();
            doLogin();
          }
        }, true);
        loginBox.__delegateWired = true;
      }
    } catch {}
    // Update status
    try { const st = document.getElementById('loginStatus'); if (st) st.textContent = 'Handler prêt'; } catch {}
  }

  function fillForm(data){
    $('#requestId').value = data.requestId || '';
    $('#id').value = data.id || '';
    $('#title').value = data.title || '';
    $('#type').value = data.type || 'film';
    $('#rating').value = (typeof data.rating === 'number') ? String(data.rating) : '';
    $('#genre1').value = (data.genres||[])[0] || '';
    $('#genre2').value = (data.genres||[])[1] || '';
    $('#genre3').value = (data.genres||[])[2] || '';
    $('#description').value = data.description || '';
    $('#portraitImage').value = data.portraitImage || '';
    $('#landscapeImage').value = data.landscapeImage || '';
    $('#watchUrl').value = data.watchUrl || '';
    // New: studio badge
    const studioBadgeEl = $('#studioBadge');
    if (studioBadgeEl) studioBadgeEl.value = data.studioBadge || 'https://clipsoustreaming.com/clipsoustudio.webp';
    // Preview studio badge
    setPreview($('#studioBadgePreview'), (studioBadgeEl && studioBadgeEl.value) || '');
    const actors = Array.isArray(data.actors) ? data.actors.slice() : [];
    $('#contentForm').dataset.actors = JSON.stringify(actors);
    renderActors(actors);
    // Previews
    setPreview($('#portraitPreview'), $('#portraitImage').value);
    setPreview($('#landscapePreview'), $('#landscapeImage').value);

    // Update submit button label based on edit/new mode
    try {
      const submitBtn = document.querySelector('#contentForm .actions .btn[type="submit"], #contentForm .actions button[type="submit"]');
      if (submitBtn) {
        if (data && data.requestId) submitBtn.textContent = 'Enregistrer la modification';
        else submitBtn.textContent = 'Enregistrer la requête';
        submitBtn.disabled = false;
        submitBtn.removeAttribute('disabled');
        submitBtn.style.pointerEvents = '';
      }
    } catch {}
  }

  function emptyForm(){ fillForm({}); }

  function collectForm(){
    const actors = JSON.parse($('#contentForm').dataset.actors || '[]');
    // Keep order, enforce uniqueness and non-empty for genres
    const seen = new Set();
    const genresRaw = [$('#genre1').value, $('#genre2').value, $('#genre3').value];
    const genres = [];
    genresRaw.forEach(g => { const v = String(g||'').trim(); if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); genres.push(v); } });
    let id = $('#id').value.trim();
    const title = $('#title').value.trim();
    if (!id) id = makeIdFromTitle(title);
    // New: studio badge with default
    let studioBadge = '';
    try { studioBadge = String($('#studioBadge').value || '').trim(); } catch {}
    if (!studioBadge) studioBadge = 'https://clipsoustreaming.com/clipsoustudio.webp';
    return {
      id,
      requestId: $('#requestId').value || '',
      title,
      type: $('#type').value,
      rating: $('#rating').value ? parseFloat($('#rating').value) : undefined,
      genres,
      description: $('#description').value.trim(),
      portraitImage: $('#portraitImage').value.trim(),
      landscapeImage: $('#landscapeImage').value.trim(),
      watchUrl: $('#watchUrl').value.trim(),
      studioBadge,
      actors
    };
  }

  function saveDraft(){
    try { saveJSON(APP_KEY_DRAFT, collectForm()); } catch {}
  }
  function clearDraft(){ try { localStorage.removeItem(APP_KEY_DRAFT); } catch {}
  }
  function restoreDraft(){
    try {
      const d = loadJSON(APP_KEY_DRAFT, null);
      if (d && typeof d === 'object') fillForm(d);
    } catch {}
  }

  function renderTable(){
    const tbody = $('#requestsTable tbody');
    // Exclude requests marked as deleted from the UI
    const reqs = getRequests().filter(r => !(r && r.meta && r.meta.deleted));
    tbody.innerHTML = '';
    reqs.forEach(r => {
      const tr = document.createElement('tr');
      const g3 = (r.data.genres||[]).slice(0,3).filter(Boolean).map(g=>String(g));
      tr.innerHTML = `
        <td>${r.data.title||''}</td>
        <td>${r.data.type||''}</td>
        <td class="genres-cell"></td>
        <td>${(typeof r.data.rating==='number')?r.data.rating:''}</td>
        <td class="row-actions"></td>
      `;
      // Fill genres as span elements for responsive layout
      try {
        const tdGenres = tr.querySelector('.genres-cell');
        if (tdGenres) {
          tdGenres.innerHTML = '';
          g3.forEach((g, i) => {
            const span = document.createElement('span');
            span.className = 'genre';
            span.textContent = g;
            tdGenres.appendChild(span);
          });
        }
      } catch {}
      const actions = tr.querySelector('.row-actions');
      const editBtn = document.createElement('button'); editBtn.className='btn secondary'; editBtn.textContent='Modifier';
      const delBtn = document.createElement('button'); delBtn.className='btn secondary'; delBtn.textContent='Supprimer';
      const approveBtn = document.createElement('button'); approveBtn.className='btn';
      // Simplified labels without status dots
      approveBtn.textContent = (r.status === 'approved') ? 'Retirer' : 'Approuver';
      actions.appendChild(editBtn); actions.appendChild(delBtn); actions.appendChild(approveBtn);

      // No status cell anymore
      editBtn.addEventListener('click', ()=>{ fillForm(r.data); try { setLastEditedId(r.data && r.data.id); } catch{} });
      delBtn.addEventListener('click', ()=>{
        if (!confirm('Supprimer cette requête ?')) return;
        let list = getRequests().filter(x=>x.requestId!==r.requestId);
        // Stamp and sync
        const deleted = { ...r, meta: { ...(r.meta||{}), updatedAt: Date.now(), deleted: true } };
        list.unshift(deleted);
        setRequests(list);
        try { if ((r && r.data && r.data.id) === getLastEditedId()) clearLastEditedId(); } catch{}
        if (r.status==='approved') {
          const apr = getApproved().filter(x=>x.id!==r.data.id);
          setApproved(apr);
        }
        renderTable(); emptyForm();
      });
      approveBtn.addEventListener('click', async ()=>{
        const list = getRequests();
        const found = list.find(x=>x.requestId===r.requestId);
        if (!found) return;
        if (found.status==='approved') {
          // Unapprove
          found.status = 'pending';
          stampUpdatedAt(found);
          setRequests(list);
          const apr = getApproved().filter(x=>x.id!==found.data.id);
          setApproved(apr);
          // Remove from shared approved.json
          showPublishWaitHint();
          await deleteApproved(found.data.id);
          approveBtn.textContent = 'Approuver';
          // No status cell to refresh
          // Sync removed
        } else {
          // Show publishing indicator and disable button during network call
          const originalHtml = approveBtn.innerHTML;
          approveBtn.disabled = true;
          // Keep the button label unchanged; the hint is displayed elsewhere
          approveBtn.innerHTML = originalHtml;
          showPublishWaitHint();

          // Optimistically set approved locally
          found.status = 'approved';
          stampUpdatedAt(found);
          setRequests(list);
          let apr = getApproved();
          const key = normalizeTitleKey(found.data && found.data.title);
          // Remove any existing approved with same normalized title or different item with same id
          apr = apr.filter(x => x && x.id !== found.data.id && normalizeTitleKey(x.title) !== key);
          apr.push(found.data);
          setApproved(dedupeByIdAndTitle(apr));
          // Sync removed
          // Publish through API for everyone and reflect final status
          const ok = await publishApproved(found.data);
          if (ok) {
            approveBtn.textContent = 'Retirer';
            setTimeout(()=>{ renderTable(); }, 300);
          } else {
            // Revert local approval on failure
            found.status = 'pending';
            setRequests(list);
            const apr2 = getApproved().filter(x=>x.id!==found.data.id);
            setApproved(apr2);
            approveBtn.textContent = 'Approuver';
            renderTable();
          }
          // Re-enable only if global 30s lock is not active
          try { approveBtn.disabled = isPublishLocked(); } catch { approveBtn.disabled = false; }
        }
        // For unapprove, immediate refresh
        if (found.status==='pending') renderTable();
      });
      tbody.appendChild(tr);
    });
    populateActorNamesDatalist();
    // Apply global 30s lock state to any newly rendered buttons
    try { applyPublishLockUI(); } catch {}
  }

  function initApp(){
    const app = $('#app');
    app.hidden = false;

    // Logout button returns to login
    try {
      const logoutBtn = $('#logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          try { sessionStorage.removeItem(APP_KEY_SESSION); } catch {}
          const login = $('#login');
          if (app) app.hidden = true;
          if (login) login.hidden = false;
        });
      }
    } catch {}

    // Wire actor photo upload
    (function wireActorPhoto(){
      const fileInput = $('#actorPhotoFile');
      const preview = $('#actorPhotoPreview');
      const nameInput = $('#actorName');
      if (fileInput) {
        fileInput.addEventListener('change', async () => {
          const f = fileInput.files && fileInput.files[0];
          if (!f) return;
          try {
            const url = await uploadImageToCloudinary(f);
            // Stash temporarily on the form element
            $('#contentForm').dataset.actorPhotoTemp = url;
            if (preview) { preview.hidden = false; preview.src = url.startsWith('http')? url : ('../'+url); }
            // If a name is already filled, persist association name->photo
            try {
              const nm = (nameInput && nameInput.value || '').trim();
              if (nm) {
                const map = getActorPhotoMap();
                const key = (function(){
                  try { return String(nm).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim(); }
                  catch { return String(nm).toLowerCase().replace(/[^a-z0-9]+/g,'').trim(); }
                })();
                if (key) map[key] = url;
                setActorPhotoMap(map);
              }
            } catch {}
          } catch (e) {
            alert('Upload photo acteur échoué');
          }
        });
      }
      // When selecting/typing a known actor name, prefill its default photo preview
      function maybePrefillPhoto(){
        try {
          const nm = (nameInput && nameInput.value || '').trim();
          if (!nm) return;
          const map = getActorPhotoMap();
          const url = resolveActorPhoto(map, nm);
          if (url) {
            $('#contentForm').dataset.actorPhotoTemp = url;
            if (preview) { preview.hidden = false; preview.src = url.startsWith('http')? url : ('../'+url); }
          }
        } catch {}
      }
      if (nameInput) {
        nameInput.addEventListener('change', maybePrefillPhoto);
        nameInput.addEventListener('blur', maybePrefillPhoto);
      }
    })();

    $('#addActorBtn').addEventListener('click', ()=>{
      const name = $('#actorName').value.trim();
      const role = $('#actorRole').value.trim();
      if (!name) return;
      const actors = JSON.parse($('#contentForm').dataset.actors || '[]');
      let photo = $('#contentForm').dataset.actorPhotoTemp || '';
      // If no temp photo but default exists for this name, use it
      if (!photo) {
        try { const map = getActorPhotoMap(); photo = resolveActorPhoto(map, name) || ''; } catch {}
      }
      actors.push(photo ? { name, role, photo } : { name, role });
      $('#contentForm').dataset.actors = JSON.stringify(actors);
      // Reset inputs
      $('#actorName').value=''; $('#actorRole').value='';
      try { delete $('#contentForm').dataset.actorPhotoTemp; } catch {}
      const fileInput = $('#actorPhotoFile'); if (fileInput) fileInput.value = '';
      const preview = $('#actorPhotoPreview'); if (preview) { preview.hidden = true; preview.removeAttribute('src'); }
      renderActors(actors);
    });

    $('#resetBtn').addEventListener('click', ()=>{ emptyForm(); clearDraft(); });

    // ===== Cloudinary settings form =====
    (function wireCloudinaryForm(){
      const nameEl = $('#cldCloudName');
      const presetEl = $('#cldUploadPreset');
      const folderEl = $('#cldFolder');
      const saveBtn = $('#cldSaveBtn');
      const clearBtn = $('#cldClearBtn');
      const statusEl = $('#cldStatus');
      const lockBtn = $('#cldLockBtn');
      const actionsRow = $('#cldActionsRow');

      function refreshUI(){
        const cfg = getCldConfig();
        if (nameEl) nameEl.value = cfg.cloudName || '';
        if (presetEl) presetEl.value = cfg.uploadPreset || '';
        if (folderEl) folderEl.value = cfg.folder || '';
        if (statusEl) {
          if (cloudinaryConfigured()) {
            statusEl.textContent = 'Cloudinary est configuré. Les uploads sont activés.';
          } else {
            statusEl.textContent = 'Cloudinary n\'est pas configuré. Renseignez les champs ci-dessus pour activer l\'upload.';
          }
        }
      }

      function isLocked(){
        try { return (localStorage.getItem(APP_KEY_CLD_LOCK) || '1') === '1'; } catch { return true; }
      }
      function setLocked(v){
        try { localStorage.setItem(APP_KEY_CLD_LOCK, v ? '1' : '0'); } catch {}
      }
      function applyLockUI(locked){
        const ro = !!locked;
        if (nameEl) nameEl.readOnly = ro;
        if (presetEl) presetEl.readOnly = ro;
        if (folderEl) folderEl.readOnly = ro;
        if (saveBtn) saveBtn.disabled = ro;
        if (clearBtn) clearBtn.disabled = ro;
        if (actionsRow) actionsRow.style.opacity = ro ? '0.7' : '1';
        if (lockBtn) {
          lockBtn.textContent = locked ? '🔒' : '🔓';
          lockBtn.title = locked ? 'Déverrouiller la configuration' : 'Verrouiller la configuration';
          lockBtn.classList.toggle('secondary', locked);
        }
      }

      refreshUI();
      applyLockUI(isLocked());
      if (saveBtn) saveBtn.addEventListener('click', ()=>{
        const cfg = {
          cloudName: (nameEl && nameEl.value || '').trim(),
          uploadPreset: (presetEl && presetEl.value || '').trim(),
          folder: (folderEl && folderEl.value || '').trim()
        };
        setCldConfig(cfg);
        refreshUI();
        alert('Configuration Cloudinary enregistrée.');
      });
      if (clearBtn) clearBtn.addEventListener('click', ()=>{
        try { localStorage.removeItem(APP_KEY_CLD); } catch {}
        refreshUI();
        alert('Configuration Cloudinary réinitialisée.');
      });
      if (lockBtn) lockBtn.addEventListener('click', ()=>{
        const next = !isLocked();
        setLocked(next);
        applyLockUI(next);
      });
    })();

    // ===== Upload & previews wiring =====
    const portraitInput = $('#portraitFileInput');
    const landscapeInput = $('#landscapeFileInput');
    const studioInput = $('#studioBadgeFileInput');
    const portraitText = $('#portraitImage');
    const landscapeText = $('#landscapeImage');
    const studioText = $('#studioBadge');
    const portraitPreview = $('#portraitPreview');
    const landscapePreview = $('#landscapePreview');
    const studioPreview = $('#studioBadgePreview');
    const portraitClearBtn = $('#portraitClearBtn');
    const landscapeClearBtn = $('#landscapeClearBtn');
    const studioClearBtn = $('#studioBadgeClearBtn');

    function wireTextPreview(inputEl, previewEl){
      if (!inputEl || !previewEl) return;
      inputEl.addEventListener('input', ()=> setPreview(previewEl, inputEl.value));
      inputEl.addEventListener('change', ()=> setPreview(previewEl, inputEl.value));
    }
    wireTextPreview(portraitText, portraitPreview);
    wireTextPreview(landscapeText, landscapePreview);

    async function handleUpload(kind, file){
      const btns = $$('.btn');
      btns.forEach(b=>b.disabled=true);
      try {
        const url = await uploadImageToCloudinary(file);
        if (kind==='portrait') {
          portraitText.value = url;
          setPreview(portraitPreview, url);
        } else if (kind==='landscape') {
          landscapeText.value = url;
          setPreview(landscapePreview, url);
        } else if (kind==='studio') {
          studioText.value = url;
          setPreview(studioPreview, url);
        }
        saveDraft();
      } catch(err){
        console.error(err);
        alert('Échec de l\'upload: '+ (err && err.message ? err.message : 'inconnu'));
      } finally {
        btns.forEach(b=>b.disabled=false);
      }
    }

    if (portraitInput) {
      portraitInput.addEventListener('change', async (e)=>{
        const f = e.target.files && e.target.files[0];
        if (f) await handleUpload('portrait', f);
        e.target.value = '';
      });
    }
    if (landscapeInput) {
      landscapeInput.addEventListener('change', async (e)=>{
        const f = e.target.files && e.target.files[0];
        if (f) await handleUpload('landscape', f);
        e.target.value = '';
      });
    }
    if (studioInput) {
      studioInput.addEventListener('change', async (e)=>{
        const f = e.target.files && e.target.files[0];
        if (f) await handleUpload('studio', f);
        e.target.value = '';
      });
    }
    if (portraitClearBtn) {
      portraitClearBtn.addEventListener('click', ()=>{
        portraitText.value = '';
        setPreview(portraitPreview, '');
        saveDraft();
      });
    }
    if (landscapeClearBtn) {
      landscapeClearBtn.addEventListener('click', ()=>{
        landscapeText.value = '';
        setPreview(landscapePreview, '');
        saveDraft();
      });
    }
    if (studioClearBtn) {
      studioClearBtn.addEventListener('click', ()=>{
        studioText.value = '';
        setPreview(studioPreview, '');
        saveDraft();
      });
    }

    const form = $('#contentForm');
    function setSubmitSavedUI(saved){
      try {
        const btn = document.querySelector('#contentForm .actions .btn[type="submit"], #contentForm .actions button[type="submit"]');
        if (!btn) return;
        if (saved) {
          btn.textContent = 'Modifications enregistrées — appuyez sur "Approuver"';
          btn.disabled = true;
          btn.setAttribute('disabled','disabled');
          btn.style.pointerEvents = 'none';
        } else {
          const hasReqId = !!($('#requestId').value);
          btn.textContent = hasReqId ? 'Enregistrer la modification' : 'Enregistrer la requête';
          btn.disabled = false;
          btn.removeAttribute('disabled');
          btn.style.pointerEvents = '';
        }
      } catch {}
    }
    if (form && !form.dataset.submitWired) {
      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        const data = collectForm();
        const v = validateData(data);
        if (!v.ok) { alert('Veuillez corriger les erreurs avant d\'enregistrer:\n\n' + v.message); return; }
        // Upsert request by requestId, otherwise create new request entry
        let list = getRequests();
        let reqId = data.requestId || '';
        if (!reqId) reqId = uid();
        data.requestId = reqId;
        // Persist the requestId in the hidden input to avoid duplicate creation on rapid double-submit
        const reqIdInput = $('#requestId');
        if (reqIdInput) reqIdInput.value = reqId;
        // Remove other requests with the same normalized title to avoid duplicates
        const keyNew = normalizeTitleKey(data.title);
        list = list.filter(x => x && x.requestId === reqId || normalizeTitleKey(x && x.data && x.data.title) !== keyNew);
        const existing = list.find(x=>x.requestId===reqId);
        const isEditing = !!existing; // used to alter submit button state
        // Removed: do not show the 30s publish wait hint when saving modifications
        const wasApproved = !!(existing && existing.status === 'approved');
        if (existing) {
          existing.data = data;
          // IMPORTANT: switch to 'pending' during publication to reflect real-time GitHub propagation
          if (wasApproved) existing.status = 'pending';
          stampUpdatedAt(existing);
        }
        else { list.unshift(stampUpdatedAt({ requestId: reqId, status: 'pending', data })); }
        setRequests(list);
        try { setLastEditedId(data && data.id); } catch{}
        // If already approved, keep approved in sync
        if (wasApproved) {
          let apr = getApproved();
          const key = normalizeTitleKey(data.title);
          apr = apr.filter(x => x && x.id !== data.id && normalizeTitleKey(x.title) !== key);
          apr.push(data);
          setApproved(dedupeByIdAndTitle(apr));
          renderTable();
          // Republish updated approved item to the site so changes go live
          (async () => {
            const ok = await publishApproved(data);
            if (ok) {
              renderTable();
              // Clear any stale draft so removed actors don't reappear on reload
              try { clearDraft(); } catch {}
            }
          })();
          if (isEditing) setSubmitSavedUI(true);
        } else {
          renderTable();
          populateGenresDatalist();
          clearDraft();
          alert('Requête enregistrée.');
          if (isEditing) setSubmitSavedUI(true);
        }
        // Sync removed
      });
      // Mark as wired to prevent duplicate event listeners
      form.dataset.submitWired = '1';
    }

    // Autosave draft on input changes (debounced minimal) + re-enable submit for new edits
    let t=null; const schedule=()=>{ if (t) clearTimeout(t); t=setTimeout(()=>{ setSubmitSavedUI(false); saveDraft(); }, 200); };
    if (form) {
      form.addEventListener('input', schedule);
      form.addEventListener('change', schedule);
    }

    const exportBtn = $('#exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', ()=>{
      const payload = {
        requests: getRequests(),
        approved: getApproved()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'clipsou_admin_export.json'; a.click();
      URL.revokeObjectURL(url);
    });

    const importInput = $('#importInput');
    if (importInput) importInput.addEventListener('change', async (e)=>{
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        if (Array.isArray(json.requests)) setRequests(json.requests);
        if (Array.isArray(json.approved)) setApproved(json.approved);
        renderTable();
        alert('Import terminé.');
      } catch(err){ alert('Import invalide.'); }
      e.target.value = '';
    });

    emptyForm();
    renderTable();
    // Shared requests sync removed
    populateGenresDatalist();
    restoreDraft();
    populateActorNamesDatalist();
    // Hydrate actor photos from public approved.json to ensure chips display known avatars
    try { hydrateActorPhotoMapFromPublic(); } catch {}
    // If no draft is present, restore the last edited item into the form for continuity
    try {
      const draft = loadJSON(APP_KEY_DRAFT, null);
      if (!draft) {
        const lastId = getLastEditedId();
        if (lastId) {
          const reqs = getRequests();
          const foundReq = (reqs||[]).find(x => x && x.data && x.data.id === lastId && !(x.meta && x.meta.deleted));
          if (foundReq && foundReq.data) {
            fillForm(foundReq.data);
          } else {
            const apr = getApproved();
            const foundApr = (apr||[]).find(x => x && x.id === lastId);
            if (foundApr) fillForm(foundApr);
          }
        }
      }
    } catch {}
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureAuth);
  } else {
    ensureAuth();
  }
})();
