import type { ReactNode } from 'react';
import Link from 'next/link';
import { AmbientPipeline } from './ambient-pipeline';
import { RotatingCaption } from './rotating-caption';

interface AuthShellProps {
  children: ReactNode;
}

/**
 * Split 60/40 layout for /login and /register.
 * Left panel = ambient pipeline + rotating caption (decorative, aria-hidden).
 * Right panel = form (the children).
 * Mobile: stacked, left panel becomes a 180px strip above the form.
 * See spec §7.1.
 */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col lg:flex-row">
      {/* Left panel */}
      <div
        className="lg:w-3/5 lg:min-h-screen flex flex-col items-center justify-center p-8 lg:p-16 min-h-[180px] border-b lg:border-b-0 lg:border-r border-[var(--color-line)]"
        aria-hidden="true"
      >
        <Link href="/" className="self-start flex items-center gap-2.5 mb-auto">
          <span
            className="w-2 h-2 rounded-full bg-[var(--color-ink)]"
            style={{ animation: 'live-dot 3s ease-in-out infinite' }}
          />
          <span className="font-mono text-[12px] tracking-[0.14em] uppercase font-semibold text-[var(--color-ink)]">
            MKVDATA
          </span>
        </Link>
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <AmbientPipeline />
          <RotatingCaption />
        </div>
      </div>

      {/* Right panel */}
      <div className="lg:w-2/5 bg-[var(--color-surface)] flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-[360px]">{children}</div>
      </div>
    </div>
  );
}
