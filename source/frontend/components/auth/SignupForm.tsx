'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState } from 'react';
import { useAuthContext } from './AuthProvider';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  User as UserIcon,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { validatePassword, PASSWORD_HINT } from '@/lib/password';
import type { AuthError } from '@/types';

interface SignupFormProps {
  onSwitchToLogin?: () => void;
}

interface FormState {
  name: string;
  email: string;
  password: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  code?: string;
  general?: string;
}

type Phase = 'register' | 'confirm' | 'done';

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const { signUp, confirmSignUp, resendSignUpCode, loading } = useAuthContext();
  const [phase, setPhase] = useState<Phase>('register');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormState>({ name: '', email: '', password: '' });
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const formLoading = isLoading || loading;

  const validateRegister = (): boolean => {
    const next: FormErrors = {};
    if (!formData.name) next.name = 'Name is required';
    if (!formData.email) {
      next.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      next.email = 'Please enter a valid email';
    }
    const passwordError = validatePassword(formData.password);
    if (passwordError) next.password = passwordError;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) return;
    setIsLoading(true);
    setErrors({});
    try {
      const { isConfirmed } = await signUp(formData);
      setPhase(isConfirmed ? 'done' : 'confirm');
    } catch (error) {
      const authError = error as AuthError;
      setErrors({ general: authError.message || 'Sign up failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setErrors({ code: 'Verification code is required' });
      return;
    }
    setIsLoading(true);
    setErrors({});
    try {
      await confirmSignUp(formData.email, code.trim());
      setPhase('done');
    } catch (error) {
      const authError = error as AuthError;
      setErrors({ general: authError.message || 'Could not verify the code. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setErrors({});
    try {
      await resendSignUpCode(formData.email);
    } catch (error) {
      const authError = error as AuthError;
      setErrors({ general: authError.message || 'Could not resend the code.' });
    }
  };

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (phase === 'done') {
    return (
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-center">Account created</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
          <p className="text-sm text-muted-foreground">
            Your account is ready. You can now sign in with your email and password.
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={onSwitchToLogin}>
            Go to Sign In
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (phase === 'confirm') {
    return (
      <Card className="animate-fade-in-up">
        <form onSubmit={handleConfirm} noValidate>
          <CardHeader>
            <CardTitle className="font-display text-2xl text-center">Verify your email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              We sent a verification code to <span className="font-medium">{formData.email}</span>.
            </p>
            {errors.general && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm font-medium">
                Verification code
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="code"
                  inputMode="numeric"
                  placeholder="123456"
                  className={`pl-10 ${errors.code ? 'border-destructive' : ''}`}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={formLoading}
                  autoComplete="one-time-code"
                />
              </div>
              {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={formLoading} aria-busy={formLoading}>
              {formLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify and continue'
              )}
            </Button>
            <button
              type="button"
              onClick={handleResend}
              className="text-sm font-medium text-primary hover:underline"
              disabled={formLoading}
            >
              Resend code
            </button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in-up">
      <form onSubmit={handleRegister} noValidate>
        <CardHeader>
          <CardTitle className="font-display text-2xl text-center">Create account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.general && (
            <Alert variant="destructive" className="animate-fade-in">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name
            </Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                className={`pl-10 ${errors.name ? 'border-destructive' : ''}`}
                value={formData.name}
                onChange={handleChange('name')}
                disabled={formLoading}
                autoComplete="name"
              />
            </div>
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-email"
                type="email"
                placeholder="you@company.com"
                className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                value={formData.email}
                onChange={handleChange('email')}
                disabled={formLoading}
                autoComplete="email"
              />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-password"
                type="password"
                placeholder="At least 8 characters"
                className={`pl-10 ${errors.password ? 'border-destructive' : ''}`}
                value={formData.password}
                onChange={handleChange('password')}
                disabled={formLoading}
                autoComplete="new-password"
              />
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full" disabled={formLoading} aria-busy={formLoading}>
            {formLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>
          {onSwitchToLogin && (
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-medium text-primary hover:underline"
                disabled={formLoading}
              >
                Sign in
              </button>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
