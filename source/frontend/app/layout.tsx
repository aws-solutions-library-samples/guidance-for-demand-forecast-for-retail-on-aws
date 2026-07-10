// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import type { Metadata, Viewport } from 'next';
import { inter, poppins, jetbrainsMono } from './fonts';
import { AuthProvider } from '@/components/auth/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Demand Forecasting',
    template: '%s | Demand Forecasting',
  },
  description: 'AWS-powered demand forecasting for retail inventory management',
  keywords: ['demand forecast', 'retail', 'inventory', 'AWS', 'SageMaker'],
  authors: [{ name: 'AWS Solutions' }],
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1120' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
