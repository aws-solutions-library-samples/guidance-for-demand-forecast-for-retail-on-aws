'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RegenerateForecasts } from '@/components/admin/RegenerateForecasts';

function AdminContent() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage forecasting pipeline and model operations
          </p>
        </div>

        <div className="space-y-6">
          <RegenerateForecasts />
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute requiredGroups={['Admin']}>
      <AdminContent />
    </ProtectedRoute>
  );
}
