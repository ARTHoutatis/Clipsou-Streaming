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
  // Shared requests sync cache marker (optional)
  const APP_KEY_REQ_LAST_SYNC = 'clipsou_admin_requests_last_sync_v1';
  // Duration to display the deployment-in-progress hint after an approval
  const DEPLOY_HINT_MS = 2 * 60 * 60 * 1000; // 2 hours to account for slower GitHub Pages/CI deployments
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

  // Poll GitHub Pages public JSON to detect when an approved item is live
  async function isItemLivePublic(id){
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
        if (Array.isArray(json) && json.some(x => x && x.id === id)) return true;
        if (json && typeof json === 'object') {
          const candidates = [];
          if (Array.isArray(json.approved)) candidates.push(json.approved);
          if (Array.isArray(json.items)) candidates.push(json.items);
          if (Array.isArray(json.data)) candidates.push(json.data);
          for (const arr of candidates) {
            if (arr.some(x => x && x.id === id)) return true;
          }
        }
      } catch {}
    }
    return false;
  }

  const deployWatchers = new Map();
  function startDeploymentWatch(id, action='upsert'){
    if (!id) return;
    const key = id + '::' + action;
    if (deployWatchers.has(key)) return;
    const tick = async () => {
      const live = await isItemLivePublic(id);
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
      // Optional: endpoints for shared requests sync
      const requestsUrl = prompt('URL de l\'API de synchronisation des requêtes (optionnel):', cfg.requestsUrl || '');
      const publicRequestsUrl = prompt('URL publique du requests.json (optionnel):', cfg.publicRequestsUrl || '');
      cfg = { url: url.trim(), secret: secret.trim(), publicApprovedUrl: (publicApprovedUrl||'').trim(), requestsUrl: (requestsUrl||'').trim(), publicRequestsUrl: (publicRequestsUrl||'').trim() };
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

  // ===== Shared requests (multi-admin) sync =====
  function stampUpdatedAt(req) {
    try {
      const now = Date.now();
      if (req && typeof req === 'object') {
        if (!req.meta) req.meta = {};
        req.meta.updatedAt = now;
      }
    } catch {}
    return req;
  }

  function mergeRequestsByUpdatedAt(localList, remoteList){
    const byId = new Map();
    (localList||[]).forEach(r => { if (r && r.requestId) byId.set(r.requestId, r); });
    (remoteList||[]).forEach(r => {
      if (!r || !r.requestId) return;
      const existing = byId.get(r.requestId);
      const lu = existing && existing.meta && existing.meta.updatedAt || 0;
      const ru = r && r.meta && r.meta.updatedAt || 0;
      if (!existing || ru > lu) byId.set(r.requestId, r);
    });
    // Return in a stable order: most recently updated first
    return Array.from(byId.values()).sort((a,b)=>((b.meta&&b.meta.updatedAt||0) - (a.meta&&a.meta.updatedAt||0)));
  }

  async function fetchSharedRequests(){
    const cfg = getPublishConfig();
    const candidates = [];
    if (cfg && cfg.publicRequestsUrl) candidates.push(cfg.publicRequestsUrl);
    try { candidates.push((window.location.origin||'') + '/data/requests.json'); } catch {}
    candidates.push('../data/requests.json');
    candidates.push('data/requests.json');
    for (const u of candidates.filter(Boolean)) {
      try {
        const res = await fetch(u + '?v=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' });
        if (!res.ok) continue;
        const json = await res.json();
        if (Array.isArray(json)) return json;
        if (json && Array.isArray(json.requests)) return json.requests;
      } catch {}
    }
    return [];
  }

  async function publishRequests(allRequests){
    const cfg = await ensurePublishConfig();
    if (!cfg) return false;
    // If no dedicated requestsUrl configured, ask once to set it (optional cancel)
    if (!cfg.requestsUrl) {
      const url = prompt('Aucune URL API de synchronisation des requêtes n\'est configurée. Entrez l\'URL (optionnel):', '');
      if (url) {
        const next = { ...cfg, requestsUrl: url.trim() };
        setPublishConfig(next);
        return publishRequests(allRequests);
      }
      return false;
    }
    try {
      const res = await fetch(cfg.requestsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': cfg.secret ? ('Bearer ' + cfg.secret) : undefined
        },
        body: JSON.stringify({ action: 'syncRequests', requests: allRequests || [] })
      });
      return res.ok;
    } catch { return false; }
  }

  async function syncRequestsWithRemote(render=true){
    try {
      const remote = await fetchSharedRequests();
      if (!Array.isArray(remote)) return;
      const local = getRequests();
      const merged = mergeRequestsByUpdatedAt(local, remote);
      setRequests(merged);
      if (render) renderTable();
      try { localStorage.setItem(APP_KEY_REQ_LAST_SYNC, String(Date.now())); } catch {}
    } catch {}
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
    (list||[]).forEach((a, idx) => {
      const chip = document.createElement('div');
      chip.className = 'actor-chip';
      chip.innerHTML = `<span>${a.name || ''}</span><span class="muted small">${a.role || ''}</span>`;
      const rm = document.createElement('button');
      rm.className = 'remove';
      rm.type = 'button';
      rm.textContent = '✕';
      rm.addEventListener('click', () => {
        list.splice(idx,1);
        renderActors(list);
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
    if (btn) btn.addEventListener('click', doLogin);
    if (pwdInput) pwdInput.addEventListener('keydown', (e)=>{ if (e.key==='Enter') { e.preventDefault(); doLogin(); } });
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
    if (studioBadgeEl) studioBadgeEl.value = data.studioBadge || '';
    // Preview studio badge
    setPreview($('#studioBadgePreview'), (studioBadgeEl && studioBadgeEl.value) || '');
    const actors = Array.isArray(data.actors) ? data.actors.slice() : [];
    $('#contentForm').dataset.actors = JSON.stringify(actors);
    renderActors(actors);
    // Previews
    setPreview($('#portraitPreview'), $('#portraitImage').value);
    setPreview($('#landscapePreview'), $('#landscapeImage').value);
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
    if (!studioBadge) studioBadge = 'clipsoustudio.png';
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
      const g3 = (r.data.genres||[]).slice(0,3).join(', ');
      tr.innerHTML = `
        <td>${r.data.title||''}</td>
        <td>${r.data.type||''}</td>
        <td>${g3}</td>
        <td>${(typeof r.data.rating==='number')?r.data.rating:''}</td>
        <td class="status-cell"></td>
        <td class="row-actions"></td>
      `;
      const actions = tr.querySelector('.row-actions');
      const editBtn = document.createElement('button'); editBtn.className='btn secondary'; editBtn.textContent='Modifier';
      const delBtn = document.createElement('button'); delBtn.className='btn secondary'; delBtn.textContent='Supprimer';
      const approveBtn = document.createElement('button'); approveBtn.className='btn';
      // Approve button label reflects deploy state: orange while pending, green when confirmed
      (function setApproveBtnLabel(){
        const track = getDeployTrack();
        const info = track[r.data.id];
        if (r.status === 'approved') {
          if (info && !info.confirmedAt) approveBtn.innerHTML = 'Retirer <span class="dot orange"></span>';
          else if (info && info.confirmedAt) approveBtn.innerHTML = 'Retirer <span class="dot green"></span>';
          else approveBtn.textContent = 'Retirer';
        } else {
          // Pending side: if a delete deployment is in progress, keep orange until confirmed removal
          if (info && info.action === 'delete' && !info.confirmedAt) approveBtn.innerHTML = 'Approuver <span class="dot orange"></span>';
          else if (info && info.action === 'delete' && info.confirmedAt) approveBtn.innerHTML = 'Approuver <span class="dot green"></span>';
          else approveBtn.textContent = 'Approuver';
        }
      })();
      actions.appendChild(editBtn); actions.appendChild(delBtn); actions.appendChild(approveBtn);

      // Populate the status cell with a deployment indicator (orange while pending, green once confirmed)
      (function setStatusCell(){
        const statusTd = tr.querySelector('.status-cell');
        if (!statusTd) return;
        const track = getDeployTrack();
        const info = track[r.data.id];
        const times = getPublishTimes();
        const lastPub = times && times[r.data.id];
        const now = Date.now();
        if (r.status === 'approved') {
          if (info && !info.confirmedAt) {
            statusTd.innerHTML = `approved <span class="muted small">• déploiement GitHub Pages en cours</span> <span class="dot orange"></span>`;
          } else if (info && info.confirmedAt) {
            statusTd.innerHTML = `approved <span class="dot green"></span>`;
          } else if (lastPub && (now - lastPub) < DEPLOY_HINT_MS) {
            statusTd.innerHTML = `approved <span class="muted small">• propagation en cours</span> <span class="dot orange"></span>`;
          } else {
            statusTd.textContent = 'approved';
          }
        } else {
          if (info && info.action === 'delete' && !info.confirmedAt) {
            statusTd.innerHTML = `pending <span class="muted small">• retrait GitHub Pages en cours</span> <span class="dot orange"></span>`;
          } else if (info && info.action === 'delete' && info.confirmedAt) {
            statusTd.innerHTML = `pending <span class="dot green"></span>`;
          } else {
            statusTd.textContent = 'pending';
          }
        }
      })();
      editBtn.addEventListener('click', ()=>{ fillForm(r.data); });
      delBtn.addEventListener('click', ()=>{
        if (!confirm('Supprimer cette requête ?')) return;
        let list = getRequests().filter(x=>x.requestId!==r.requestId);
        // Stamp and sync
        const deleted = { ...r, meta: { ...(r.meta||{}), updatedAt: Date.now(), deleted: true } };
        list.unshift(deleted);
        setRequests(list);
        if (r.status==='approved') {
          const apr = getApproved().filter(x=>x.id!==r.data.id);
          setApproved(apr);
        }
        renderTable(); emptyForm();
        publishRequests(getRequests());
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
          await deleteApproved(found.data.id);
          // Start tracking deletion deployment and reflect orange state until confirmed
          startDeploymentWatch(found.data.id, 'delete');
          approveBtn.innerHTML = 'Approuver <span class="dot orange"></span>';
          // Refresh row status cell
          const statusTd = tr.querySelector('.status-cell');
          if (statusTd) {
            statusTd.innerHTML = `pending <span class="muted small">• retrait GitHub Pages en cours</span> <span class="dot orange"></span>`;
          }
          // Sync shared requests after change
          publishRequests(getRequests());
        } else {
          // Show publishing indicator and disable button during network call
          const originalHtml = approveBtn.innerHTML;
          approveBtn.disabled = true;
          approveBtn.innerHTML = 'Publication… <span class="dot orange"></span>';

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
          // Sync shared requests immediately
          publishRequests(getRequests());
          // Publish through API for everyone and reflect final status
          const ok = await publishApproved(found.data);
          if (ok) {
            // Record publish time for deployment delay hint
            const times = getPublishTimes();
            times[found.data.id] = Date.now();
            setPublishTimes(times);
            // Start background watch for GitHub Pages deployment
            startDeploymentWatch(found.data.id, 'upsert');
            // Keep the action button orange until confirmation is detected
            approveBtn.innerHTML = 'Retirer <span class="dot orange"></span>';
            setTimeout(()=>{ renderTable(); }, 300);
          } else {
            // Revert local approval on failure
            found.status = 'pending';
            setRequests(list);
            const apr2 = getApproved().filter(x=>x.id!==found.data.id);
            setApproved(apr2);
            approveBtn.innerHTML = originalHtml;
            renderTable();
          }
          approveBtn.disabled = false;
        }
        // For unapprove, immediate refresh
        if (found.status==='pending') renderTable();
      });
      tbody.appendChild(tr);
    });
    populateActorNamesDatalist();
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

    $('#addActorBtn').addEventListener('click', ()=>{
      const name = $('#actorName').value.trim();
      const role = $('#actorRole').value.trim();
      if (!name) return;
      const actors = JSON.parse($('#contentForm').dataset.actors || '[]');
      actors.push({ name, role });
      $('#contentForm').dataset.actors = JSON.stringify(actors);
      $('#actorName').value=''; $('#actorRole').value='';
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
        if (existing) { existing.data = data; stampUpdatedAt(existing); }
        else { list.unshift(stampUpdatedAt({ requestId: reqId, status: 'pending', data })); }
        setRequests(list);
        // If already approved, keep approved in sync
        if (existing && existing.status==='approved') {
          let apr = getApproved();
          const key = normalizeTitleKey(data.title);
          apr = apr.filter(x => x && x.id !== data.id && normalizeTitleKey(x.title) !== key);
          apr.push(data);
          setApproved(dedupeByIdAndTitle(apr));
          // Mark request as pending during republish so UI shows orange deployment state
          try {
            const list2 = getRequests();
            const found2 = list2.find(x=>x.requestId===reqId);
            if (found2) { found2.status = 'pending'; stampUpdatedAt(found2); setRequests(list2); renderTable(); }
          } catch {}
          // Republish updated approved item to the site so changes go live
          (async () => {
            const ok = await publishApproved(data);
            if (ok) {
              try {
                const times = getPublishTimes();
                times[data.id] = Date.now();
                setPublishTimes(times);
              } catch {}
              // Track deployment until confirmed live
              startDeploymentWatch(data.id, 'upsert');
              // Re-render to reflect deployment indicator
              setTimeout(()=>{ renderTable(); }, 300);
            }
          })();
        }
        renderTable();
        populateGenresDatalist();
        clearDraft();
        alert('Requête enregistrée.');
        // Publish/shared sync
        publishRequests(getRequests());
      });
      // Mark as wired to prevent duplicate event listeners
      form.dataset.submitWired = '1';
    }

    // Autosave draft on input changes (debounced minimal)
    // Autosave draft on input changes (debounced minimal)
    let t=null; const schedule=()=>{ if (t) clearTimeout(t); t=setTimeout(saveDraft, 200); };
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
    // Attempt to load shared requests then re-render
    syncRequestsWithRemote(true);
    populateGenresDatalist();
    restoreDraft();
    populateActorNamesDatalist();
    // Resume deployment watchers for any tracked items not yet confirmed
    try {
      const track = getDeployTrack();
      Object.keys(track || {}).forEach(id => {
        const info = track[id];
        if (info && !info.confirmedAt) startDeploymentWatch(id);
      });
    } catch {}
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureAuth);
  } else {
    ensureAuth();
  }
})();

