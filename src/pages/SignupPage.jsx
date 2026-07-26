import AuthLayout from '../components/auth/AuthLayout.jsx';
import SignupForm from '../components/auth/SignupForm.jsx';

export default function SignupPage() {
  return (
    <AuthLayout title="Sign Up" mode="signup">
      <SignupForm />
    </AuthLayout>
  );
}

