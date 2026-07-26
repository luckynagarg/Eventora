import React from 'react';
import ReactDOM from 'react-dom/client';
import { onAuthStateChanged } from 'firebase/auth';
import App from './App.jsx';
import { auth } from './config/firebase.js';
import './index.css';

/**
 * Bootstrap: Initialize authentication before React renders.
 *
 * We register a single onAuthStateChanged listener before calling
 * ReactDOM.createRoot, so that the first auth snapshot is available
 * by the time any component mounts. Without this guard, the
 * <RequireAuth> guard can fire before Firebase finishes checking a
 * persisted session, causing an unnecessary redirect to /login even
 * when the user is logged in.
 */
const AUTH_BOOTSTRAP_TIMEOUT_MS = 2_000;

const isDev = import.meta.env.DEV === true;

let resolveAuthBootstrap;
const authBootstrapComplete = new Promise((resolve) => {
  resolveAuthBootstrap = resolve;
});

/** Timer that forces the bootstrap to resolve even if Firebase never fires. */
const fallbackTimer = setTimeout(() => {
  if (isDev) {
    console.warn(
      '[Bootstrap] Firebase onAuthStateChanged did not fire within ' +
        `${AUTH_BOOTSTRAP_TIMEOUT_MS} ms – continuing with current auth state.`,
    );
  }
  resolveAuthBootstrap();
}, AUTH_BOOTSTRAP_TIMEOUT_MS);

onAuthStateChanged(auth, (firebaseUser) => {
  clearTimeout(fallbackTimer);

  if (firebaseUser) {
    firebaseUser
      .getIdToken(false)
      .then((idToken) => {
        localStorage.setItem('firebase_id_token', idToken);
        localStorage.setItem(
          'firebaseUser',
          JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          }),
        );

        if (isDev) {
          console.log('[Bootstrap] Firebase user restored:', firebaseUser.email);
        }
      })
      .catch((err) => {
        console.error('[Bootstrap] Failed to retrieve ID token:', err);
      })
      .finally(() => {
        resolveAuthBootstrap();
      });
  } else {
    // Don't clear localStorage here – the user might have a valid
    // email/password JWT even if there is no Firebase session.
    if (isDev) {
      console.log('[Bootstrap] No Firebase session (email/password may still be valid).');
    }
    resolveAuthBootstrap();
  }
});

authBootstrapComplete.then(() => {
  if (isDev) {
    console.log('[Bootstrap] Auth state resolved – rendering React.');
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
