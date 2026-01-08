'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User, SignupData, AuthError, UseAuthReturn } from '@/types';

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

// Mock user for development
const MOCK_USER: User = {
  id: 'mock-user-123',
  email: 'demo@example.com',
  name: 'Demo User',
  groups: ['users'],
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
      import('aws-amplify').then(({ Amplify }) => {
        import('@/lib/aws-config').then(({ awsConfig }) => {
          Amplify.configure(awsConfig);
          setAmplifyReady(true);
        });
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
      setUser({
        id: currentUser.userId,
        email: currentUser.signInDetails?.loginId || '',
        name: currentUser.username,
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

  const handleSignIn = useCallback(async (email: string, password: string) => {
    if (MOCK_MODE) {
      setLoading(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setUser({ ...MOCK_USER, email });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { signIn } = await import('aws-amplify/auth');
      await signIn({ username: email, password });
      await checkAuthState();
    } catch (err) {
      const authError = err as AuthError;
      setError({ code: authError.code || 'UNKNOWN', message: authError.message });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [checkAuthState]);

  const handleSignUp = useCallback(async (data: SignupData) => {
    if (MOCK_MODE) {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { signUp } = await import('aws-amplify/auth');
      await signUp({
        username: data.email,
        password: data.password,
        options: { userAttributes: { name: data.name } },
      });
    } catch (err) {
      const authError = err as AuthError;
      setError({ code: authError.code || 'UNKNOWN', message: authError.message });
      throw err;
    } finally {
      setLoading(false);
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
