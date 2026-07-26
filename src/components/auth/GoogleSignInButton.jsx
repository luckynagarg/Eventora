import { useState, useRef } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase.js';
import { api } from '../../api/client.js';
import { useNavigate } from 'react-router-dom';
import Toast from '../ui/Toast.jsx';

const isDev = import.meta.env.DEV === true;

/**
 * Maps Firebase auth error codes to user-friendly messages.
 */
const FIREBASE_ERROR_MESSAGES = {
  'auth/unauthorized-domain':
    'This domain is not authorized for Google Sign-In. Please contact the site administrator and reference: "Add this domain to Firebase Console → Authentication → Settings → Authorized domains."',
  'auth/popup-blocked':
    'Popup was blocked by your browser. Please allow popups for this site and try again, or use a different sign-in method.',
  'auth/popup-closed-by-user':
    'Sign-in popup was closed before completing the login. Please try again.',
  'auth/cancelled-popup-request':
    'Another sign-in popup is already open. Please close it and try again.',
  'auth/network-request-failed':
    'Network error. Please check your internet connection and try again.',
  'auth/too-many-requests':
    'Too many sign-in attempts. Please wait a few minutes before trying again.',
  'auth/user-disabled':
    'This account has been disabled. Please contact support.',
  'auth/account-exists-with-different-credential':
    'An account already exists with the same email address but different sign-in method. Try signing in with email/password.',
};

/**
 * GoogleSignInButton Component
 *
 * Handles Google OAuth sign-in/sign-up with:
 *  - Popup-based authentication via Firebase
 *  - Backend token verification and user creation
 *  - Graceful error handling for all Firebase auth error codes
 *  - Retry logic (1 retry on failure)
 *  - Race condition prevention (lock on popup)
 */
export default function GoogleSignInButton({ mode = 'signup' }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const navigate = useNavigate();

  // Ref to track popup state and prevent concurrent popups
  const popupInProgress = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 1;

  // ─── Debug logging ────────────────────────────────────────────────────
  const log = (event, data = {}) => {
    if (isDev) {
      console.log(
        `%c[GoogleSignIn] ${event}`,
        'color: #4285F4; font-weight: bold;',
        data
      );
    }
  };

  const logError = (event, error) => {
    if (isDev) {
      console.error(
        `%c[GoogleSignIn] ${event}`,
        'color: #DB4437; font-weight: bold;',
        {
          code: error.code,
          message: error.message,
          ...error,
        }
      );
    }
  };

  // ─── Error message resolver ───────────────────────────────────────────
  const getErrorMessage = (error) => {
    if (error.code && FIREBASE_ERROR_MESSAGES[error.code]) {
      return FIREBASE_ERROR_MESSAGES[error.code];
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    return error.message || 'Google sign-in failed. Please try again.';
  };

  // ─── Main handler ─────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    if (popupInProgress.current) {
      log('Blocked duplicate popup attempt');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('info');

    popupInProgress.current = true;
    log('Popup launch', { mode, origin: window.location.origin });

    try {
      // ── Step 1: Open Google sign-in popup ──────────────────────────
      const result = await signInWithPopup(auth, googleProvider);
      log('Popup success', { user: result.user.email });

      retryCount.current = 0;

      // ── Step 2: Extract the Google ID token ────────────────────────
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const idToken = credential?.idToken;

      if (!idToken) {
        throw new Error('Failed to get Google ID token from credential response.');
      }
      log('ID token extracted', { length: idToken.length });

      // ── Step 3: Send token to backend for verification ─────────────
      const response = await api.post('/auth/google', { idToken });
      log('Backend verification successful', { userId: response.data.user?.id });

      // ── Step 4: Store auth data ────────────────────────────────────
      // Store both the backend JWT (for API calls) and Firebase ID token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Also ensure firebase_id_token is set for RequireAuth compatibility
      try {
        const firebaseToken = await result.user.getIdToken(false);
        localStorage.setItem('firebase_id_token', firebaseToken);
      } catch (e) {
        // Non-critical – RequireAuth checks both tokens
      }

      // ── Step 5: Notify user and redirect ───────────────────────────
      setMessageType('success');
      setMessage(
        mode === 'login'
          ? 'Logged in successfully! Redirecting...'
          : 'Account created successfully! Redirecting...'
      );

      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (error) {
      logError('Popup failure', error);

      // ── Step 6: Handle specific Firebase errors ────────────────────
      if (error.code === 'auth/popup-closed-by-user') {
        setMessageType('info');
        setMessage(FIREBASE_ERROR_MESSAGES['auth/popup-closed-by-user']);
        return;
      }

      if (error.code === 'auth/cancelled-popup-request') {
        return;
      }

      if (error.code === 'auth/unauthorized-domain') {
        setMessageType('error');
        setMessage(FIREBASE_ERROR_MESSAGES['auth/unauthorized-domain']);
        return;
      }

      if (error.code === 'auth/popup-blocked') {
        setMessageType('error');
        setMessage(FIREBASE_ERROR_MESSAGES['auth/popup-blocked']);
        return;
      }

      if (error.code === 'auth/network-request-failed' && retryCount.current < MAX_RETRIES) {
        retryCount.current += 1;
        log(`Retry attempt ${retryCount.current}/${MAX_RETRIES}`);

        setMessageType('info');
        setMessage(`Network error. Retrying (${retryCount.current}/${MAX_RETRIES})...`);

        await new Promise((resolve) => setTimeout(resolve, 1000));
        popupInProgress.current = false;
        setLoading(false);
        return handleGoogleSignIn();
      }

      if (error.code === 'auth/too-many-requests') {
        setMessageType('error');
        setMessage(FIREBASE_ERROR_MESSAGES['auth/too-many-requests']);
        return;
      }

      if (error.code && FIREBASE_ERROR_MESSAGES[error.code]) {
        setMessageType('error');
        setMessage(FIREBASE_ERROR_MESSAGES[error.code]);
        return;
      }

      setMessageType('error');
      setMessage(getErrorMessage(error));
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
        disabled={loading || popupInProgress.current}
        className="w-full flex items-center justify-center gap-3 p-4 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium text-gray-700"
      >
        {loading ? (
          <>
            <span className="inline-block w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500">Signing in...</span>
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
