import type { Metadata, Viewport } from 'next';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'InterviewAI — Practice with AI',
  description: 'Ace your next job interview with AI-powered practice sessions powered by Groq.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'InterviewAI',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className="bg-gray-50 text-gray-900 min-h-screen antialiased">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
