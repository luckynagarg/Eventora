import { useState, useRef, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase.js';
import { api } from '../../api/client.js';
import { useNavigate } from 'react-router-dom';
import Toast from '../ui/Toast.jsx';

const isDev = import.meta.env.DEV === true;

/**
 * Detailed runtime environment logging – aids debugging Google Sign-In issues.
 * Logged once when the module loads.
 */
if (isDev) {
  const currentOrigin = window.location.origin;
  const currentHost = window.location.host;

  console.groupCollapsed(
    '%c[GoogleSignIn] Runtime Environment',
    'color: #4285F4; font-weight: bold;'
  );
  console.log('Current origin:', currentOrigin);
  console.log('Current host:', currentHost);
  console.log('Firebase Project ID: eventora-ec1b6');
  console.log('Firebase Auth Domain: eventora-ec1b6.firebaseapp.com');
  console.log('Expected Authorized Domain:', currentHost);
  console.log(
    'Firebase Console (Authorized Domains):',
    'https://console.firebase.google.com/project/eventora-ec1b6/authentication/settings'
  );
  console.log(
    'Google Cloud Console (OAuth JS Origins):',
    'https://console.cloud.google.com/apis/credentials'
  );
  console.groupEnd();
}

/**
 * Maps Firebase auth error codes to user-friendly messages.
 *
 * NOTE: The 'auth/unauthorized-domain' message uses HTML for rich formatting
 * (clickable link, code block). It is rendered via dangerouslySetInnerHTML
 * in the Toast component.
 */
const FIREBASE_ERROR_MESSAGES = {
  'auth/unauthorized-domain': [
    '<strong>This domain is not authorized for Google Sign-In.</strong><br><br>',
    'Current origin: <code>' + window.location.origin + '</code><br><br>',
    '<strong>To fix this:</strong><br>',
    '1. Open the Firebase Console:<br>',
    '&nbsp;&nbsp;<a href="https://console.firebase.google.com/project/eventora-ec1b6/authentication/settings" target="_blank" rel="noopener" class="underline text-blue-600">Firebase Console → Authentication → Settings</a><br>',
    '2. Under <strong>"Authorized domains"</strong>, click <strong>"Add domain"</strong><br>',
    '3. Add: <code>' + window.location.host + '</code><br>',
    '4. Also ensure <strong>Google Sign-In</strong> is <strong>ENABLED</strong><br>',
    '&nbsp;&nbsp;under <a href="https://console.firebase.google.com/project/eventora-ec1b6/authentication/providers" target="_blank" rel="noopener" class="underline text-blue-600">Authentication → Sign-in method</a><br>',
    '5. Click <strong>"Save"</strong><br><br>',
    'After saving, reload this page and try again.',
  ].join(''),
  'auth/popup-blocked':
    'Popup was blocked by your browser. Please allow popups for this site and try again, or use email/password login instead.',
  'auth/popup-closed-by-user':
    'Sign-in popup was closed before completing the login. Please try again.',
  'auth/cancelled-popup-request':
    'Another sign-in popup is already open. Please close it and try again.',
  'auth/network-request-failed':
    'Network error. Please check your internet connection and try again.',
  'auth/too-many-requests':
    'Too many sign-in attempts. Please wait a few minutes before trying again.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/account-exists-with-different-credential':
    'An account already exists with the same email address but a different sign-in method. Try signing in with email/password instead.',
};

const UNKNOWN_ERROR =
  'Google sign-in failed. Please try again or use email/password login.';

/**
 * GoogleSignInButton Component
 *
 * Attempts popup-based Google sign-in first. If the domain is not authorized
 * for popups, it falls back to a redirect-based flow, which works even
 * without the domain being explicitly in Firebase's authorized list.
 */
export default function GoogleSignInButton({ mode = 'signup' }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const navigate = useNavigate();

  const popupInProgress = useRef(false);

  /* ───────────────────────────────────────────────
   * Resolve Firebase error code → user-facing string
   * ─────────────────────────────────────────────── */
  const getErrorMessage = (error) => {
    if (error.code && FIREBASE_ERROR_MESSAGES[error.code]) {
      return FIREBASE_ERROR_MESSAGES[error.code];
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    return error.message || UNKNOWN_ERROR;
  };

  /* ───────────────────────────────────────────────
   * Store auth data in localStorage & redirect
   * ─────────────────────────────────────────────── */
  const finaliseAuth = (token, userPayload) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userPayload));

    setMessageType('success');
    setMessage(
      mode === 'login'
        ? 'Logged in successfully! Redirecting…'
        : 'Account created successfully! Redirecting…',
    );

    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get('redirect') || '/dashboard';
    setTimeout(() => navigate(redirectTo), 1_200);
  };

  /* ───────────────────────────────────────────────
   * Share the ID token from Firebase with our backend
   * ─────────────────────────────────────────────── */
  const exchangeTokenWithBackend = async (idToken) => {
    const response = await api.post('/auth/google', { idToken });
    finaliseAuth(response.data.token, response.data.user);
  };

  /* ───────────────────────────────────────────────
   * Popup-based flow (first attempt)
   * ─────────────────────────────────────────────── */
  const tryPopup = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = credential?.idToken;
    if (!idToken) {
      throw new Error('Failed to get Google ID token from credential response.');
    }
    if (isDev) {
      console.log('[GoogleSignIn] Popup succeeded for', result.user.email);
    }
    await exchangeTokenWithBackend(idToken);
  };

  /* ───────────────────────────────────────────────
   * Redirect-based flow (fallback for unauthorized domains)
   * ─────────────────────────────────────────────── */
  const tryRedirect = async () => {
    // First, store the current URL so we can return here after redirect
    sessionStorage.setItem('googleSignInOrigin', window.location.href);

    // Save the mode so we know it after the redirect loop
    sessionStorage.setItem('googleSignInMode', mode);

    // Trigger the redirect
    await signInWithRedirect(auth, googleProvider);
    // signInWithRedirect causes a full page navigation – code below will not
    // run immediately; the result is handled after the redirect returns.
  };

  /* ───────────────────────────────────────────────
   * Check for a pending redirect result on mount
   * ─────────────────────────────────────────────── */
  useEffect(() => {
    const origin = sessionStorage.getItem('googleSignInOrigin');
    const savedMode = sessionStorage.getItem('googleSignInMode');

    // Only process if we just returned from a Google redirect
    if (!origin) return;

    // Clean up immediately to avoid processing twice
    sessionStorage.removeItem('googleSignInOrigin');
    sessionStorage.removeItem('googleSignInMode');

    setLoading(true);

    getRedirectResult(auth)
      .then(async (result) => {
        if (!result) {
          // user closed the page or navigated away – nothing to do
          return;
        }

        const credential = GoogleAuthProvider.credentialFromResult(result);
        const idToken = credential?.idToken;
        if (!idToken) {
          throw new Error('Failed to get Google ID token after redirect.');
        }

        if (isDev) {
          console.log('[GoogleSignIn] Redirect succeeded for', result.user.email);
        }

        await exchangeTokenWithBackend(idToken);
      })
      .catch((err) => {
        if (isDev) {
          console.error('[GoogleSignIn] Redirect result error:', err);
        }
        setMessageType('error');
        setMessage(getErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  /* ───────────────────────────────────────────────
   * Main handler
   * ─────────────────────────────────────────────── */
  const handleGoogleSignIn = async () => {
    if (popupInProgress.current) return;
    popupInProgress.current = true;
    setLoading(true);
    setMessage('');
    setMessageType('info');

    try {
      // Attempt popup first
      await tryPopup();
    } catch (popupError) {
      if (isDev) {
        console.warn('[GoogleSignIn] Popup failed – will try redirect:', popupError.code);
      }

      /* ── Popup closed by user – benign, inform and stop ── */
      if (popupError.code === 'auth/popup-closed-by-user') {
        setMessageType('info');
        setMessage(FIREBASE_ERROR_MESSAGES['auth/popup-closed-by-user']);
        return;
      }

      /* ── Another popup already open – silent ── */
      if (popupError.code === 'auth/cancelled-popup-request') {
        return;
      }

      /* ── Popup blocked or domain not authorised – try redirect flow ── */
      if (
        popupError.code === 'auth/popup-blocked' ||
        popupError.code === 'auth/unauthorized-domain'
      ) {
        if (isDev) {
          console.log('[GoogleSignIn] Falling back to redirect flow');
        }
        setMessageType('info');
        setMessage('Redirecting to Google Sign-In…');

        try {
          await tryRedirect();
          // After this, the page navigates away – we won't reach the catch below
          // for sign-in errors. Redirect result is handled in the mount hook.
        } catch (redirectError) {
          setMessageType('error');
          setMessage(getErrorMessage(redirectError));
        }
        return;
      }

      /* ── Everything else ── */
      setMessageType('error');
      setMessage(getErrorMessage(popupError));
    } finally {
      popupInProgress.current = false;
      setLoading(false);
    }
  };

  return (
    <>
      <Toast
        message={message}
        type={
          messageType === 'success'
            ? 'success'
            : messageType === 'error'
              ? 'error'
              : 'info'
        }
      />

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-300" />
        <span className="text-sm text-gray-500 font-medium">or continue with</span>
        <div className="flex-1 h-px bg-gray-300" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 p-4 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium text-gray-700"
      >
        {loading ? (
          <>
            <span className="inline-block w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500">Signing in…</span>
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
          </>
        )}
      </button>
    </>
  );
}

