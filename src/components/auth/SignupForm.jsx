import { useMemo, useState } from 'react';

import Toast from '../ui/Toast.jsx';
import { api } from '../../api/client.js';
import GoogleSignInButton from './GoogleSignInButton.jsx';

function validatePassword(password, confirmPassword) {
  if (password !== confirmPassword) return 'Passwords do not match';
  if (password.length < 6) return 'Password must be at least 6 characters long';
  return '';
}

export default function SignupForm({ initialRole = 'user' }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: initialRole,
  });

  const canSubmit = useMemo(() => {
    return Boolean(
      form.name.trim() &&
        form.username.trim() &&
        form.email.trim() &&
        form.password &&
        form.confirmPassword
    );
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('info');

    const validationError = validatePassword(form.password, form.confirmPassword);
    if (validationError) {
      setMessageType('error');
      setMessage(validationError);
      return;
    }

    if (!canSubmit) return;

    setLoading(true);
    try {
      // OTP removed: create account immediately.
      const payload = {
        name: form.name,
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role,
      };

      // backend supports /auth/register
      await api.post('/auth/register', payload);

      setMessageType('success');
      setMessage('Account created successfully! Redirecting...');

      setTimeout(() => {
        window.location.href = '/login';
      }, 1200);
    } catch (err) {
      setMessageType('error');
      setMessage(err.response?.data?.error || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <Toast message={message} type={messageType === 'success' ? 'success' : messageType === 'error' ? 'error' : 'info'} />

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Full Name"
          className="w-full p-4 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <input
          type="text"
          value={form.username}
          onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
          placeholder="Username"
          className="w-full p-4 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="Email"
          className="w-full p-4 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          placeholder="Password"
          className="w-full p-4 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <input
          type="password"
          value={form.confirmPassword}
          onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
          placeholder="Confirm Password"
          className="w-full p-4 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <select
          value={form.role}
          onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
          className="w-full p-4 mb-6 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="user">User</option>
          <option value="organizer">Event Organizer</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="w-full p-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-300"
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
      <GoogleSignInButton mode="signup" />
    </>
  );
}

