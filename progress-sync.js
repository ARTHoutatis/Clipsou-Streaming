// Progress sync using Firebase Realtime Database (free tier)
// Bridges localStorage 'clipsou_watch_progress_v1' with cloud at /users/{uid}/progress
// Works read-only when signed out (local only). When signed in, merges both ways and
// keeps them in sync with a lightweight debounce on writes.

import { getDatabase, ref, onValue, set, update } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js';

(function(){
  const KEY = 'clipsou_watch_progress_v1';
  const WRITE_DEBOUNCE_MS = 600;
  let unsub = null;
  let pendingWrite = null;
  let lastCloudSnapshot = [];
  let currentUid = null;

  function readLocal(){
    try {
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function writeLocal(list){
    try { localStorage.setItem(KEY, JSON.stringify(list||[])); } catch {}
    try { window.dispatchEvent(new Event('clipsou-progress-updated')); } catch {}
    try { window.dispatchEvent(new CustomEvent('clipsou-progress-updated')); } catch {}
  }
  function byId(list){ const m=new Map(); (list||[]).forEach(it=>{ if (it && it.id) m.set(String(it.id), it); }); return m; }

  function mergeLists(localList, cloudList){
    const out = [];
    const li = byId(localList);
    const ci = byId(cloudList);
    const ids = new Set([...li.keys(), ...ci.keys()]);
    ids.forEach(id => {
      const a = li.get(id);
      const b = ci.get(id);
      if (a && !b) { out.push(a); return; }
      if (!a && b) { out.push(b); return; }
      // Both exist → prefer freshest updatedAt, else highest percent
      const au = Number(a.updatedAt||0); const bu = Number(b.updatedAt||0);
      if (au !== bu) { out.push(au > bu ? a : b); return; }
      const ap = Number(a.percent||0); const bp = Number(b.percent||0);
      out.push(ap >= bp ? a : b);
    });
    // sort newest first (optional)
    out.sort((x,y)=> (Number(y.updatedAt||0) - Number(x.updatedAt||0)));
    return out;
  }

  function shapeForCloud(it){
    // Keep only portable fields, then strip undefined/null/NaN
    const obj = {
      id: String(it.id||''),
      percent: Number(it.percent||0),
      seconds: Number(it.seconds||0) || undefined,
      duration: Number(it.duration||0) || undefined,
      episode: (it.episode!=null && it.episode!=='') ? Number(it.episode) : undefined,
      title: it.title || undefined,
      image: it.image || undefined,
      updatedAt: Number(it.updatedAt||Date.now())
    };
    // Sanitize
    Object.keys(obj).forEach((k) => {
      const v = obj[k];
      if (v === undefined || v === null) delete obj[k];
      else if (typeof v === 'number' && !Number.isFinite(v)) delete obj[k];
    });
    return obj;
  }

  function scheduleCloudWrite(uid, list){
    if (!uid) return;
    const db = window.FirebaseAuth && window.FirebaseAuth.db ? window.FirebaseAuth.db : getDatabase();
    const base = ref(db, 'users/' + uid + '/progress');
    // Debounced full replace to keep it simple and consistent with local array
    if (pendingWrite) clearTimeout(pendingWrite);
    pendingWrite = setTimeout(async () => {
      try {
        const payload = {};
        (list||[]).forEach((it) => {
          try {
            const shaped = shapeForCloud(it||{});
            const key = String(shaped.id||'').trim();
            if (!key) return; // skip invalid entries
            payload[key] = shaped;
          } catch {}
        });
        await set(base, payload);
      } catch(e){ console.warn('progress sync write error', e); }
    }, WRITE_DEBOUNCE_MS);
  }

  function startCloudListener(uid){
    stopCloudListener();
    if (!uid) return;
    const db = window.FirebaseAuth && window.FirebaseAuth.db ? window.FirebaseAuth.db : getDatabase();
    const base = ref(db, 'users/' + uid + '/progress');
    unsub = onValue(base, (snap)=>{
      try {
        const val = snap.val() || {};
        const cloud = Object.values(val);
        lastCloudSnapshot = cloud;
        const merged = mergeLists(readLocal(), cloud);
        writeLocal(merged);
      } catch(e){ console.warn('progress sync read error', e); }
    }, (err)=>{ console.warn('progress sync listener error', err); });
  }

  function stopCloudListener(){ if (unsub && typeof unsub === 'function') { try { unsub(); } catch {} } unsub = null; }

  // Export minimal API
  window.ProgressSync = {
    // For index.js to call after it updates local list
    pushLocalChange(){
      try {
        const uid = currentUid;
        if (!uid) return; // signed out
        const local = readLocal();
        scheduleCloudWrite(uid, local);
      } catch {}
    }
  };

  // Hook auth changes
  function onAuth(u){
    currentUid = u && u.uid ? u.uid : null;
    if (!currentUid) {
      stopCloudListener();
      return;
    }
    // On sign-in: one-time merge local ↔ cloud (listener will perform the merge on first snapshot)
    startCloudListener(currentUid);
  }

  // Subscribe to FirebaseAuth if available now or later
  function init(){
    if (window.FirebaseAuth && window.FirebaseAuth.onAuthStateChanged) {
      window.FirebaseAuth.onAuthStateChanged(onAuth);
    } else {
      // Wait until firebase-auth.js loads
      let tries = 0;
      const t = setInterval(()=>{
        tries++;
        if (window.FirebaseAuth && window.FirebaseAuth.onAuthStateChanged) {
          clearInterval(t);
          window.FirebaseAuth.onAuthStateChanged(onAuth);
        }
        if (tries > 100) clearInterval(t);
      }, 100);
    }

    // When local changes, notify cloud (used by index.js via custom event or direct call)
    window.addEventListener('clipsou-progress-updated', ()=>{
      try { window.ProgressSync.pushLocalChange(); } catch {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
