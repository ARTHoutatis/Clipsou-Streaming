(function(){
  'use strict';
  function getParam(name){
    const sp = new URLSearchParams(location.search);
    return sp.get(name) || '';
  }
  function safeNavigate(url){
    try { window.location.replace(url); } catch { window.location.href = url; }
  }
  function validUrl(u){
    try {
      const x = new URL(u, window.location.href);
      return /^https?:$/i.test(x.protocol);
    } catch { return false; }
  }

  document.addEventListener('DOMContentLoaded', function(){
    let to = getParam('to');
    if (!to || !validUrl(to)) {
      // Fallback: keep intro, navigate to home after intro
      to = './';
    }

    const video = document.getElementById('introVideo');
    const skipBtn = document.getElementById('skipBtn');
    let navigated = false;
    let timer = null;
    let tick = null;
    const start = Date.now();

    // Ensure attributes are present ASAP for autoplay policies (single video element)
    try {
      if (video) {
        video.setAttribute('autoplay', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.autoplay = true;
        video.playsInline = true;
        try { video.removeAttribute('controls'); } catch {}
        try { video.load(); } catch {}
      }
    } catch {}

    function setSkipText(){
      try { skipBtn.textContent = `Passer l'intro`; } catch {}
    }

    function cleanupAndGo(){
      if (navigated) return;
      navigated = true;
      try { if (timer) { clearTimeout(timer); timer = null; } } catch{}
      try { if (tick) { clearInterval(tick); tick = null; } } catch{}
      safeNavigate(to);
    }

    // Start 12s countdown
    setSkipText();
    try {
      timer = setTimeout(cleanupAndGo, 12000);
      tick = setInterval(function(){
        if (navigated) return;
        const elapsed = Math.floor((Date.now() - start) / 1000);
        const remain = Math.max(0, 12 - elapsed);
        setSkipText();
        if (remain <= 0 && tick) { clearInterval(tick); tick = null; }
      }, 1000);
    } catch {}

    // Bind skip
    try { skipBtn.addEventListener('click', cleanupAndGo); } catch {}

    // Autoplay the intro prioritized: always start muted to guarantee playback across browsers.
    (async function(){
      if (!video) return;
      // Diagnostics: log basic info to help detect why audio might be missing
      try {
        const diag = (label, val) => { try { console.debug(`[intro] ${label}:`, val); } catch {} };
        video.addEventListener('loadedmetadata', function(){
          try {
            diag('loadedmetadata duration', video.duration);
            // audioTracks is not widely supported, guard access
            let tracksLen = undefined;
            try { tracksLen = (video.audioTracks && typeof video.audioTracks.length === 'number') ? video.audioTracks.length : undefined; } catch {}
            diag('audioTracks.length', tracksLen);
            diag('mozHasAudio', video.mozHasAudio);
            diag('webkitAudioDecodedByteCount', video.webkitAudioDecodedByteCount);
          } catch {}
        }, { once: true });
      } catch {}
      // Always start muted to guarantee autoplay
      try {
        video.autoplay = true;
        video.playsInline = true;
        video.defaultMuted = true;
        video.muted = true;
        try { video.setAttribute('muted', ''); } catch {}
        // Ensure source is set and loaded
        try {
          if (!video.currentSrc || video.readyState === 0) {
            if (!video.getAttribute('src')) {
              video.setAttribute('src', 'intro.mp4');
            }
            if (typeof video.load === 'function') video.load();
          }
        } catch {}
        await video.play();
      } catch {}
      // If still paused, try again when data is ready or when tab becomes visible
      try {
        const ensurePlay = async () => { try { if (video.paused) await video.play(); } catch {} };
        video.addEventListener('loadeddata', ensurePlay, { once: true });
        video.addEventListener('canplay', ensurePlay, { once: true });
        video.addEventListener('canplaythrough', ensurePlay, { once: true });
        document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') { ensurePlay(); } });
        window.addEventListener('focus', ensurePlay);
        window.addEventListener('pageshow', ensurePlay);
        // also retry shortly after load
        setTimeout(ensurePlay, 150);
        setTimeout(ensurePlay, 600);
      } catch {}
      // Optional: allow user to enable sound with first gesture (no UI). If you want perma-muted, remove this block.
      const onceUnmute = async () => {
        try {
          video.defaultMuted = false;
          video.muted = false;
          try { video.removeAttribute('muted'); } catch {}
          video.volume = 1.0;
          await video.play();
        } catch {}
        try {
          document.removeEventListener('pointerdown', onceUnmute);
          document.removeEventListener('keydown', onceUnmute);
          document.removeEventListener('touchstart', onceUnmute, { passive: true });
        } catch {}
      };
      try { document.addEventListener('pointerdown', onceUnmute, { once: true }); } catch {}
      try { document.addEventListener('keydown', onceUnmute, { once: true }); } catch {}
      try { document.addEventListener('touchstart', onceUnmute, { once: true, passive: true }); } catch {}
    })();

    // Navigate immediately when the intro ends or errors
    try { video.addEventListener('ended', cleanupAndGo); } catch {}
    try { video.addEventListener('error', cleanupAndGo); } catch {}

    // If the page becomes hidden for a long time, still ensure navigation proceeds when user returns
    document.addEventListener('visibilitychange', function(){
      if (document.visibilityState === 'hidden') return;
      // When returning visible, if countdown already done, navigate
      const elapsed = Math.floor((Date.now() - start) / 1000);
      if (elapsed >= 12) cleanupAndGo();
    });
  });
})();
