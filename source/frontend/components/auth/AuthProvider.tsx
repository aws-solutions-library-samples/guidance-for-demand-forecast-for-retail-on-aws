'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User, SignupData, AuthError, UseAuthReturn } from '@/types';

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

// Mock user for development
const MOCK_USER: User = {
  id: 'mock-user-123',
  email: 'demo@example.com',
  name: 'Demo User',
  groups: ['users', 'Admin'],
};

type AuthContextValue = UseAuthReturn;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [amplifyReady, setAmplifyReady] = useState(false);

  // Initialize Amplify only in non-mock mode
  useEffect(() => {
    if (!MOCK_MODE && typeof window !== 'undefined') {
      import('aws-amplify')
        .then(({ Amplify }) => {
          import('@/lib/aws-config')
            .then(({ awsConfig }) => {
              Amplify.configure(awsConfig);
              setAmplifyReady(true);
            })
            .catch(() => {
              setLoading(false);
            });
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, []);

  const checkAuthState = useCallback(async () => {
    if (MOCK_MODE) {
      // In mock mode, auto-login with mock user
      setUser(MOCK_USER);
      setLoading(false);
      return;
    }

    if (!amplifyReady) return;

    try {
      setLoading(true);
      const { getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const tokenPayload = session.tokens?.idToken?.payload;
      const email = currentUser.signInDetails?.loginId || (tokenPayload?.email as string) || '';
      const displayName = (tokenPayload?.name as string) || email.split('@')[0] || '';
      setUser({
        id: currentUser.userId,
        email: email,
        name: displayName,
        groups: (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) || [],
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [amplifyReady]);

  useEffect(() => {
    if (MOCK_MODE) {
      // Simulate brief loading then auto-login
      const timer = setTimeout(() => {
        setUser(MOCK_USER);
        setLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    } else if (amplifyReady) {
      checkAuthState();
    }
  }, [amplifyReady, checkAuthState]);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      if (MOCK_MODE) {
        setLoading(true);
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        setUser({ ...MOCK_USER, email });
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { signIn, signOut } = await import('aws-amplify/auth');

        // Clear any existing session first to avoid conflicts
        try {
          await signOut();
        } catch {
          // Ignore errors from signOut - user might not be signed in
        }

        const result = await signIn({ username: email, password });

        console.log('Sign in result:', result);

        // Handle different sign-in states
        const nextStep = result.nextStep?.signInStep;
        if (nextStep === 'CONFIRM_SIGN_UP') {
          throw {
            code: 'UserNotConfirmedException',
            message: 'Please verify your email address first.',
          };
        }
        if (nextStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          throw {
            code: 'NewPasswordRequired',
            message: 'You must set a new password. Please contact an administrator.',
          };
        }
        if (nextStep === 'DONE' || result.isSignedIn) {
          await checkAuthState();
        }
      } catch (err: unknown) {
        console.error('Sign in error:', err);

        // Extract error details
        const error = err as { name?: string; code?: string; message?: string };
        const errorCode = error.name || error.code || 'UNKNOWN';
        let errorMessage = error.message || 'Authentication failed';

        // Provide user-friendly messages for common errors
        if (errorCode === 'NotAuthorizedException') {
          errorMessage = 'Incorrect username or password.';
        } else if (errorCode === 'UserNotFoundException') {
          errorMessage = 'User does not exist.';
        } else if (errorCode === 'UserNotConfirmedException') {
          errorMessage = 'Please verify your email address first.';
        }

        setError({ code: errorCode, message: errorMessage });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [checkAuthState],
  );

  const handleSignUp = useCallback(async (data: SignupData): Promise<{ isConfirmed: boolean }> => {
    if (MOCK_MODE) {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setLoading(false);
      return { isConfirmed: false };
    }

    setLoading(true);
    setError(null);
    try {
      const { signUp } = await import('aws-amplify/auth');
      const result = await signUp({
        username: data.email,
        password: data.password,
        options: { userAttributes: { name: data.name, email: data.email } },
      });
      return { isConfirmed: result.isSignUpComplete };
    } catch (err) {
      const authError = err as AuthError;
      setError({ code: authError.code || 'UNKNOWN', message: authError.message });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmSignUp = useCallback(async (email: string, code: string) => {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { confirmSignUp: amplifyConfirmSignUp } = await import('aws-amplify/auth');
      await amplifyConfirmSignUp({ username: email, confirmationCode: code });
    } catch (err) {
      const error = err as { name?: string; code?: string; message?: string };
      setError({
        code: error.name || error.code || 'UNKNOWN',
        message: error.message || 'Confirmation failed',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resendSignUpCode = useCallback(async (email: string) => {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }

    setError(null);
    try {
      const { resendSignUpCode: amplifyResend } = await import('aws-amplify/auth');
      await amplifyResend({ username: email });
    } catch (err) {
      const error = err as { name?: string; code?: string; message?: string };
      setError({
        code: error.name || error.code || 'UNKNOWN',
        message: error.message || 'Could not resend code',
      });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    if (MOCK_MODE) {
      setUser(null);
      return;
    }

    setLoading(true);
    try {
      const { signOut } = await import('aws-amplify/auth');
      await signOut();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (MOCK_MODE) {
      return 'mock-access-token-123';
    }

    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    confirmSignUp,
    resendSignUpCode,
    logout,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