// ===== Extra helpers: genres datalist & actor names =====
(function(){
  const $ = (sel, root=document) => root.querySelector(sel);

  async function collectGenresFromIndex(){
    try {
      const res = await fetch('../index.html', { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const set = new Set();
      doc.querySelectorAll('.fiche-popup .rating-genres .genres .genre-tag').forEach(el => {
        const g = (el.textContent || '').trim(); if (g) set.add(g);
      });
      return Array.from(set);
    } catch { return []; }
  }

  function collectGenresFromStorage(){
    try {
      const set = new Set();
      const reqs = JSON.parse(localStorage.getItem('clipsou_requests_v1')||'[]') || [];
      reqs.forEach(r => (r && r.data && Array.isArray(r.data.genres)) && r.data.genres.forEach(g=>g&&set.add(g)));
      const apr = JSON.parse(localStorage.getItem('clipsou_items_approved_v1')||'[]') || [];
      apr.forEach(r => (r && Array.isArray(r.genres)) && r.genres.forEach(g=>g&&set.add(g)));
      return Array.from(set);
    } catch { return []; }
  }

  window.populateGenresDatalist = async function populateGenresDatalist(){
    const el = $('#genresDatalist');
    if (!el) return;
    const [fromIndex, fromStore] = await Promise.all([
      collectGenresFromIndex(),
      Promise.resolve(collectGenresFromStorage())
    ]);
    const set = new Set([ ...fromIndex, ...fromStore, 'Action','Comédie','Drame','Horreur','Aventure','Fantastique','Familial','Thriller','Psychologique','Western','Mystère','Ambience','Enfants','Super-héros' ]);
    el.innerHTML = Array.from(set).sort((a,b)=>String(a).localeCompare(String(b),'fr')).map(g=>`<option value="${g}"></option>`).join('');
  };

  // No image import: fields accept file names or URLs only
  function collectActorNames(){
    const set = new Set();
    try {
      const reqs = JSON.parse(localStorage.getItem('clipsou_requests_v1')||'[]') || [];
      reqs.forEach(r => (r && r.data && Array.isArray(r.data.actors)) && r.data.actors.forEach(a=>a&&a.name&&set.add(a.name)));
    } catch {}
    try {
      const apr = JSON.parse(localStorage.getItem('clipsou_items_approved_v1')||'[]') || [];
      apr.forEach(r => (r && Array.isArray(r.actors)) && r.actors.forEach(a=>a&&a.name&&set.add(a.name)));
    } catch {}
    // Preset common actors
    ['Liam Roxxor','Kassielator','Ferrisbu','Clone prod','Raiback','Beat Vortex','Arth','Stranger Art','Steve Animation','Calvlego','Atrochtiraptor','Mordecai','Paleo Brick','Brickmaniak',"Le Zebre'ifique"].forEach(n=>set.add(n));
    return Array.from(set).sort((a,b)=>String(a).localeCompare(String(b),'fr'));
  }

  window.populateActorNamesDatalist = function populateActorNamesDatalist(){
    const el = document.querySelector('#actorNamesDatalist');
    if (!el) return;
    const names = collectActorNames();
    el.innerHTML = names.map(n=>`<option value="${n}"></option>`).join('');
  };
})();
