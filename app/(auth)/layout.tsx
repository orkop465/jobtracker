import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Fraunces, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import '@/styles/design/base.css';
import '@/styles/design/auth.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter-tight',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s · Maakavoda',
    default: 'Maakavoda',
  },
  description: 'Track your job applications with clarity.',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable}`}>
      {children}
    </div>
  );
}
