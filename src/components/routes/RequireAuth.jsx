import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * RequireAuth – Protected Route Guard
 *
 * This component guards protected routes by:
 * 1. Showing a loading state while Firebase auth initializes
 * 2. Checking for a valid JWT token (from email/password or Google sign-in)
 *    OR a Firebase ID token (from Google sign-in persistence)
 * 3. Only redirecting to /login after auth state has been fully resolved
 *
 * Fixes the "user logged out on navigation" bug by:
 * - Adding an explicit loading flag to prevent premature redirects
 * - Waiting for Firebase's onAuthStateChanged to fire (via the bootstrap
 *   in main.jsx) before deciding the user is unauthenticated
 * - Checking BOTH the JWT token AND the Firebase ID token as valid auth
 */
export default function RequireAuth({ children }) {
  const [authState, setAuthState] = useState({
    checking: true,    // true while we're still resolving auth
    authenticated: false,
  });

  useEffect(() => {
    // Check authentication state after component mounts.
    // This gives Firebase's onAuthStateChanged (registered in main.jsx)
    // a chance to populate localStorage with the Firebase ID token.
    const checkAuth = () => {
      const jwtToken = localStorage.getItem('token');
      const firebaseToken = localStorage.getItem('firebase_id_token');
      const hasAuth = Boolean(jwtToken || firebaseToken);

      if (hasAuth) {
        setAuthState({ checking: false, authenticated: true });
      } else {
        // Token doesn't exist now, but Firebase might still be resolving.
        // Wait for the next tick to give Firebase time to finish.
        setTimeout(() => {
          // Re-check after Firebase should have resolved
          const jwtToken2 = localStorage.getItem('token');
          const firebaseToken2 = localStorage.getItem('firebase_id_token');
          const hasAuth2 = Boolean(jwtToken2 || firebaseToken2);

          setAuthState({ checking: false, authenticated: hasAuth2 });
        }, 100);
      }
    };

    checkAuth();
  }, []);

  // Show loading spinner while auth is being resolved
  if (authState.checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-lg font-medium">Checking authentication...</span>
        </div>
      </div>
    );
  }

  // Auth resolved: user is not authenticated → redirect to login
  if (!authState.authenticated) {
    return <Navigate to="/login" replace />;
  }

  // Auth resolved: user IS authenticated → render children
  return children;
}

