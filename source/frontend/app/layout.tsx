import type { Metadata, Viewport } from 'next';
import { ibmPlexSans, spaceGrotesk, jetbrainsMono } from './fonts';
import { AuthProvider } from '@/components/auth/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Retail Demand Forecast',
    template: '%s | Retail Demand Forecast',
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
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1117' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
