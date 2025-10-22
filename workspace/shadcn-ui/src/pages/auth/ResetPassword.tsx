import { SimpleResetPasswordForm } from '@/components/auth/SimpleResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-950 to-blue-900">
      <div className="w-full max-w-md p-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Reset Password</h1>
          <p className="text-sky-200 mt-2">Enter your email to receive a password reset link</p>
        </div>
        <SimpleResetPasswordForm />
      </div>
    </div>
  );
}