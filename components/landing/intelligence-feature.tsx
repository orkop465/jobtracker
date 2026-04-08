'use client';

import type { ReactNode } from 'react';
import { useInView } from '@/lib/motion/use-in-view';

interface IntelligenceFeatureProps {
  headline: string;
  caption: string;
  viz: ReactNode;
  reverse?: boolean;
}

export function IntelligenceFeature({ headline, caption, viz, reverse }: IntelligenceFeatureProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.25 });

  return (
    <div
      ref={ref}
      className={[
        'grid grid-cols-1 lg:grid-cols-3 gap-12 items-center py-16',
        reverse && 'lg:[&>div:first-child]:order-2',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div>
        <h3 className="text-[28px] leading-[1.2] font-semibold tracking-[-0.015em] text-[var(--color-ink)] mb-3">
          {headline}
        </h3>
        <p className="text-[14px] leading-[1.55] text-[var(--color-ink-muted)]">{caption}</p>
      </div>
      <div
        className={[
          'lg:col-span-2 bg-white border border-[var(--color-line)] rounded-md p-8 min-h-[200px]',
          'transition-opacity duration-[640ms]',
          inView ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {viz}
      </div>
    </div>
  );
}
