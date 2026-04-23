import type { Metadata } from 'next';
import { Fraunces, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import '@/styles/design/landing.css';
import '@/styles/design/sections.css';
import '@/styles/design/base.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz'],
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
  title: 'Maakavoda \u2014 Track your job search like a pro',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontVarClasses = `${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable}`;

  return (
    <div className={fontVarClasses}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              --display: var(--font-fraunces), 'Iowan Old Style', Georgia, serif;
              --sans: var(--font-inter-tight), system-ui, -apple-system, sans-serif;
              --mono: var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
            }
          `,
        }}
      />
      {children}
    </div>
  );
}
