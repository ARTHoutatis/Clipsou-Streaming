// Firebase Auth bootstrap for Clipsou Streaming (no build tools, CDN imports)
// Uses Google provider (enabled in your console). You can extend to email/password later.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js';

// Your Firebase config (public) — provided by you
const firebaseConfig = {
  apiKey: 'AIzaSyAwnc0bRBdspspUA3Ksuy-rVWGA7nAiRoI',
  authDomain: 'clipsoustreaming-52bc4.firebaseapp.com',
  projectId: 'clipsoustreaming-52bc4',
  storageBucket: 'clipsoustreaming-52bc4.firebasestorage.app',
  messagingSenderId: '115181244019',
  appId: '1:115181244019:web:850162fc7f6f1a0f3ea406',
  measurementId: 'G-SKP5SSYV97'
};

// Singletons
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Explicit RTDB URL to avoid region/auto-detection issues
const db = getDatabase(app, 'https://clipsoustreaming-52bc4-default-rtdb.firebaseio.com');
const provider = new GoogleAuthProvider();

// Expose a minimal API on window so other scripts/pages can use it without bundlers
window.FirebaseAuth = {
  app,
  auth,
  db,
  provider,
  signInWithGoogle: async () => {
    try {
      await signInWithPopup(auth, provider);
      return { ok: true };
    } catch (e) {
      console.warn('Google sign-in error', e);
      return { ok: false, error: e };
    }
  },
  signOut: async () => {
    try { await signOut(auth); return { ok: true }; }
    catch (e) { console.warn('Sign-out error', e); return { ok: false, error: e }; }
  },
  onAuthStateChanged: (cb) => onAuthStateChanged(auth, cb)
};

// Small helper to attach an auth button if present in the page nav
function wireAuthButton(){
  try {
    const btn = document.getElementById('auth-btn');
    if (!btn) return;
    const render = (user) => {
      btn.textContent = user ? 'Mon compte' : 'Se connecter';
      btn.setAttribute('aria-label', user ? 'Ouvrir le menu compte (déconnexion)' : 'Se connecter avec Google');
    };
    // Click toggles sign-in/sign-out for now (no modal yet to stay minimal)
    btn.addEventListener('click', async () => {
      const user = auth.currentUser;
      if (!user) {
        btn.disabled = true; btn.textContent = 'Connexion...';
        try { await window.FirebaseAuth.signInWithGoogle(); }
        finally { btn.disabled = false; }
      } else {
        const yes = window.confirm('Se déconnecter ?');
        if (yes) await window.FirebaseAuth.signOut();
      }
    });
    window.FirebaseAuth.onAuthStateChanged((u)=>render(u));
    render(auth.currentUser);
  } catch {}
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wireAuthButton);
} else {
  wireAuthButton();
}
