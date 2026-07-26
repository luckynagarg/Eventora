import { Link } from 'react-router-dom';

export default function AuthLayout({ title, children, mode = 'login' }) {
  const isLoginPage = mode === 'login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 p-4">
      <img
        className="fixed inset-0 w-full h-full object-cover blur-sm brightness-50"
        src="/WhatsApp Image 2025-12-04 at 11.13.41_ee34a9d7.jpg"
        alt=""
      />

      <div className="login-box bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">{title}</h1>
        {children}

        {isLoginPage ? (
          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-blue-500 hover:text-blue-600 font-semibold">
              Sign up
            </Link>
          </p>
        ) : (
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-500 hover:text-blue-600 font-semibold">
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

