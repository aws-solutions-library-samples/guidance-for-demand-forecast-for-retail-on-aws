'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

type Mode = 'login' | 'signup';

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>('login');

  return mode === 'login' ? (
    <LoginForm onSwitchToSignup={() => setMode('signup')} />
  ) : (
    <SignupForm onSwitchToLogin={() => setMode('login')} />
  );
}
