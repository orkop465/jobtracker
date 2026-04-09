'use client';

import { useEffect, useState } from 'react';
import { ROTATING_CAPTIONS } from '@/lib/landing/constants';

export function RotatingCaption() {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return; // don't rotate in reduced motion
    }
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % ROTATING_CAPTIONS.length);
        setFading(false);
      }, 280);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-[420px] mt-8">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)] mb-1.5">
        Signal
      </div>
      <div
        className={[
          'font-mono text-[13px] text-[var(--color-ink)] min-h-[20px]',
          'transition-opacity duration-[280ms]',
          fading ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
        aria-live="polite"
      >
        {ROTATING_CAPTIONS[idx]}
      </div>
    </div>
  );
}
