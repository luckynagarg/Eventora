import { initializeApp, getApps, getApp, getVersion } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

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
  const currentHost = window.location.host;
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
    'Current Host': currentHost,
    'API Key Present': firebaseConfig.apiKey ? '✅ Yes' : '❌ No',
    'Auth Ready': auth ? '✅ Yes' : '❌ No',
    'Firebase SDK Version': getVersion ? getVersion() : 'unknown',
  });

  // Warn if the current origin is not the authDomain
  const authDomainHost = authDomain.replace('https://', '').replace('http://', '');
  if (!currentHost.includes(authDomainHost) && currentHost !== 'localhost' && currentHost !== 'localhost:5173' && currentHost !== 'localhost:3000') {
    console.warn(
      `%c[Firebase] ⚠️ Current origin "${origin}" is different from authDomain "${authDomain}". ` +
      'Ensure the current domain is added to Firebase Console → Authentication → Settings → Authorized domains.',
      'color: orange; font-weight: bold;'
    );
  }

  // Also check if Google Sign-In is properly configured
  console.log(
    `%c[Firebase] Google Sign-In check:`,
    'color: #4285F4; font-weight: bold;'
  );
  console.log('  Provider scopes:', googleProvider?.providerId);
  console.log('  Custom params:', googleProvider?.customParameters);
}

/**
 * Returns the current Firebase ID token without forcing refresh.
 * Used by the API interceptor to attach Firebase token as fallback auth.
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

