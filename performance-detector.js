'use strict';

/**
 * Performance Detector v2
 * - Active un mode "low-end" lorsque l'appareil semble limité (CPU, RAM, réseau, préférences utilisateur).
 * - Permet un override manuel via localStorage / helpers globaux pour faciliter le debug.
 */

(function() {
  const CLASS_NAME = 'low-end-device';
  const PREF_KEY = 'clipsou_low_end_pref_v2';
  const docEl = document.documentElement || document.body;
  const nav = navigator || {};
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  function log(message, payload) {
    try {
      if (localStorage.getItem('clipsou_debug_perf') === '1') {
        console.log(message, payload || '');
      }
    } catch (_) {}
  }

  function applyLowEndState(enabled, reasons) {
    if (!docEl) return;
    const list = docEl.classList;
    try {
      if (enabled) {
        list.add(CLASS_NAME);
        docEl.setAttribute('data-low-end', '1');
      } else {
        list.remove(CLASS_NAME);
        docEl.removeAttribute('data-low-end');
      }
      window.__clipsouLowEnd = { enabled, reasons: reasons || [] };
    } catch (_) {}
    log('[Clipsou] Low-end state → ' + (enabled ? 'ON' : 'OFF'), reasons);
    try {
      window.dispatchEvent(new CustomEvent('lowEndModeChanged', {
        detail: { enabled: !!enabled, reasons: reasons || [] }
      }));
    } catch (_) {}
  }

  function detectReasons() {
    const reasons = [];
    try {
      const cores = nav.hardwareConcurrency;
      if (Number.isFinite(cores) && cores > 0 && cores <= 4) {
        reasons.push('low_cpu');
      }
    } catch (_) {}

    try {
      const mem = nav.deviceMemory;
      if (Number.isFinite(mem) && mem > 0 && mem <= 4) {
        reasons.push('low_memory');
      }
    } catch (_) {}

    try {
      if (conn) {
        const type = (conn.effectiveType || '').toLowerCase();
        if (conn.saveData) reasons.push('save_data');
        if (type === '2g' || type === 'slow-2g') reasons.push('slow_network');
      }
    } catch (_) {}

    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        reasons.push('prefers_reduced_motion');
      }
    } catch (_) {}

    try {
      const ua = (nav.userAgent || '').toLowerCase();
      if (/moto g|sm-g900|redmi|redmi note|infinix|tecno|itel|sm-j|asus_z|lenovo k/i.test(ua)) {
        reasons.push('entry_level_device');
      }
    } catch (_) {}

    return reasons;
  }

  function shouldEnable(reasons) {
    if (!reasons || !reasons.length) return false;
    if (reasons.includes('save_data') || reasons.includes('prefers_reduced_motion')) return true;
    const hasCpu = reasons.includes('low_cpu');
    const hasMem = reasons.includes('low_memory');
    const hasNet = reasons.includes('slow_network');
    if (hasCpu && (hasMem || hasNet)) return true;
    if (hasMem && hasNet) return true;
    if (reasons.includes('entry_level_device') && (hasCpu || hasMem || hasNet)) return true;
    return false;
  }

  function getStoredPref() {
    try {
      return localStorage.getItem(PREF_KEY) || '';
    } catch (_) {
      return '';
    }
  }

  function setStoredPref(value) {
    try {
      if (!value) localStorage.removeItem(PREF_KEY);
      else localStorage.setItem(PREF_KEY, value);
    } catch (_) {}
  }

  function evaluate() {
    const pref = getStoredPref();
    if (pref === 'force-on') {
      applyLowEndState(true, ['forced_on']);
      return;
    }
    if (pref === 'force-off') {
      applyLowEndState(false, ['forced_off']);
      return;
    }
    const reasons = detectReasons();
    applyLowEndState(shouldEnable(reasons), reasons);
  }

  // Public helpers for manual overrides (kept compatible with legacy calls)
  window.forceLowEndMode = function() {
    setStoredPref('force-on');
    console.info('[Clipsou] Low-end mode forcé ON');
    evaluate();
  };

  window.disableLowEndMode = function() {
    setStoredPref('force-off');
    console.info('[Clipsou] Low-end mode forcé OFF');
    evaluate();
  };

  window.autoLowEndMode = function() {
    setStoredPref('');
    console.info('[Clipsou] Low-end mode repasse en auto');
    evaluate();
  };

  // Initial evaluation ASAP
  evaluate();

  // React to preference changes at runtime
  try {
    if (conn && typeof conn.addEventListener === 'function') {
      conn.addEventListener('change', evaluate, { passive: true });
    } else if (conn && 'onchange' in conn) {
      conn.onchange = evaluate;
    }
  } catch (_) {}

  try {
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq && typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', evaluate);
      } else if (mq && typeof mq.addListener === 'function') {
        mq.addListener(evaluate);
      }
    }
  } catch (_) {}

  console.info('[Clipsou] Détecteur low-end actif');
})();
