'use client';

import type { ReactNode } from 'react';
import { useInView } from '@/lib/motion/use-in-view';

interface HowItWorksSlideProps {
  number: string;
  headline: string;
  sub: string;
  visual: ReactNode;
}

export function HowItWorksSlide({ number, headline, sub, visual }: HowItWorksSlideProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });

  return (
    <div
      ref={ref}
      className="min-h-[80vh] flex items-center justify-center relative px-8 py-16"
    >
      {/* Number — far left */}
      <div
        className={[
          'absolute left-8 top-8 font-mono text-[clamp(80px,14vw,160px)] leading-none font-semibold',
          'text-[var(--color-ink-muted)] opacity-[0.35]',
          'transition-[opacity,transform] duration-[640ms]',
          inView ? 'translate-x-0' : '-translate-x-6',
        ].join(' ')}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {number}
      </div>

      {/* Visual — far right */}
      <div
        className={[
          'absolute right-8 bottom-8 w-[260px] max-w-[30vw]',
          'transition-opacity duration-[280ms] delay-[480ms]',
          inView ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        {visual}
      </div>

      {/* Headline + sub — centered */}
      <div className="max-w-[900px] text-center z-10">
        <h3
          className={[
            'text-[clamp(48px,7vw,96px)] leading-[1.02] font-semibold tracking-[-0.03em] text-[var(--color-canvas)]',
            'transition-[opacity,transform] duration-[640ms] delay-[120ms]',
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
          ].join(' ')}
          style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          {headline}
        </h3>
        <p
          className={[
            'mt-6 text-[18px] text-[var(--color-ink-muted)] max-w-[520px] mx-auto',
            'transition-opacity duration-[280ms] delay-[360ms]',
            inView ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          {sub}
        </p>
      </div>
    </div>
  );
}
