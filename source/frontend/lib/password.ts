// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Mirrors the password policy configured on the Cognito user pool
 * (see deployment/cdk/lib/stacks/auth-stack.ts): at least 8 characters, with a
 * lowercase letter, an uppercase letter and a digit. Symbols are allowed but
 * not required.
 *
 * Validating client-side keeps Cognito's raw InvalidPasswordException from
 * surfacing as an opaque error banner, and reports the specific rule instead.
 */
export const PASSWORD_HINT = 'Use 8+ characters with upper and lower case letters and a number.';

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must include a number';
  return undefined;
}
