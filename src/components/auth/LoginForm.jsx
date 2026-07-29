import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import Toast from '../ui/Toast.jsx';
import GoogleSignInButton from './GoogleSignInButton.jsx';


export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    // Client-side validation for empty fields
    if (!email.trim() || !password.trim()) {
      setMessage('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });

      // Store JWT token from backend
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Also store in firebase_id_token for compatibility with RequireAuth
      // (this ensures RequireAuth sees the user as authenticated even without Firebase)
      // Note: This is a JWT, not a Firebase ID token, but it serves the same purpose
      // for the auth guard check.

      setMessage('Login successful! Redirecting...');

      // Check if there's a redirect parameter in the URL
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect') || '/dashboard';

      setTimeout(() => navigate(redirectTo), 1000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast message={message} type={message.includes('successful') ? 'success' : 'error'} />

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email or Username"
          className="w-full p-4 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-4 mb-6 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full p-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-300"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <GoogleSignInButton mode="login" />

      <p className="mt-6 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link to="/signup" className="text-blue-500 hover:text-blue-600 font-semibold">
          Sign up
        </Link>
      </p>
    </>
  );
}

