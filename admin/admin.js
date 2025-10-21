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
  const APP_KEY_TRASH = 'clipsou_admin_trash_v1';
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // ===== Security: Password hashing with SHA-256 =====
  async function hashPassword(password) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (err) {
      console.error('Erreur de hachage:', err);
      return null;
    }
  }

  // Hash of "20Blabla30" - regenerate if you change the password
  // Use Fichiers Locaux/generate_hash.html to create a new hash if needed
  const ADMIN_PASSWORD_HASH = 'c4275fccac42bcf7cc99157a1623072d1ae33ade8a44737dab4c941729cafa13';

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

  // Fetch public approved.json to hydrate actor photos map for admin UI
  async function fetchPublicApprovedArray(){
    const cfg = getPublishConfig();
    const originApproved = (function(){ try { return (window.location.origin || '') + '/data/approved.json'; } catch { return null; } })();
    const tryUrls = [
      cfg && cfg.publicApprovedUrl ? cfg.publicApprovedUrl : null,
      originApproved,
      '../data/approved.json',
      'data/approved.json'
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

  async function fetchPublicTrashArray(){
    const cfg = getPublishConfig();
    const tryUrls = [
      cfg && cfg.publicTrashUrl ? cfg.publicTrashUrl : null,
      (function(){ try { return (window.location.origin || '') + '/data/trash.json'; } catch { return null; } })(),
      '../data/trash.json',
      'data/trash.json'
    ].filter(Boolean);
    for (const u of tryUrls) {
      try {
        const res = await fetch(u + '?v=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' });
        if (!res.ok) continue;
        const json = await res.json();
        if (Array.isArray(json)) return json;
        if (json && typeof json === 'object' && Array.isArray(json.trash)) return json.trash;
      } catch {}
    }
    return [];
  }

  // Fetch public requests.json to hydrate requests list (shared across admins)
  async function fetchPublicRequestsArray(){
    const cfg = getPublishConfig();
    const tryUrls = [
      cfg && cfg.publicRequestsUrl ? cfg.publicRequestsUrl : null,
      (function(){ try { return (window.location.origin || '') + '/data/requests.json'; } catch { return null; } })(),
      '../data/requests.json',
      'data/requests.json'
    ].filter(Boolean);
    for (const u of tryUrls) {
      try {
        const res = await fetch(u + '?v=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' });
        if (!res.ok) continue;
        const json = await res.json();
        if (Array.isArray(json)) return json;
        if (json && typeof json === 'object' && Array.isArray(json.requests)) return json.requests;
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

    // Periodic syncs so other admins' actions are reflected automatically
    try { if (!window.__requestsPoller) window.__requestsPoller = setInterval(()=>{ try { hydrateRequestsFromPublic(); } catch {} }, 30000); } catch {}
    try { if (!window.__approvedPoller) window.__approvedPoller = setInterval(()=>{ try { hydrateRequestsFromPublicApproved(); } catch {} }, 30000); } catch {}
    try { if (!window.__trashPoller) window.__trashPoller = setInterval(()=>{ try { hydrateTrashFromPublic(); } catch {} }, 30000); } catch {}
  }

  // Replace local requests with the shared public list when available
  async function hydrateRequestsFromPublic(){
    try {
      const arr = await fetchPublicRequestsArray();
      if (Array.isArray(arr) && arr.length) {
        setRequests(arr);
        try { renderTable(); } catch {}
      }
    } catch {}
  }

  // Ensure all published films are visible in the admin requests table by merging remote approved items
  async function hydrateRequestsFromPublicApproved(){
    try {
      const remote = await fetchPublicApprovedArray();
      const base = Array.isArray(remote) ? remote.slice() : [];
      // Overlay local in-progress actions to avoid UI flip-backs while remote updates
      const track = getDeployTrack();
      const list = getRequests();
      const now = Date.now();
      const windowMs = 120000; // suppression window for in-flight actions
      const norm = (s)=>{
        try { return String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim(); }
        catch { return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim(); }
      };
      const ovById = new Map();
      const ovByTitleKey = new Map();
      base.forEach(it=>{ try { if (it && it.id) ovById.set(String(it.id), it); const k = norm(it && it.title); if (k && !ovByTitleKey.has(k)) ovByTitleKey.set(k, it); } catch {} });
      const overlay = base.slice();
      // Helper to find request data by id or title key
      const findRequestData = (id, tkey)=>{
        try {
          const li = list || [];
          if (id) { const r = li.find(x=>x && x.data && x.data.id===id); if (r && r.data) return r.data; }
          if (tkey) { const r = li.find(x=>x && x.data && norm(x.data.title)===tkey); if (r && r.data) return r.data; }
        } catch {}
        return null;
      };
      if (track && typeof track === 'object') {
        const pendingDeletes = new Set();
        const pendingUpserts = new Set();
        const metaMap = new Map(); // id -> { titleKey }
        Object.keys(track).forEach(id => {
          try {
            const t = track[id];
            if (!t || !t.action || !t.startedAt) return;
            if (t.confirmedAt) return; // already settled
            if ((now - Number(t.startedAt)) > windowMs) return; // stale
            const idStr = String(id);
            // compute titleKey once
            let titleKey = '';
            try {
              const inOverlay = ovById.get(idStr) || null;
              titleKey = inOverlay ? norm(inOverlay.title||'') : '';
              if (!titleKey) {
                const fromReq = findRequestData(idStr, '');
                if (fromReq) titleKey = norm(fromReq.title||'');
              }
            } catch {}
            metaMap.set(idStr, { titleKey });
            if (t.action === 'delete') pendingDeletes.add(idStr);
            else if (t.action === 'upsert') pendingUpserts.add(idStr);
          } catch {}
        });
        // Apply deletes first (delete wins)
        pendingDeletes.forEach(idStr => {
          const mk = metaMap.get(idStr) || { titleKey: '' };
          const titleKey = mk.titleKey;
          for (let i=overlay.length-1; i>=0; i--) {
            const it = overlay[i] || {};
            const sameId = (String(it.id||'') === idStr);
            const sameTitle = titleKey && norm(it.title||'') === titleKey;
            if (sameId || sameTitle) overlay.splice(i,1);
          }
          ovById.delete(idStr);
          if (titleKey) ovByTitleKey.delete(titleKey);
        });
        // Then apply upserts if not scheduled for delete
        pendingUpserts.forEach(idStr => {
          if (pendingDeletes.has(idStr)) return; // delete has priority
          if (!ovById.has(idStr)) {
            const mk = metaMap.get(idStr) || { titleKey: '' };
            const src = findRequestData(idStr, mk.titleKey) || { id: idStr, title: '', type:'film' };
            overlay.unshift({
              id: src.id || idStr,
              title: src.title || (ovById.get(idStr)?.title) || '',
              type: src.type || 'film',
              rating: src.rating,
              genres: Array.isArray(src.genres)?src.genres:[],
              description: src.description || '',
              portraitImage: src.portraitImage || src.image || '',
              landscapeImage: src.landscapeImage || '',
              watchUrl: src.watchUrl || '',
              studioBadge: src.studioBadge || '',
              actors: Array.isArray(src.actors)?src.actors:[]
            });
            ovById.set(idStr, overlay[0]);
            const tk = norm(overlay[0].title||''); if (tk) ovByTitleKey.set(tk, overlay[0]);
          }
        });
      }
      // Keep local approved mirror in sync so UI reflects shared state with overlay
      try { setApproved(dedupeByIdAndTitle(overlay)); } catch {}
      const remoteIds = new Set();
      const remoteTitles = new Set();
      (overlay||[]).forEach(it=>{ try { if (it && it.id) remoteIds.add(String(it.id)); const t = norm(it && it.title); if (t) remoteTitles.add(t); } catch {} });
      const byId = new Map();
      const byTitle = new Map();
      (list||[]).forEach(r=>{
        try {
          const id = r && r.data && r.data.id || '';
          const t = r && r.data && r.data.title || '';
          if (id) byId.set(String(id), r);
          const nt = norm(t);
          if (nt) byTitle.set(nt, r);
        } catch {}
      });
      let changed = false;
      // Reconcile local statuses with remote approved
      (list||[]).forEach(r => {
        try {
          const id = String((r && r.data && r.data.id) || '');
          const nt = norm(r && r.data && r.data.title || '');
          const isRemoteApproved = (id && remoteIds.has(id)) || (nt && remoteTitles.has(nt));
          if (isRemoteApproved && r.status !== 'approved') { r.status = 'approved'; changed = true; }
          if (!isRemoteApproved && r.status === 'approved') { r.status = 'pending'; changed = true; }
        } catch {}
      });
      for (const it of remote) {
        if (!it) continue;
        const id = String(it.id||'');
        const nt = norm(it.title||'');
        const exists = (id && byId.has(id)) || (nt && byTitle.has(nt));
        if (!exists) {
          const rid = id ? ('pub-'+id) : ('pub-'+(nt||Math.random().toString(36).slice(2,8)));
          // Map remote approved shape to request data shape (best effort)
          const data = {
            id: id || rid,
            title: String(it.title||''),
            type: String(it.type||'film'),
            rating: (typeof it.rating==='number') ? it.rating : undefined,
            genres: Array.isArray(it.genres) ? it.genres.slice(0,3) : [],
            description: String(it.description||''),
            portraitImage: it.portraitImage || it.image || '',
            landscapeImage: it.landscapeImage || '',
            watchUrl: String(it.watchUrl||''),
            studioBadge: String(it.studioBadge||''),
            actors: Array.isArray(it.actors) ? it.actors : []
          };
          list.unshift({ requestId: rid, status: 'approved', data, meta: { importedFromPublic: true, updatedAt: Date.now() } });
          changed = true;
        }
      }
      if (changed) {
        setRequests(list);
        try { renderTable(); } catch {}
      }
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
    // Reset startedAt for each new action to avoid stale windows affecting overlay logic
    track[id] = { ...prev, action, startedAt: Date.now(), confirmedAt: undefined };
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
    // Ajoute des transformations Cloudinary optimales pour performances maximales
    // f_auto: format automatique (AVIF > WebP > JPG selon support navigateur)
    // q_auto:best: qualité automatique optimale
    // dpr_auto: adaptation au ratio de pixels de l'écran (Retina, etc.)
    // fl_progressive: chargement progressif (JPEG/WebP)
    // fl_lossy: compression avec perte optimisée pour WebP
    // w_auto: largeur automatique selon viewport (avec Client Hints)
    // c_limit: ne jamais agrandir l'image au-delà de sa taille originale
    try { 
      return url.replace('/upload/', '/upload/f_auto,q_auto:best,dpr_auto,fl_progressive:steep,fl_lossy,w_auto:100:600,c_limit/'); 
    } catch { 
      return url; 
    }
  }

  // Lightweight progress HUD
  function createProgressHud(label){
    try {
      let hud = document.getElementById('upload-progress-hud');
      if (!hud) {
        hud = document.createElement('div');
        hud.id = 'upload-progress-hud';
        hud.style.position = 'fixed';
        hud.style.right = '16px';
        hud.style.bottom = '16px';
        hud.style.zIndex = '99999';
        hud.style.background = 'rgba(0,0,0,0.8)';
        hud.style.border = '1px solid rgba(255,255,255,0.18)';
        hud.style.borderRadius = '8px';
        hud.style.padding = '10px 12px';
        hud.style.color = '#fff';
        hud.style.fontSize = '13px';
        hud.style.minWidth = '220px';
        const title = document.createElement('div'); title.className = 't'; title.textContent = label||'Upload...';
        const barWrap = document.createElement('div'); barWrap.style.marginTop = '8px'; barWrap.style.width = '100%'; barWrap.style.height = '6px'; barWrap.style.background = 'rgba(255,255,255,0.12)'; barWrap.style.borderRadius='999px';
        const bar = document.createElement('div'); bar.className = 'b'; bar.style.height='100%'; bar.style.width='0%'; bar.style.background='#2B22EE'; bar.style.borderRadius='999px'; bar.style.transition='width .15s ease';
        barWrap.appendChild(bar);
        hud.appendChild(title); hud.appendChild(barWrap);
        document.body.appendChild(hud);
      } else {
        const t = hud.querySelector('.t'); if (t) t.textContent = label || t.textContent;
      }
      return hud;
    } catch { return null; }
  }
  function updateProgressHud(hud, pct){ try { const b = hud && hud.querySelector('.b'); if (b) b.style.width = Math.max(0, Math.min(100, pct)) + '%'; } catch {} }
  function removeProgressHud(hud){ try { if (hud && hud.parentNode) hud.parentNode.removeChild(hud); } catch {} }

  // Client-side downscale to speed up uploads and reduce bandwidth
  async function downscaleImage(file, opts){
    try {
      const { maxW=1024, maxH=1024, quality=0.85, mime='image/webp' } = opts||{};
      const bitmap = await createImageBitmap(file).catch(async()=>{
        return new Promise((res, rej)=>{ const img=new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=URL.createObjectURL(file); });
      });
      const iw = bitmap.width||bitmap.naturalWidth; const ih = bitmap.height||bitmap.naturalHeight;
      if (!iw || !ih) return file;
      let tw = iw, th = ih;
      const wr = maxW / iw; const hr = maxH / ih; const r = Math.min(1, wr, hr);
      tw = Math.round(iw * r); th = Math.round(ih * r);
      if (r === 1) return file; // no need to downscale
      const canvas = document.createElement('canvas'); canvas.width = tw; canvas.height = th;
      const ctx = canvas.getContext('2d');
      // Better scaling
      try { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; } catch {}
      ctx.drawImage(bitmap, 0, 0, tw, th);
      const blob = await new Promise((resolve)=>{ canvas.toBlob(b=>resolve(b||file), mime, quality); });
      return blob || file;
    } catch { return file; }
  }

  // Upload with XHR to provide progress events
  function uploadImageToCloudinary(file, onProgress){
    return new Promise((resolve, reject)=>{
      if (!cloudinaryConfigured()) {
        alert('Cloudinary n\'est pas configuré. Merci de renseigner « Cloud name » et « Upload preset » dans la section Stockage images (en haut de l\'admin).');
        reject(new Error('Cloudinary not configured')); return;
      }
      const cfg = getCldConfig();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', cfg.uploadPreset);
      if (cfg.folder) fd.append('folder', cfg.folder);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', cloudinaryUploadUrl(), true);
      xhr.upload.onprogress = (e)=>{
        if (e && e.lengthComputable && typeof onProgress === 'function') {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onreadystatechange = function(){
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText||'{}');
              if (json && json.secure_url) { resolve(transformDeliveryUrl(json.secure_url)); return; }
            } catch {}
            reject(new Error('Réponse upload invalide'));
          } else {
            reject(new Error('Upload failed: '+xhr.status));
          }
        }
      };
      xhr.onerror = ()=>reject(new Error('Upload network error'));
      xhr.send(fd);
    });
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
          ['Liam Roxxor','images/liam-roxxor.webp'],
          ['Kassielator','images/kassielator.webp'],
          ['Ferrisbu','images/ferrisbu.webp'],
          ['Clone Prod','images/clone-prod.webp'],
          ['Raiback','images/raiback.webp'],
          ['Beat Vortex','images/beat-vortex.webp'],
          ['Arth','images/arth.webp'],
          ['Steve Animation','images/steve-animation.webp'],
          ["Le Zebre'ifique",'images/le-zebre-ifique.webp']
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
  function getTrash(){ return loadJSON(APP_KEY_TRASH, []); }
  function setTrash(list){ saveJSON(APP_KEY_TRASH, list); }

  async function publishTrashUpsert(item){
    const cfg = await ensurePublishConfig();
    if (!cfg || !cfg.url || !cfg.secret) return false;
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.secret },
        body: JSON.stringify({ action: 'trash_upsert', item })
      });
      return !!res.ok;
    } catch { return false; }
  }

  async function publishTrashDelete(id){
    const cfg = await ensurePublishConfig();
    if (!cfg || !cfg.url || !cfg.secret) return false;
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.secret },
        body: JSON.stringify({ action: 'trash_delete', id })
      });
      return !!res.ok;
    } catch { return false; }
  }

  async function publishTrashEmpty(){
    const cfg = await ensurePublishConfig();
    if (!cfg || !cfg.url || !cfg.secret) return false;
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.secret },
        body: JSON.stringify({ action: 'trash_empty' })
      });
      return !!res.ok;
    } catch { return false; }
  }

  function getPublishConfig(){
    try { return JSON.parse(localStorage.getItem(APP_KEY_PUB) || 'null') || {}; } catch { return {}; }
  }
  function setPublishConfig(cfg){
    try { localStorage.setItem(APP_KEY_PUB, JSON.stringify(cfg||{})); } catch {}
  }
  async function ensurePublishConfig(){
    let cfg = getPublishConfig();
    if (!cfg || !cfg.url) {
      // Prefill defaults to avoid prompting admins
      let origin = '';
      try { origin = (window.location.origin || ''); } catch {}
      const publicApprovedUrl = origin ? (origin + '/data/approved.json') : '';
      const publicRequestsUrl = origin ? (origin + '/data/requests.json') : '';
      const publicTrashUrl = origin ? (origin + '/data/trash.json') : '';
      cfg = {
        url: 'https://clipsou-publish.arthurcapon54.workers.dev/publish-approved',
        secret: 'Ns7kE4pP2Yq9vC1rT5wZ8hJ3uL6mQ0aR',
        publicApprovedUrl,
        publicRequestsUrl,
        publicTrashUrl
      };
      setPublishConfig(cfg);
    } else {
      // Backfill public URLs if missing
      try {
        if (!cfg.publicApprovedUrl) {
          const guessA = (window.location.origin || '') + '/data/approved.json';
          cfg.publicApprovedUrl = guessA;
        }
        if (!cfg.publicRequestsUrl) {
          const guessR = (window.location.origin || '') + '/data/requests.json';
          cfg.publicRequestsUrl = guessR;
        }
        if (!cfg.publicTrashUrl) {
          const guessT = (window.location.origin || '') + '/data/trash.json';
          cfg.publicTrashUrl = guessT;
        }
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

  // ===== Publish requests (shared across admins) =====
  async function publishRequestUpsert(request){
    const cfg = await ensurePublishConfig();
    if (!cfg || !cfg.url || !cfg.secret) return false;
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.secret },
        body: JSON.stringify({ action: 'request_upsert', request })
      });
      return !!res.ok;
    } catch { return false; }
  }
  async function publishRequestDelete(id){
    const cfg = await ensurePublishConfig();
    if (!cfg || !cfg.url || !cfg.secret) return false;
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.secret },
        body: JSON.stringify({ action: 'request_delete', id })
      });
      return !!res.ok;
    } catch { return false; }
  }

  function renderActors(list){
    const wrap = $('#actorsList');
    wrap.innerHTML = '';
    const photoMap = getActorPhotoMap();
    // Local drag source index for reordering within this render cycle
    let dragSrcIndex = null;
    // Read current editing index to highlight the chip
    let editingIndex = -1;
    try { const v = parseInt(String(($('#contentForm').dataset.actorEditIndex)||''), 10); if (!Number.isNaN(v)) editingIndex = v; } catch {}
    (list||[]).forEach((a, idx) => {
      const chip = document.createElement('div');
      chip.className = 'actor-chip';
      if (idx === editingIndex) chip.classList.add('editing');
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
      // Inline edit button (pencil) inside the chip
      const ed = document.createElement('button');
      ed.className = 'edit';
      ed.type = 'button';
      ed.textContent = '✏️';
      ed.title = 'Modifier cet acteur';
      // Prevent drag when interacting with the edit button
      ed.addEventListener('pointerdown', (e)=>{ e.stopPropagation(); });
      ed.addEventListener('click', ()=>{
        try {
          const nameInput = $('#actorName');
          const roleInput = $('#actorRole');
          if (nameInput) nameInput.value = a.name || '';
          if (roleInput) roleInput.value = a.role || '';
          // Set edit mode index and change button label
          try { $('#contentForm').dataset.actorEditIndex = String(idx); } catch {}
          try { const addBtn = $('#addActorBtn'); if (addBtn) addBtn.textContent = 'Modifier'; } catch {}
          // Prefill preview using explicit photo or global map
          const preview = $('#actorPhotoPreview');
          const tempPhoto = (a && a.photo) || resolveActorPhoto(photoMap, a && a.name || '');
          if (tempPhoto) {
            try { $('#contentForm').dataset.actorPhotoTemp = tempPhoto; } catch {}
            if (preview) { preview.hidden = false; preview.src = tempPhoto.startsWith('http') ? tempPhoto : ('../' + tempPhoto); }
          } else {
            try { delete $('#contentForm').dataset.actorPhotoTemp; } catch {}
            if (preview) { preview.hidden = true; preview.removeAttribute('src'); }
          }
          // Focus name for quick edit
          try { nameInput && nameInput.focus && nameInput.focus(); } catch {}
          // Re-render to reflect chip highlight
          renderActors(list);
        } catch {}
      });
      chip.appendChild(ed);
      const rm = document.createElement('button');
      rm.className = 'remove';
      rm.type = 'button';
      rm.textContent = '✕';
      rm.addEventListener('pointerdown', (e)=>{ e.stopPropagation(); });
      rm.addEventListener('click', () => {
        list.splice(idx,1);
        // Persist new list into form dataset immediately so submit/draft reflect removal
        try { $('#contentForm').dataset.actors = JSON.stringify(list); } catch {}
        // If we deleted the one being edited, exit edit mode
        try {
          const cur = parseInt(String(($('#contentForm').dataset.actorEditIndex)||''), 10);
          if (!Number.isNaN(cur)) { delete $('#contentForm').dataset.actorEditIndex; const addBtn = $('#addActorBtn'); if (addBtn) addBtn.textContent = 'Ajouter'; }
        } catch {}
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
    
    // Initialize login elements and handlers (must be done before any early returns)
    const btn = $('#loginBtn');
    const pwdInput = $('#passwordInput');
    const showPwd = $('#showPwd');
    
    // Show/hide password
    if (showPwd && pwdInput) {
      showPwd.addEventListener('change', () => {
        pwdInput.type = showPwd.checked ? 'text' : 'password';
      });
    }
    
    // Define doLogin function before attaching handlers
    async function doLogin(){
      const pwd = (pwdInput && pwdInput.value) || '';
      if (!pwd) {
        alert('Veuillez entrer un mot de passe.');
        return;
      }
      
      // Disable button during verification
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Vérification...';
      }
      
      try {
        const hash = await hashPassword(pwd);
        
        if (hash === ADMIN_PASSWORD_HASH) {
          try { sessionStorage.setItem(APP_KEY_SESSION, '1'); } catch {}
          // Always remember once successfully logged in
          try { localStorage.setItem(APP_KEY_REMEMBER, '1'); } catch {}
          // Broadcast logged-in state (for public site to show Admin shortcut immediately)
          try { localStorage.setItem('clipsou_admin_logged_in_v1','1'); localStorage.setItem('clipsou_admin_session_broadcast', String(Date.now())); } catch {}
          showApp();
          initApp();
        } else {
          alert('Mot de passe incorrect.');
          if (pwdInput) pwdInput.value = '';
        }
      } catch (err) {
        console.error('Erreur d\'authentification:', err);
        alert('Erreur lors de la vérification du mot de passe.');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Se connecter';
        }
      }
    }
    
    // Attach login handlers
    if (btn) btn.addEventListener('click', doLogin);
    if (pwdInput) pwdInput.addEventListener('keydown', (e)=>{ if (e.key==='Enter') { e.preventDefault(); doLogin(); } });
    
    // Existing session
    try {
      // If "remember" is set, auto-login without prompting
      if (localStorage.getItem(APP_KEY_REMEMBER) === '1') {
        sessionStorage.setItem(APP_KEY_SESSION, '1');
        try { localStorage.setItem('clipsou_admin_logged_in_v1','1'); localStorage.setItem('clipsou_admin_session_broadcast', String(Date.now())); } catch {}
        showApp();
        initApp();
        return;
      }
      if (sessionStorage.getItem(APP_KEY_SESSION) === '1') {
        showApp();
        try { localStorage.setItem('clipsou_admin_logged_in_v1','1'); localStorage.setItem('clipsou_admin_session_broadcast', String(Date.now())); } catch {}
        initApp();
        return;
      }
    } catch {}

    showLogin();

    // Don't prefill password for security - user must type it each time after logout
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
    if (studioBadgeEl) studioBadgeEl.value = data.studioBadge || 'https://clipsoustreaming.com/images/clipsoustudio.webp';
    // Preview studio badge
    setPreview($('#studioBadgePreview'), (studioBadgeEl && studioBadgeEl.value) || '');
    const actors = Array.isArray(data.actors) ? data.actors.slice() : [];
    $('#contentForm').dataset.actors = JSON.stringify(actors);
    renderActors(actors);
    // Previews
    setPreview($('#portraitPreview'), $('#portraitImage').value);
    setPreview($('#landscapePreview'), $('#landscapeImage').value);

    // Update submit button label based on edit/new mode and approval status
    try {
      const submitBtn = document.querySelector('#contentForm .actions .btn[type="submit"], #contentForm .actions button[type="submit"]');
      if (submitBtn) {
        let isApproved = false;
        let isEditing = false;
        
        // Check if editing an existing item
        if (data && (data.requestId || data.id)) {
          isEditing = true;
          
          // Check if this item is currently approved by requestId in requests
          if (data.requestId) {
            const requests = getRequests();
            const existing = requests.find(x => x.requestId === data.requestId);
            isApproved = existing && existing.status === 'approved';
          }
          
          // Also check if the film exists in the approved list (for films loaded from approved.json)
          if (!isApproved && data.id) {
            const approved = getApproved();
            isApproved = approved.some(x => x && x.id === data.id);
          }
          
          submitBtn.textContent = isApproved ? 'Modifier et publier' : 'Enregistrer la modification';
        } else {
          submitBtn.textContent = 'Enregistrer la requête';
        }
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
    if (!studioBadge) studioBadge = 'https://clipsoustreaming.com/images/clipsoustudio.webp';
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
    let reqs = getRequests().filter(r => !(r && r.meta && r.meta.deleted));
    // Apply search filter if any
    try {
      const input = $('#requestsSearch');
      const term = (input && input.value || '').trim().toLowerCase();
      if (term) {
        const matches = (r)=>{
          try {
            const d = r && r.data || {};
            const parts = [];
            parts.push(String(d.title||''));
            parts.push(String(d.type||''));
            parts.push(String(d.id||''));
            parts.push(String(d.description||''));
            try { (Array.isArray(d.genres)?d.genres:[]).forEach(g=>parts.push(String(g||''))); } catch {}
            try { (Array.isArray(d.actors)?d.actors:[]).forEach(a=>parts.push(String((a&&a.name)||''), String((a&&a.role)||''))); } catch {}
            const hay = parts.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
            const needle = term.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
            return hay.includes(needle);
          } catch { return false; }
        };
        reqs = reqs.filter(matches);
      }
    } catch {}
    tbody.innerHTML = '';
    // Determine shared-approved state from the current approved list
    const aprList = getApproved();
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
      // Derive label from shared approved list (remote-synced), fallback to local status, then overlay local in-flight actions
      let isApprovedShared = (function(){
        try {
          const id = r && r.data && r.data.id;
          const keyR = normalizeTitleKey(r && r.data && r.data.title);
          return (aprList||[]).some(x=> x && (x.id===id || normalizeTitleKey(x.title)===keyR));
        } catch { return r.status === 'approved'; }
      })();
      try {
        const trk = getDeployTrack();
        const id = r && r.data && r.data.id;
        const meta = trk && id ? trk[id] : null;
        if (meta && !meta.confirmedAt) {
          const started = Number(meta.startedAt||0);
          const fresh = (Date.now() - started) < 120000; // 2 minutes overlay window
          if (fresh) {
            if (meta.action === 'delete') isApprovedShared = false;
            else if (meta.action === 'upsert') isApprovedShared = true;
          }
        }
      } catch {}
      approveBtn.textContent = isApprovedShared ? 'Retirer' : 'Approuver';
      actions.appendChild(editBtn); actions.appendChild(delBtn); actions.appendChild(approveBtn);

      // No status cell anymore
      editBtn.addEventListener('click', ()=>{ fillForm(r.data); try { setLastEditedId(r.data && r.data.id); } catch{} });
      delBtn.addEventListener('click', async ()=>{
        if (!confirm('Déplacer ce film vers la corbeille ?')) return;
        
        // Move to trash instead of deleting
        let list = getRequests().filter(x=>x.requestId!==r.requestId);
        setRequests(list);
        
        // Add to trash
        let trash = getTrash();
        const trashed = { ...r, meta: { ...(r.meta||{}), updatedAt: Date.now(), deleted: true, trashedAt: Date.now() } };
        trash.unshift(trashed);
        setTrash(trash);
        try { publishTrashUpsert(trashed); } catch {}
        try { publishRequestDelete(r.requestId); } catch {}
        
        try { if ((r && r.data && r.data.id) === getLastEditedId()) clearLastEditedId(); } catch{}
        
        // If it was approved, send unpublish request
        if (r.status==='approved') {
          const apr = getApproved().filter(x=>x.id!==r.data.id);
          setApproved(apr);
          
          // Send unpublish request (delete action)
          showPublishWaitHint();
          try { 
            await deleteApproved(r.data.id);
            try { startDeploymentWatch(r.data.id, 'delete'); } catch {}
          } catch {}
        }
        
        renderTable(); 
        renderTrash();
        emptyForm();
        
        // Share deletion with other admins (server-side will remove from requests.json)
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
          // Instantly reflect locally on this device
          approveBtn.textContent = 'Approuver';
          try { renderTable(); } catch {}
          // Remove from shared approved.json; mark in-flight BEFORE network to suppress overlay flicker
          try { startDeploymentWatch(found.data.id, 'delete'); } catch {}
          showPublishWaitHint();
          await deleteApproved(found.data.id);
          // No status cell to refresh
          // Sync removed
          try { publishRequestUpsert(found); } catch {}
        } else {
          // Show publishing indicator and disable button during network call
          const originalHtml = approveBtn.innerHTML;
          approveBtn.disabled = true;
          showPublishWaitHint();

          // Optimistically set approved locally and update UI immediately
          found.status = 'approved';
          stampUpdatedAt(found);
          setRequests(list);
          let apr = getApproved();
          const key = normalizeTitleKey(found.data && found.data.title);
          // Remove any existing approved with same normalized title or different item with same id
          apr = apr.filter(x => x && x.id !== found.data.id && normalizeTitleKey(x.title) !== key);
          apr.push(found.data);
          setApproved(dedupeByIdAndTitle(apr));
          // Instantly reflect in UI on this device
          approveBtn.textContent = 'Retirer';
          try { renderTable(); } catch {}

          // Publish through API for everyone and reflect final status
          const ok = await publishApproved(found.data);
          if (ok) {
            // Keep label as Retirer; schedule a soft refresh
            setTimeout(()=>{ try { renderTable(); } catch {} }, 300);
            try { startDeploymentWatch(found.data.id, 'upsert', found.data); } catch {}
          } else {
            // Revert local approval on failure
            found.status = 'pending';
            setRequests(list);
            const apr2 = getApproved().filter(x=>x.id!==found.data.id);
            setApproved(apr2);
            approveBtn.textContent = 'Approuver';
            try { renderTable(); } catch {}
          }
          // Re-enable only if global 30s lock is not active
          try { approveBtn.disabled = isPublishLocked(); } catch { approveBtn.disabled = false; }
          // Share new status with other admins
          try { publishRequestUpsert(found); } catch {}
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

  function renderTrash(){
    const tbody = $('#trashTable tbody');
    if (!tbody) return;
    const trash = getTrash();
    tbody.innerHTML = '';
    
    if (!trash || trash.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;">La corbeille est vide</td>';
      tbody.appendChild(tr);
      // Hide empty trash button if trash is empty
      try {
        const emptyBtn = $('#emptyTrashBtn');
        if (emptyBtn) emptyBtn.style.display = 'none';
      } catch {}
      return;
    }
    
    // Show empty trash button
    try {
      const emptyBtn = $('#emptyTrashBtn');
      if (emptyBtn) emptyBtn.style.display = '';
    } catch {}
    
    trash.forEach(r => {
      const tr = document.createElement('tr');
      const g3 = (r.data.genres||[]).slice(0,3).filter(Boolean).map(g=>String(g));
      tr.innerHTML = `
        <td>${r.data.title||''}</td>
        <td>${r.data.type||''}</td>
        <td class="genres-cell"></td>
        <td class="row-actions"></td>
      `;
      
      // Fill genres
      try {
        const tdGenres = tr.querySelector('.genres-cell');
        if (tdGenres) {
          tdGenres.innerHTML = '';
          g3.forEach((g) => {
            const span = document.createElement('span');
            span.className = 'genre';
            span.textContent = g;
            tdGenres.appendChild(span);
          });
        }
      } catch {}
      
      const actions = tr.querySelector('.row-actions');
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'btn';
      restoreBtn.textContent = 'Restaurer';
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn secondary';
      deleteBtn.textContent = 'Supprimer définitivement';
      
      actions.appendChild(restoreBtn);
      actions.appendChild(deleteBtn);
      
      // Restore button handler
      restoreBtn.addEventListener('click', async () => {
        if (!confirm('Restaurer ce film ?')) return;
        
        // Remove from trash
        let trashList = getTrash().filter(x => x.requestId !== r.requestId);
        setTrash(trashList);
        try { publishTrashDelete(r.requestId); } catch {}
        
        // Add back to requests
        let requestsList = getRequests();
        // Remove the deleted flag
        const restored = { ...r, meta: { ...(r.meta||{}), deleted: false, updatedAt: Date.now() } };
        requestsList.unshift(restored);
        setRequests(requestsList);
        try { publishRequestUpsert(restored); } catch {}
        
        // If it was approved, restore to approved list and republish
        if (r.status === 'approved') {
          let apr = getApproved();
          const key = normalizeTitleKey(r.data.title);
          apr = apr.filter(x => x && x.id !== r.data.id && normalizeTitleKey(x.title) !== key);
          apr.push(r.data);
          setApproved(dedupeByIdAndTitle(apr));
          
          // Republish to go live again
          showPublishWaitHint();
          const ok = await publishApproved(r.data);
          if (ok) {
            try { startDeploymentWatch(r.data.id, 'upsert', r.data); } catch {}
          }
        }
        
        renderTrash();
        renderTable();
        alert('Film restauré avec succès.');
      });
      
      // Delete permanently button handler
      deleteBtn.addEventListener('click', () => {
        if (!confirm('Supprimer définitivement ce film ? Cette action est irréversible.')) return;
        
        // Remove from trash permanently
        let trashList = getTrash().filter(x => x.requestId !== r.requestId);
        setTrash(trashList);
        try { publishTrashDelete(r.requestId); } catch {}
        
        renderTrash();
        alert('Film supprimé définitivement.');
      });
      
      tbody.appendChild(tr);
    });
  }

  async function initApp(){
    const app = $('#app');
    app.hidden = false;

    // Logout button returns to login
    try {
      const logoutBtn = $('#logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          try { sessionStorage.removeItem(APP_KEY_SESSION); } catch {}
          // Broadcast logout so public site hides Admin shortcut immediately
          try { localStorage.removeItem('clipsou_admin_logged_in_v1'); localStorage.setItem('clipsou_admin_session_broadcast', String(Date.now())); } catch {}
          // Forget remember flag and clear any prefilled password
          try { localStorage.removeItem(APP_KEY_REMEMBER); } catch {}
          try {
            const pwd = document.getElementById('passwordInput');
            if (pwd) { pwd.value = ''; pwd.type = 'password'; }
            const chk = document.getElementById('showPwd');
            if (chk) chk.checked = false;
          } catch {}
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
          // Instant local preview
          try { if (preview) { preview.hidden = false; preview.src = URL.createObjectURL(f); } } catch {}
          // Downscale avatar to a reasonable size before upload
          const small = await downscaleImage(f, { maxW: 600, maxH: 600, quality: 0.85, mime: 'image/webp' });
          const hud = createProgressHud('Envoi de la photo acteur...');
          try {
            const url = await uploadImageToCloudinary(small, (p)=>updateProgressHud(hud, p));
            $('#contentForm').dataset.actorPhotoTemp = url;
            if (preview) { preview.hidden = false; preview.src = url.startsWith('http')? url : ('../'+url); }
            // Persist name->photo association if name already provided
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
          } finally {
            removeProgressHud(hud);
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

    // ===== Requests search wiring =====
    try {
      const searchInput = $('#requestsSearch');
      if (searchInput) {
        let raf = null;
        const rerender = () => { if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(()=>{ try { renderTable(); } catch {} }); };
        searchInput.addEventListener('input', rerender);
        searchInput.addEventListener('change', rerender);
      }
    } catch {}

    $('#addActorBtn').addEventListener('click', ()=>{
      const name = $('#actorName').value.trim();
      const role = $('#actorRole').value.trim();
      if (!name) return;
      const actors = JSON.parse($('#contentForm').dataset.actors || '[]');
      const editIdxRaw = ($('#contentForm').dataset.actorEditIndex)||'';
      const editIdx = parseInt(String(editIdxRaw), 10);
      let tempPhoto = $('#contentForm').dataset.actorPhotoTemp || '';
      // If no temp photo but default exists for this name, use it (add mode only)
      if (!tempPhoto) {
        try { const map = getActorPhotoMap(); tempPhoto = resolveActorPhoto(map, name) || ''; } catch {}
      }
      if (!Number.isNaN(editIdx)) {
        // Edit mode: update existing actor
        const prev = actors[editIdx] || {};
        const updated = { ...prev, name, role };
        // If a tempPhoto is currently selected, set/replace it; otherwise keep previous photo as-is
        if (tempPhoto) updated.photo = tempPhoto;
        actors[editIdx] = updated;
        try { delete $('#contentForm').dataset.actorEditIndex; } catch {}
        try { const addBtn = $('#addActorBtn'); if (addBtn) addBtn.textContent = 'Ajouter'; } catch {}
      } else {
        // Add mode
        if (tempPhoto) actors.push({ name, role, photo: tempPhoto });
        else actors.push({ name, role });
      }
      $('#contentForm').dataset.actors = JSON.stringify(actors);
      // Reset inputs and temp photo
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
      // Show instant local preview
      try {
        const localUrl = URL.createObjectURL(file);
        if (kind==='portrait') setPreview(portraitPreview, localUrl);
        else if (kind==='landscape') setPreview(landscapePreview, localUrl);
        else if (kind==='studio') setPreview(studioPreview, localUrl);
      } catch {}
      // Downscale according to target usage to reduce upload time
      let maxW = 1920, maxH = 1080; // default landscape
      if (kind==='portrait') { maxW = 900; maxH = 1200; }
      if (kind==='studio') { maxW = 512; maxH = 512; }
      const optimized = await downscaleImage(file, { maxW, maxH, quality: 0.85, mime: 'image/webp' });
      const hud = createProgressHud('Envoi de l\'image...');
      try {
        const url = await uploadImageToCloudinary(optimized, (p)=>updateProgressHud(hud, p));
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
        removeProgressHud(hud);
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
        // No longer show "saved" state - button remains active for continuous editing
        if (!saved) {
          const reqId = $('#requestId').value;
          const filmId = $('#id').value;
          let isApproved = false;
          let isEditing = false;
          
          // Check if editing an existing item
          if (reqId || filmId) {
            isEditing = true;
            
            // Check if this item is currently approved by requestId in requests
            if (reqId) {
              const requests = getRequests();
              const existing = requests.find(x => x.requestId === reqId);
              isApproved = existing && existing.status === 'approved';
            }
            
            // Also check if the film exists in the approved list
            if (!isApproved && filmId) {
              const approved = getApproved();
              isApproved = approved.some(x => x && x.id === filmId);
            }
            
            btn.textContent = isApproved ? 'Modifier et publier' : 'Enregistrer la modification';
          } else {
            btn.textContent = 'Enregistrer la requête';
          }
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
        
        // Check if film exists in approved list (for films loaded from approved.json without requestId)
        const approvedList = getApproved();
        const existsInApproved = data.id && approvedList.some(x => x && x.id === data.id);
        
        // If film is approved but has no requestId, try to find existing request by film ID
        if (!reqId && existsInApproved && data.id) {
          const existingByFilmId = list.find(x => x.data && x.data.id === data.id);
          if (existingByFilmId) {
            reqId = existingByFilmId.requestId;
          }
        }
        
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
        const wasApproved = !!(existing && existing.status === 'approved') || existsInApproved;
        if (existing) {
          existing.data = data;
          // IMPORTANT: switch to 'pending' during publication to reflect real-time GitHub propagation
          if (wasApproved) existing.status = 'pending';
          stampUpdatedAt(existing);
        }
        else { list.unshift(stampUpdatedAt({ requestId: reqId, status: 'pending', data })); }
        setRequests(list);
        // Share this request across admins
        try { const saved = list.find(x=>x.requestId===reqId); if (saved) publishRequestUpsert(saved); } catch {}
        try { setLastEditedId(data && data.id); } catch{}
        // If already approved, keep approved in sync and publish immediately
        if (wasApproved) {
          let apr = getApproved();
          const key = normalizeTitleKey(data.title);
          apr = apr.filter(x => x && x.id !== data.id && normalizeTitleKey(x.title) !== key);
          apr.push(data);
          setApproved(dedupeByIdAndTitle(apr));
          
          renderTable();
          showPublishWaitHint();
          
          // Republish updated approved item to the site so changes go live
          (async () => {
            const ok = await publishApproved(data);
            if (ok) {
              // Success: mark as approved and show deployment started
              const found = list.find(x => x.requestId === reqId);
              if (found) found.status = 'approved';
              setRequests(list);
              renderTable();
              // Clear any stale draft so removed actors don't reappear on reload
              try { clearDraft(); } catch {}
              try { startDeploymentWatch(data.id, 'upsert', data); } catch {}
            }
          })();
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

    // Wire empty trash button
    const emptyTrashBtn = $('#emptyTrashBtn');
    if (emptyTrashBtn) {
      emptyTrashBtn.addEventListener('click', () => {
        const trash = getTrash();
        if (!trash || trash.length === 0) return;
        
        if (!confirm(`Vider la corbeille ? Cela supprimera définitivement ${trash.length} film(s). Cette action est irréversible.`)) return;
        
        setTrash([]);
        try { publishTrashEmpty(); } catch {}
        renderTrash();
        alert('Corbeille vidée.');
      });
    }

    // Initial load: hydrate shared requests and render
    try { await hydrateRequestsFromPublic(); } catch {}
    try { await hydrateRequestsFromPublicApproved(); } catch {}
    try { renderTable(); } catch {}
    try { renderTrash(); } catch {}
    emptyForm();
    renderTable();
    renderTrash();
    // Shared requests sync removed
    populateGenresDatalist();
    restoreDraft();
    populateActorNamesDatalist();
    // Hydrate actor photos from public approved.json to ensure chips display known avatars
    try { await hydrateActorPhotoMapFromPublic(); } catch {}
    // If no draft is present, restore the last edited item into the form for continuity
    try {
      const draft = loadJSON(APP_KEY_DRAFT, null);
      if (!draft) {
        const lastId = getLastEditedId();
        if (lastId) {
          const list = getRequests();
          const foundReq = (list||[]).find(x => x && x.data && x.data.id === lastId && !(x.meta && x.meta.deleted));
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

// After app init, prefill actor edit flow if URL contains ?editActor=...
(function(){
  function onReady(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  onReady(function(){
    try {
      const params = new URLSearchParams(location.search || '');
      const target = params.get('editActor');
      if (!target) return;
      // Wait a tick to ensure admin UI is visible post-auth
      setTimeout(()=>{
        try {
          const nameInput = document.querySelector('#actorName');
          if (nameInput) {
            nameInput.value = target;
            // Trigger change to prefill photo preview via existing listeners
            try { nameInput.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
            // Visual hint and scroll into view
            const row = document.querySelector('.actor-row') || nameInput;
            if (row && row.scrollIntoView) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            try {
              row.style.outline = '2px solid rgba(99,102,241,0.9)';
              row.style.outlineOffset = '2px';
              setTimeout(()=>{ try { row.style.outline = ''; row.style.outlineOffset = ''; } catch{} }, 2000);
            } catch {}
          }
        } catch {}
      }, 200);
    } catch {}
  });
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
