import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './config/firebase.js'

// ─── Bootstrap Firebase auth state before React renders ──────────────
// This ensures the auth state is resolved before any component mounts,
// preventing race conditions where RequireAuth redirects before Firebase
// finishes checking the persisted session.
const isDev = import.meta.env.DEV === true;

let authResolve;
const authReady = new Promise((resolve) => {
  authResolve = resolve;
});

// Register ONE global onAuthStateChanged listener at the app's entry point.
// This is the SINGLE source of truth for Firebase auth state.
// Components subscribe via useFirebaseAuth hook (which also calls onAuthStateChanged,
// but that's safe since Firebase supports multiple subscribers).
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    try {
      // Get ID token without forcing refresh (uses cached token if available)
      const idToken = await firebaseUser.getIdToken(false);
      localStorage.setItem('firebase_id_token', idToken);
      localStorage.setItem(
        'user',
        JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        })
      );
      if (isDev) {
        console.log('[Auth Bootstrap] Firebase user:', firebaseUser.email);
      }
    } catch (err) {
      console.error('[Auth Bootstrap] Token error:', err);
    }
  } else {
    // Only clear Firebase token on actual sign-out, not on initial load
    // (the user may still have a JWT token from email/password login)
    if (!localStorage.getItem('token')) {
      localStorage.removeItem('firebase_id_token');
    }
    if (isDev) {
      console.log('[Auth Bootstrap] No Firebase user');
    }
  }
  authResolve();
});

// Render React only after auth state is initialized
authReady.then(() => {
  if (isDev) {
    console.log('[Auth Bootstrap] Auth state initialized, rendering React');
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
