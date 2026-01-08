'use client';

import { useContext, createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { awsConfig } from '@/lib/aws-config';
import type { User, SignupData, AuthError, UseAuthReturn } from '@/types';

// Initialize Amplify
if (typeof window !== 'undefined') {
  Amplify.configure(awsConfig);
}

type AuthContextValue = UseAuthReturn;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProviderImpl({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  const checkAuthState = useCallback(async () => {
    try {
      setLoading(true);
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
  }, []);

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
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
    setLoading(true);
    setError(null);
    try {
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
    setLoading(true);
    try {
      await signOut();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
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

export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
