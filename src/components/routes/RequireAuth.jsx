import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * RequireAuth - Protected-route guard.
 *
 * Guards a route by:
 *  1. Displaying a loading indicator while auth is being resolved.
 *  2. Checking for a valid JWT (email/password flow) OR a Firebase
 *     ID token (Google sign-in flow) in localStorage.
 *  3. Only redirecting to /login after auth has been fully resolved.
 *
 * Without the two-phase check (immediate + delayed) the guard could
 * fire before the Firebase bootstrap in main.jsx has written the
 * Firebase ID token to localStorage, causing a false negative.
 */
export default function RequireAuth({ children }) {
  const [state, setState] = useState({
    resolving: true,
    authenticated: false,
  });

  useEffect(() => {
    const hasToken = () =>
      Boolean(
        localStorage.getItem('token') ||
          localStorage.getItem('firebase_id_token'),
      );

    if (hasToken()) {
      setState({ resolving: false, authenticated: true });
      return;
    }

    /*
     * Token not found immediately - Firebase may still be resolving
     * a persisted session.  Wait a short while then re-check.
     */
    const timer = setTimeout(() => {
      setState({ resolving: false, authenticated: hasToken() });
    }, 120);

    return () => clearTimeout(timer);
  }, []);

  /* Loading state */
  if (state.resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-base">Verifying session...</span>
        </div>
        </div>
    );
  }

  /* Unauthenticated */
  if (!state.authenticated) {
    return <Navigate to="/login" replace />;
  }

  /* Authenticated */
  return children;
}
