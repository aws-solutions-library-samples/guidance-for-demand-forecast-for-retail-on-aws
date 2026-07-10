// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import type { Metadata } from 'next';
import { AuthPanel } from '@/components/auth/AuthPanel';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your Retail Demand Forecast account',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
            <span className="font-display font-bold text-primary-foreground text-2xl">DF</span>
          </div>
          <h1 className="font-display text-3xl font-semibold bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent">
            Demand Forecasting
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to access your dashboard</p>
        </div>

        <div className="bg-card/50 backdrop-blur-lg border border-border/30 rounded-xl overflow-hidden">
          <AuthPanel />
        </div>
      </div>
    </div>
  );
}
