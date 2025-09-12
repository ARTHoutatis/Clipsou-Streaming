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
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

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
      cfg = { url: url.trim(), secret: secret.trim() };
      setPublishConfig(cfg);
    }
    return cfg;
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
    const genres = [$('#genre1').value, $('#genre2').value, $('#genre3').value].filter(Boolean);
    let id = $('#id').value.trim();
    const title = $('#title').value.trim();
    if (!id) id = makeIdFromTitle(title);
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
    const reqs = getRequests();
    tbody.innerHTML = '';
    reqs.forEach(r => {
      const tr = document.createElement('tr');
      const g3 = (r.data.genres||[]).slice(0,3).join(', ');
      tr.innerHTML = `
        <td>${r.data.title||''}</td>
        <td>${r.data.type||''}</td>
        <td>${g3}</td>
        <td>${(typeof r.data.rating==='number')?r.data.rating:''}</td>
        <td>${r.status}</td>
        <td class="row-actions"></td>
      `;
      const actions = tr.querySelector('.row-actions');
      const editBtn = document.createElement('button'); editBtn.className='btn secondary'; editBtn.textContent='Modifier';
      const delBtn = document.createElement('button'); delBtn.className='btn secondary'; delBtn.textContent='Supprimer';
      const approveBtn = document.createElement('button'); approveBtn.className='btn'; approveBtn.textContent=(r.status==='approved'?'Retirer':'Approuver');
      actions.appendChild(editBtn); actions.appendChild(delBtn); actions.appendChild(approveBtn);
      editBtn.addEventListener('click', ()=>{ fillForm(r.data); });
      delBtn.addEventListener('click', ()=>{
        if (!confirm('Supprimer cette requête ?')) return;
        const list = getRequests().filter(x=>x.requestId!==r.requestId);
        setRequests(list);
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
          setRequests(list);
          const apr = getApproved().filter(x=>x.id!==found.data.id);
          setApproved(apr);
          // Remove from shared approved.json
          await deleteApproved(found.data.id);
        } else {
          // Show publishing indicator and disable button during network call
          const originalHtml = approveBtn.innerHTML;
          approveBtn.disabled = true;
          approveBtn.innerHTML = 'Publication… <span class="dot orange"></span>';

          // Optimistically set approved locally
          found.status = 'approved';
          setRequests(list);
          const apr = getApproved();
          const idx = apr.findIndex(x=>x.id===found.data.id);
          if (idx>=0) apr[idx]=found.data; else apr.push(found.data);
          setApproved(apr);
          // Publish through API for everyone and reflect final status
          const ok = await publishApproved(found.data);
          if (ok) {
            approveBtn.innerHTML = 'Retirer <span class="dot green"></span>';
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
    const portraitText = $('#portraitImage');
    const landscapeText = $('#landscapeImage');
    const portraitPreview = $('#portraitPreview');
    const landscapePreview = $('#landscapePreview');
    const portraitClearBtn = $('#portraitClearBtn');
    const landscapeClearBtn = $('#landscapeClearBtn');

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
        } else {
          landscapeText.value = url;
          setPreview(landscapePreview, url);
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

    const form = $('#contentForm');
    if (form && !form.dataset.submitWired) {
      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        const data = collectForm();
        // Upsert request by requestId, otherwise create new request entry
        let list = getRequests();
        let reqId = data.requestId || '';
        if (!reqId) reqId = uid();
        data.requestId = reqId;
        // Persist the requestId in the hidden input to avoid duplicate creation on rapid double-submit
        const reqIdInput = $('#requestId');
        if (reqIdInput) reqIdInput.value = reqId;
        const existing = list.find(x=>x.requestId===reqId);
        if (existing) {
          existing.data = data;
        } else {
          list.unshift({ requestId: reqId, status: 'pending', data });
        }
        setRequests(list);
        // If already approved, keep approved in sync
        if (existing && existing.status==='approved') {
          const apr = getApproved();
          const idx = apr.findIndex(x=>x.id===data.id);
          if (idx>=0) apr[idx]=data; else apr.push(data);
          setApproved(apr);
        }
        renderTable();
        populateGenresDatalist();
        clearDraft();
        alert('Requête enregistrée.');
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
    populateGenresDatalist();
    restoreDraft();
    populateActorNamesDatalist();
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
