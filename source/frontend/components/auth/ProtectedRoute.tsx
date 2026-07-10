'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from './AuthProvider';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredGroups?: string[];
}

export function ProtectedRoute({ children, fallback, requiredGroups = [] }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuthContext();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Check group membership if required
  const hasRequiredGroups =
    requiredGroups.length === 0 || requiredGroups.some((group) => user?.groups.includes(group));

  if (loading) {
    return (
      fallback || (
        <div
          className="flex items-center justify-center min-h-[400px]"
          role="status"
          aria-live="polite"
        >
          <LoadingSpinner size="lg" label="Checking authentication..." />
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  if (!hasRequiredGroups) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="alert">
        <div className="text-center">
          <h2 className="text-2xl font-display font-semibold text-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
