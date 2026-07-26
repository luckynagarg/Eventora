import axios from 'axios';

const isDev = import.meta.env.DEV === true;

// ─── API Base URL ────────────────────────────────────────────────────────
// Development (Vite): Vite proxy rewrite (/api → localhost:5000). No CORS.
// Production (Vercel): Vercel serverless proxy rewrite (/api → Render backend). No CORS.
const DEFAULT_API_URL = '/api';
const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

if (isDev) {
  console.log(`[API Client] Resolved BASE_URL: ${API_BASE_URL} (default: ${DEFAULT_API_URL})`);
  if (import.meta.env.VITE_API_URL) {
    console.log(`[API Client] Using VITE_API_URL override: ${import.meta.env.VITE_API_URL}`);
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// ─── Public Routes (never trigger 401 logout) ────────────────────────────
// These endpoints don't require authentication. 401 responses from these
// are NOT auth failures — they should be ignored.
// Uses pathname-based matching with method awareness.
const PUBLIC_ROUTES = {
  // Always public regardless of HTTP method
  anyMethod: new Set([
    '/auth/login',
    '/auth/register',
    '/auth/google',
    '/health',
    '/categories',
    '/search',
  ]),
  // Only GET requests to these are public
  getOnly: new Set([
    '/events',
  ]),
  prefix: [
    '/events/featured',
    '/events/trending',
    '/events/upcoming',
    '/reviews/event/',
  ],
};

const isPublicRoute = (url, method = 'GET') => {
  if (!url) return false;
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    
    // Routes that are public regardless of method
    for (const route of PUBLIC_ROUTES.anyMethod) {
      if (pathname.startsWith(route)) return true;
    }
    
    // Routes that are public only for GET requests
    if (method === 'GET') {
      for (const route of PUBLIC_ROUTES.getOnly) {
        if (pathname === route || pathname.startsWith(route + '/')) {
          // Exclude protected subpaths like /events/my, /events/create
          if (pathname === '/events/my' || pathname.startsWith('/events/my/')) return false;
          if (pathname === '/events/create') return false;
          return true;
        }
      }
      for (const prefix of PUBLIC_ROUTES.prefix) {
        if (pathname.startsWith(prefix)) return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
};

// ─── Track 401 redirect state to avoid infinite loops ────────────────────
let isRedirectingToLogin = false;

// ─── Request Interceptor ───────────────────────────────────────────────────
// Automatically attaches the Bearer token (JWT from backend) to every request.
api.interceptors.request.use(
  (config) => {
    // Priority 1: JWT token from email/password or Google sign-in (backend JWT)
    const jwtToken = localStorage.getItem('token');

    // Priority 2: Firebase ID token (from Firebase onAuthStateChanged)
    const firebaseToken = localStorage.getItem('firebase_id_token');

    if (jwtToken) {
      config.headers.Authorization = `Bearer ${jwtToken}`;
    } else if (firebaseToken) {
      config.headers.Authorization = `Bearer ${firebaseToken}`;
    }

    if (isDev && config.headers.Authorization) {
      const preview = config.headers.Authorization.substring(0, 30) + '...';
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url} | Auth: ${preview}`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ─── Response Interceptor ──────────────────────────────────────────────────
// Handles 401 Unauthorized responses with retry logic.
// PUBLIC ROUTES: 401 responses are silently ignored (no logout).
// PROTECTED ROUTES: First attempt a token refresh, then retry the request.
//   Only log out if the retry also returns 401.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If there's no response or it's not a 401, reject immediately
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // ── PUBLIC ROUTES: Never log out on 401 ──────────────────────────
    const url = originalRequest?.url || '';
    const method = originalRequest?.method?.toUpperCase() || 'GET';
    if (isPublicRoute(url, method)) {
      if (isDev) {
        console.warn(
          `[API] 401 on public route ${url} – ignoring (no logout). ` +
          `This may indicate a server-side issue, not an auth problem.`
        );
      }
      // Reject the error so the caller can handle it, but don't clear auth
      return Promise.reject(error);
    }

    // ── Already redirecting? Block duplicate redirects ────────────────
    if (isRedirectingToLogin) {
      return Promise.reject(error);
    }

    // ── PROTECTED ROUTE 401: Attempt retry with token refresh ────────
    // Prevent infinite retry loops
    if (originalRequest._retry) {
      if (isDev) {
        console.warn(
          `[API] 401 on ${url} after retry – logging out.`
        );
      }
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isDev) {
      console.warn(
        `[API] 401 on ${url} – attempting token refresh and retry...`
      );
    }

    try {
      // Attempt to get a fresh Firebase ID token
      const { auth } = await import('../config/firebase.js');
      if (auth.currentUser) {
        const freshToken = await auth.currentUser.getIdToken(true);
        localStorage.setItem('firebase_id_token', freshToken);
        originalRequest.headers.Authorization = `Bearer ${freshToken}`;
      } else {
        // No Firebase user — try refreshing the backend JWT by calling /auth/profile
        // If that fails too, we'll retry and handle the 401 then
        const jwtToken = localStorage.getItem('token');
        if (jwtToken) {
          originalRequest.headers.Authorization = `Bearer ${jwtToken}`;
        }
      }

      // Retry the failed request with the refreshed token
      const retryResponse = await api(originalRequest);
      return retryResponse;
    } catch (retryError) {
      // Token refresh or retry also failed — now we log out
      if (isDev) {
        console.warn(
          `[API] Token refresh + retry failed for ${url} – logging out.`
        );
      }
      clearAuthAndRedirect();
      return Promise.reject(retryError);
    }
  }
);

/**
 * Clears auth state and redirects to login.
 * Uses a flag (isRedirectingToLogin) to prevent infinite redirect loops.
 * Uses window.location.href instead of React Router navigate to force a
 * full page reload, which re-initializes Firebase auth state cleanly.
 */
function clearAuthAndRedirect() {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;

  const currentPath = window.location.pathname;

  // Don't redirect if already on login/signup
  if (currentPath === '/login' || currentPath === '/signup') {
    isRedirectingToLogin = false;
    return;
  }

  if (isDev) {
    console.log(
      `%c[API] Clearing auth and redirecting to login...`,
      'color: #F44336; font-weight: bold;'
    );
  }

  // Clear both JWT and Firebase tokens
  localStorage.removeItem('token');
  localStorage.removeItem('firebase_id_token');
  localStorage.removeItem('user');

  // Also sign out from Firebase
  import('../config/firebase.js').then(({ auth }) => {
    auth.signOut().catch(() => {});
  });

  // Redirect to login after a brief delay so Firebase can process sign-out
  // Use replace: true so the user can't go back to the protected page
  setTimeout(() => {
    isRedirectingToLogin = false;
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
  }, 100);
}

export default api;

