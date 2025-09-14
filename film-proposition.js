'use strict';

(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // ===== Public submission endpoint (Cloudflare Worker) =====
  // Set this to your deployed Worker URL, e.g. https://clipsou-worker.yourname.workers.dev
  // The Worker should accept { action: 'request', data: <payload> } without auth and write to data/requests.json
  const PUBLIC_SUBMIT_URL = (function(){
    try { return window.__CLIPSOU_PUBLIC_SUBMIT_URL__ || ''; } catch { return ''; }
  })();

  // ===== Cloudinary unsigned upload (public) =====
  const APP_KEY_CLD = 'clipsou_admin_cloudinary_v1'; // reuse admin storage key if set on this browser
  // Defaults aligned with admin
  const CLOUDINARY = { cloudName: 'dlaisw4zm', uploadPreset: 'dlaisw4zm_unsigned', folder: '' };
  function getCldConfig(){
    try { const saved = JSON.parse(localStorage.getItem(APP_KEY_CLD) || 'null'); return Object.assign({}, CLOUDINARY, saved||{}); } catch { return Object.assign({}, CLOUDINARY); }
  }
  function cloudinaryConfigured(){
    const cfg = getCldConfig();
    return cfg.cloudName && cfg.uploadPreset && !String(cfg.cloudName).includes('<') && !String(cfg.uploadPreset).includes('<');
  }
  function cloudinaryUploadUrl(){ const cfg = getCldConfig(); return `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`; }
  function transformDeliveryUrl(url){ try { return url.replace('/upload/', '/upload/f_auto,q_auto/'); } catch { return url; } }
  async function uploadImageToCloudinary(file){
    if (!cloudinaryConfigured()) { alert("L'upload d'images n'est pas configuré pour le navigateur. Réessayez plus tard."); throw new Error('Cloudinary not configured'); }
    const cfg = getCldConfig();
    const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', cfg.uploadPreset); if (cfg.folder) fd.append('folder', cfg.folder);
    const res = await fetch(cloudinaryUploadUrl(), { method: 'POST', body: fd });
    if (!res.ok) { const txt = await res.text().catch(()=>String(res.status)); throw new Error('Upload failed: '+txt); }
    const json = await res.json(); if (!json || !json.secure_url) throw new Error('Réponse upload invalide');
    return transformDeliveryUrl(json.secure_url);
  }

  // Simple validators (aligned with admin rules)
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
    if (typeof data.rating !== 'undefined' && data.rating !== null) {
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
    if (data.studioBadge && !isValidImageLike(data.studioBadge)) errors.push("Étiquette studio invalide.");
    return { ok: errors.length === 0, message: errors.join('\n') };
  }

  function setPreview(imgEl, value){
    if (!imgEl) return;
    const url = (value||'').trim();
    if (!url) {
      imgEl.hidden = true;
      try { imgEl.removeAttribute('src'); } catch {}
      return;
    }
    imgEl.src = url;
    imgEl.hidden = false;
  }

  function renderActors(list){
    const wrap = $('#actorsList');
    wrap.innerHTML = '';
    (list||[]).forEach((a, idx) => {
      const chip = document.createElement('div');
      chip.className = 'actor-chip';
      const nameSpan = document.createElement('span'); nameSpan.textContent = a.name || '';
      const roleSpan = document.createElement('span'); roleSpan.className = 'muted small'; roleSpan.textContent = a.role || '';
      chip.appendChild(nameSpan);
      chip.appendChild(roleSpan);
      const rm = document.createElement('button');
      rm.className = 'remove'; rm.type = 'button'; rm.textContent = '✕';
      rm.addEventListener('click', () => {
        list.splice(idx,1);
        try { $('#submitForm').dataset.actors = JSON.stringify(list); } catch {}
        renderActors(list);
      });
      chip.appendChild(rm);
      wrap.appendChild(chip);
    });
  }

  function collectForm(){
    const actors = JSON.parse($('#submitForm').dataset.actors || '[]');
    const seen = new Set();
    const genresRaw = [$('#genre1').value, $('#genre2').value, $('#genre3').value];
    const genres = [];
    genresRaw.forEach(g => { const v = String(g||'').trim(); if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); genres.push(v); } });
    return {
      id: undefined, // generated on the admin side
      title: $('#title').value.trim(),
      type: $('#type').value,
      rating: $('#rating').value ? parseFloat($('#rating').value) : undefined,
      genres,
      description: $('#description').value.trim(),
      portraitImage: $('#portraitImage').value.trim(),
      landscapeImage: $('#landscapeImage').value.trim(),
      watchUrl: $('#watchUrl') ? $('#watchUrl').value.trim() : '',
      studioBadge: $('#studioBadge').value.trim(),
      actors
    };
  }

  function attach(){
    const form = $('#submitForm');
    form.dataset.actors = '[]';

    const portraitText = $('#portraitImage');
    const landscapeText = $('#landscapeImage');
    const studioText = $('#studioBadge');
    const portraitPreview = $('#portraitPreview');
    const landscapePreview = $('#landscapePreview');
    const studioPreview = $('#studioBadgePreview');
    const actorPhotoFile = $('#actorPhotoFile');
    const actorPhotoPreview = $('#actorPhotoPreview');

    function wireTextPreview(inputEl, previewEl){
      if (!inputEl || !previewEl) return;
      inputEl.addEventListener('input', ()=> setPreview(previewEl, inputEl.value));
      inputEl.addEventListener('change', ()=> setPreview(previewEl, inputEl.value));
    }
    wireTextPreview(portraitText, portraitPreview);
    wireTextPreview(landscapeText, landscapePreview);
    wireTextPreview(studioText, studioPreview);

    // Upload handlers (disable all buttons during upload)
    function setAllButtonsDisabled(disabled){
      try { $$('.btn').forEach(b=>{ b.disabled = !!disabled; }); } catch {}
    }
    async function handleUpload(kind, file){
      setAllButtonsDisabled(true);
      try {
        const url = await uploadImageToCloudinary(file);
        if (kind==='portrait') { portraitText.value = url; setPreview(portraitPreview, url); }
        else if (kind==='landscape') { landscapeText.value = url; setPreview(landscapePreview, url); }
        else if (kind==='studio') { studioText.value = url; setPreview(studioPreview, url); }
      } catch(err){ console.error(err); alert("Échec de l'upload: " + (err && err.message ? err.message : 'inconnu')); }
      finally { setAllButtonsDisabled(false); }
    }

    const portraitFileInput = $('#portraitFileInput');
    const landscapeFileInput = $('#landscapeFileInput');
    const studioBadgeFileInput = $('#studioBadgeFileInput');
    if (portraitFileInput) {
      portraitFileInput.addEventListener('change', async (e)=>{ const f = e.target.files && e.target.files[0]; if (f) await handleUpload('portrait', f); e.target.value=''; });
    }
    if (landscapeFileInput) {
      landscapeFileInput.addEventListener('change', async (e)=>{ const f = e.target.files && e.target.files[0]; if (f) await handleUpload('landscape', f); e.target.value=''; });
    }
    if (studioBadgeFileInput) {
      studioBadgeFileInput.addEventListener('change', async (e)=>{ const f = e.target.files && e.target.files[0]; if (f) await handleUpload('studio', f); e.target.value=''; });
    }
    // Actor photo upload (per-actor temporary image)
    if (actorPhotoFile) {
      actorPhotoFile.addEventListener('change', async (e)=>{
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        try {
          setAllButtonsDisabled(true);
          const url = await uploadImageToCloudinary(f);
          // Stash temporarily on the form element until user clicks "Ajouter"
          $('#submitForm').dataset.actorPhotoTemp = url;
          if (actorPhotoPreview) { actorPhotoPreview.hidden = false; actorPhotoPreview.src = url; }
        } catch(err) {
          console.error(err);
          alert("Échec de l'upload de la photo acteur: " + (err && err.message ? err.message : 'inconnu'));
        } finally {
          setAllButtonsDisabled(false);
          e.target.value = '';
        }
      });
    }
    const portraitClearBtn = $('#portraitClearBtn');
    const landscapeClearBtn = $('#landscapeClearBtn');
    const studioBadgeClearBtn = $('#studioBadgeClearBtn');
    if (portraitClearBtn) portraitClearBtn.addEventListener('click', ()=>{ portraitText.value=''; setPreview(portraitPreview, ''); });
    if (landscapeClearBtn) landscapeClearBtn.addEventListener('click', ()=>{ landscapeText.value=''; setPreview(landscapePreview, ''); });
    if (studioBadgeClearBtn) studioBadgeClearBtn.addEventListener('click', ()=>{ studioText.value=''; setPreview(studioPreview, ''); });

    $('#addActorBtn').addEventListener('click', ()=>{
      const name = $('#actorName').value.trim();
      const role = $('#actorRole').value.trim();
      if (!name) return;
      const actors = JSON.parse($('#submitForm').dataset.actors || '[]');
      // Include uploaded temp photo if available
      let photo = '';
      try { photo = $('#submitForm').dataset.actorPhotoTemp || ''; } catch {}
      if (photo) {
        actors.push({ name, role, photo });
      } else {
        actors.push({ name, role });
      }
      $('#submitForm').dataset.actors = JSON.stringify(actors);
      $('#actorName').value=''; $('#actorRole').value='';
      // Clear temp photo + inputs + preview
      try { delete $('#submitForm').dataset.actorPhotoTemp; } catch {}
      if (actorPhotoFile) actorPhotoFile.value = '';
      if (actorPhotoPreview) { actorPhotoPreview.hidden = true; actorPhotoPreview.removeAttribute('src'); }
      renderActors(actors);
    });

    $('#resetBtn').addEventListener('click', ()=>{
      try { form.reset(); } catch{}
      try { $('#submitForm').dataset.actors = '[]'; } catch{}
      renderActors([]);
      setPreview(portraitPreview, '');
      setPreview(landscapePreview, '');
      setPreview(studioPreview, '');
      try { delete $('#submitForm').dataset.actorPhotoTemp; } catch {}
      if (actorPhotoFile) actorPhotoFile.value = '';
      if (actorPhotoPreview) { actorPhotoPreview.hidden = true; actorPhotoPreview.removeAttribute('src'); }
      try { $('.confirm-box').remove(); } catch{}
    });

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const data = collectForm();
      const v = validateData(data);
      if (!v.ok) { alert('Veuillez corriger les erreurs avant de soumettre:\n\n' + v.message); return; }
      if (!PUBLIC_SUBMIT_URL) {
        alert("Le service de soumission n'est pas configuré. Veuillez réessayer plus tard.");
        return;
      }
      // Submit directly to Cloudflare Worker
      const payload = { action: 'request', data, submittedAt: new Date().toISOString() };
      // Disable UI while sending
      try { $$('.btn').forEach(b=>b.disabled=true); } catch {}
      try {
        const res = await fetch(PUBLIC_SUBMIT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const txt = await res.text().catch(()=>String(res.status));
          throw new Error('HTTP '+res.status+': '+txt);
        }
        // Success UX
        try { form.reset(); } catch{}
        try { $('#submitForm').dataset.actors = '[]'; } catch{}
        renderActors([]);
        setPreview(portraitPreview, '');
        setPreview(landscapePreview, '');
        setPreview(studioPreview, '');
        try { delete $('#submitForm').dataset.actorPhotoTemp; } catch {}
        if (actorPhotoFile) actorPhotoFile.value = '';
        if (actorPhotoPreview) { actorPhotoPreview.hidden = true; actorPhotoPreview.removeAttribute('src'); }
        let box = document.querySelector('.confirm-box');
        if (!box) { box = document.createElement('div'); box.className = 'confirm-box'; form.insertAdjacentElement('afterend', box); }
        box.innerHTML = '<p>Merci ! Votre demande a été envoyée. Elle sera examinée par l\'équipe.</p>';
        alert('Merci ! Votre demande a été envoyée.');
      } catch(err){
        console.error(err);
        alert("Échec de l'envoi: " + (err && err.message ? err.message : 'inconnu'));
      } finally {
        try { $$('.btn').forEach(b=>b.disabled=false); } catch {}
      }
    });

    // Optional: pre-fill studio badge default
    try { const sb = $('#studioBadge'); if (sb && !sb.value) sb.value = 'https://clipsoustreaming.com/clipsoustudio.png'; } catch{}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
