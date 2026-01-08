import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your Retail Demand Forecast account',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="font-display font-bold text-primary-foreground text-2xl">RF</span>
          </div>
          <h1 className="font-display text-3xl font-semibold">Retail Forecast</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to access your dashboard
          </p>
        </div>

        {/* Login Form */}
        <LoginForm />
      </div>
    </div>
  );
}
