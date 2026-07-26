import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDTOE4LH5lgMn4V1HHHjlEp8kylaw9bdxg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'eventora-ec1b6.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'eventora-ec1b6',
  storageBucket: 'eventora-ec1b6.firebasestorage.app',
  messagingSenderId: '1009342351992',
  appId: '1:1009342351992:web:c958354c6817b953e2bb8d',
  measurementId: 'G-JRF3FYVZ6S'
};

// ─── Singleton Firebase App ───────────────────────────────────────────────
// Use getApps() to avoid duplicate initialization (Firebase SDK warning).
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── Services ─────────────────────────────────────────────────────────────
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Optional: request additional scopes if needed
// googleProvider.addScope('profile');
// googleProvider.addScope('email');

// Set custom OAuth parameters
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Analytics – only initialized in browser environments that support it
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics not supported – silently skip
  });
}

// ─── Debug Logging (development only) ─────────────────────────────────────
const isDev = import.meta.env.DEV === true;

if (isDev) {
  const origin = window.location.origin;
  const authDomain = firebaseConfig.authDomain;
  const projectId = firebaseConfig.projectId;
  const apps = getApps();

  console.log(
    `%c[Firebase] Initialization`,
    'color: #FFA000; font-weight: bold;'
  );
  console.table({
    'Project ID': projectId,
    'Auth Domain': authDomain,
    'App Instances': apps.length,
    'Current Origin': origin,
    'API Key Present': firebaseConfig.apiKey ? '✅ Yes' : '❌ No',
    'Auth Ready': auth ? '✅ Yes' : '❌ No',
  });

  // Warn if the current origin is not the authDomain
  const currentHost = window.location.host;
  const authDomainHost = authDomain.replace('https://', '').replace('http://', '');
  if (!currentHost.includes(authDomainHost) && currentHost !== 'localhost:5173' && currentHost !== 'localhost:3000') {
    console.warn(
      `%c[Firebase] ⚠️ Current origin "${origin}" is different from authDomain "${authDomain}". ` +
      'Ensure the current domain is added to Firebase Console → Authentication → Settings → Authorized domains.',
      'color: orange; font-weight: bold;'
    );
  }
}

// ─── Auth State Listener (singleton, registered once) ─────────────────────
// This is a singleton that components can subscribe to.
// It handles token refresh and auth state persistence.
let onAuthStateChangedInitialized = false;

/**
 * Initializes the Firebase auth state listener.
 * Must be called once from the app entry point (main.jsx or App.jsx).
 * Returns an unsubscribe function.
 */
export function initAuthListener(onUserChanged) {
  if (onAuthStateChangedInitialized) {
    if (isDev) {
      console.warn('[Firebase] Auth listener already initialized – skipping duplicate registration.');
    }
    return () => {};
  }

  onAuthStateChangedInitialized = true;

  if (isDev) {
    console.log('%c[Firebase] Registering onAuthStateChanged listener', 'color: #4CAF50; font-weight: bold;');
  }

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in – get the ID token for API requests
      try {
        const idToken = await user.getIdToken(true); // force refresh
        if (isDev) {
          console.log('%c[Firebase] Auth state: signed in', 'color: #4CAF50; font-weight: bold;');
          console.log(`  User: ${user.email}`);
          console.log(`  ID Token: ${idToken.substring(0, 20)}... (truncated)`);
        }
        // Store the token for API interceptor usage
        localStorage.setItem('firebase_id_token', idToken);
        localStorage.setItem('user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }));
        onUserChanged?.(user, idToken);
      } catch (error) {
        console.error('[Firebase] Failed to refresh ID token:', error);
        onUserChanged?.(null, null);
      }
    } else {
      // User is signed out
      if (isDev) {
        console.log('%c[Firebase] Auth state: signed out', 'color: #F44336; font-weight: bold;');
      }
      localStorage.removeItem('firebase_id_token');
      // Don't remove the JWT token here – it may be from email/password login
      onUserChanged?.(null, null);
    }
  });

  return unsubscribe;
}

/**
 * Returns the current Firebase ID token, refreshing if necessary.
 */
export async function getFirebaseIdToken() {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  try {
    return await user.getIdToken(false); // don't force refresh
  } catch {
    return null;
  }
}

export { app, auth, googleProvider, analytics };

