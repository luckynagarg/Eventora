import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase.js';

const isDev = import.meta.env.DEV === true;

/**
 * useFirebaseAuth Hook
 *
 * Provides reactive Firebase auth state to any component.
 * The global onAuthStateChanged listener is registered once in main.jsx,
 * but this hook also subscribes individually (Firebase supports multiple
 * subscribers without duplication).
 *
 * IMPORTANT: This hook uses getIdToken(false) instead of getIdToken(true)
 * to avoid unnecessary forced token refreshes on every auth state change.
 * Force refresh (true) should only be used when explicitly needed (e.g.,
 * after 401 retry).
 *
 * Returns:
 *   - user: Firebase User | null
 *   - idToken: string | null (Firebase ID token for API calls)
 *   - loading: boolean (true while initial auth state is resolving)
 *   - error: Error | null
 *   - isAuthenticated: boolean
 *   - refreshToken: () => Promise<string|null>
 */
export function useFirebaseAuth() {
  const [state, setState] = useState({
    user: null,
    idToken: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          try {
            // Use getIdToken(false) to avoid forced refresh on every auth change.
            // The token is refreshed automatically by Firebase when close to expiry.
            const token = await user.getIdToken(false);
            if (isDev) {
              console.log(
                `%c[useFirebaseAuth] User: ${user.email}`,
                'color: #4CAF50; font-weight: bold;'
              );
            }
            setState({ user, idToken: token, loading: false, error: null });
          } catch (err) {
            console.error('[useFirebaseAuth] Token retrieval error:', err);
            setState({ user: null, idToken: null, loading: false, error: err });
          }
        } else {
          if (isDev) {
            console.log(
              `%c[useFirebaseAuth] No user`,
              'color: #9E9E9E; font-weight: bold;'
            );
          }
          setState({ user: null, idToken: null, loading: false, error: null });
        }
      },
      (error) => {
        console.error('[useFirebaseAuth] Auth state error:', error);
        setState((prev) => ({ ...prev, loading: false, error }));
      }
    );

    return () => unsubscribe();
  }, []);

  /**
   * Explicitly force-refresh the Firebase ID token.
   * Use this after a 401 retry attempt to get a fresh token.
   */
  const refreshToken = useCallback(async () => {
    if (state.user) {
      try {
        // Force refresh here because the user explicitly requested it
        // (typically after a 401 response)
        const token = await state.user.getIdToken(true);
        setState((prev) => ({ ...prev, idToken: token }));
        return token;
      } catch (err) {
        console.error('[useFirebaseAuth] Token refresh failed:', err);
        return null;
      }
    }
    return null;
  }, [state.user]);

  return {
    user: state.user,
    idToken: state.idToken,
    loading: state.loading,
    error: state.error,
    refreshToken,
    isAuthenticated: !!state.user,
  };
}

export default useFirebaseAuth;

