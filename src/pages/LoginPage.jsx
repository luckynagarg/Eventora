import AuthLayout from '../components/auth/AuthLayout.jsx';
import LoginForm from '../components/auth/LoginForm.jsx';

export default function LoginPage() {
  return (
    <AuthLayout title="Log In" mode="login">
      <LoginForm />
    </AuthLayout>
  );
}

