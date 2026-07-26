import axios from 'axios';

const isDev = import.meta.env.DEV === true;

// ─── API Base URL ────────────────────────────────────────────────────────
// Production (Vercel): Uses VITE_API_URL env var. If unset, defaults to Render backend.
// Development (Vite): Uses Vite proxy (/api → localhost:5000) when VITE_API_URL is unset.
//
// The production fallback ensures that even if VITE_API_URL is accidentally
// omitted from Vercel environment variables, API calls still go to Render
// instead of being rewritten to index.html by vercel.json.
const PRODUCTION_API_URL = 'https://eventora-backend-lyfi.onrender.com/api';
const DEV_API_URL = '/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || (isDev ? DEV_API_URL : PRODUCTION_API_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// ─── Request Interceptor ───────────────────────────────────────────────────
// Automatically attaches the Bearer token (JWT from backend) to every request.
// Also supports Firebase ID token for protected routes if needed.
api.interceptors.request.use(
  (config) => {
    // Priority 1: JWT token from email/password or Google sign-in (backend JWT)
    const jwtToken = localStorage.getItem('token');

    // Priority 2: Firebase ID token (from Firebase onAuthStateChanged)
    const firebaseToken = localStorage.getItem('firebase_id_token');

    // Use JWT by default (backend issues this for all auth flows)
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
// Handles 401 Unauthorized responses gracefully.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentToken = localStorage.getItem('token');

      if (isDev) {
        console.warn(
          `[API] 401 Unauthorized on ${error.config?.url}. ` +
          `Token present: ${Boolean(currentToken)}. ` +
          (currentToken ? 'Token may be expired or invalid.' : 'No token found.')
        );
      }

      // Only clear auth if we have a token (avoids redirect loops on public routes)
      if (currentToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Redirect to login, preserving the current path for redirect after login
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/signup') {
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
    }

    // If the error has a Firebase auth code from a failed popup, let it propagate
    return Promise.reject(error);
  }
);

export default api;

