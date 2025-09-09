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
    const to = getParam('to');
    if (!to || !validUrl(to)) {
      // Fallback: return to home if target missing
      try { window.location.href = './'; } catch {}
      return;
    }

    const video = document.getElementById('introVideo');
    const skipBtn = document.getElementById('skipBtn');
    let navigated = false;
    let timer = null;
    let tick = null;
    const start = Date.now();

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

    // Autoplay the intro; retry muted if necessary
    (async function(){
      if (!video) return; 
      try {
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        await video.play();
      } catch (_e1) {
        try {
          video.muted = true;
          await video.play();
        } catch (_e2) {
          // If playback not allowed, just keep the timer; clicking skip still works
        }
      }
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
