import { AuthTabs } from '@/components/auth/SimpleAuthForms';

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-950 to-blue-900">
      <div className="w-full max-w-md p-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">StudyCore Portal</h1>
          <p className="text-sky-200 mt-2">Access your personalized learning space</p>
        </div>
        <AuthTabs />
      </div>
    </div>
  );
}