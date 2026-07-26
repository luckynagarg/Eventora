import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase.js';

const isDev = import.meta.env.DEV === true;

/**
 * useFirebaseAuth Hook
 *
 * Provides reactive Firebase auth state to any component.
 * The underlying onAuthStateChanged listener is initialized only once
 * via initAuthListener() called from App.jsx.
 *
 * Returns:
 *   - user: Firebase User | null
 *   - idToken: string | null (Firebase ID token for API calls)
 *   - loading: boolean (true while initial auth state is resolving)
 *   - error: Error | null
 */
export function useFirebaseAuth() {
  const [state, setState] = useState({
    user: null,
    idToken: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // The singleton listener was registered in App.jsx via initAuthListener().
    // Here we subscribe to onAuthStateChanged to get reactive updates.
    // This is safe to use in multiple components because onAuthStateChanged
    // supports multiple subscribers without duplication.
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          try {
            const token = await user.getIdToken(true);
            if (isDev) {
              console.log(
                `%c[useFirebaseAuth] User: ${user.email}`,
                'color: #4CAF50; font-weight: bold;'
              );
            }
            setState({ user, idToken: token, loading: false, error: null });
          } catch (err) {
            console.error('[useFirebaseAuth] Token refresh error:', err);
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

  const refreshToken = useCallback(async () => {
    if (state.user) {
      try {
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

