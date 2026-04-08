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
      className="min-h-[80vh] flex items-center relative px-6 sm:px-10 py-16"
    >
      {/* Giant number watermark — top-left, static. No translate animation
          (the previous version shifted right on scroll-in which read as a
          stuttering re-layout). Opacity is constant so it reads as a
          permanent decorative layer. */}
      <div
        aria-hidden
        className="absolute left-6 sm:left-10 top-6 sm:top-10 font-mono text-[clamp(80px,14vw,160px)] leading-none font-semibold text-[var(--color-ink-muted)] opacity-[0.35] pointer-events-none select-none"
      >
        {number}
      </div>

      {/* Content grid — headline on the left, visual on the right at the
          same vertical center. On mobile it stacks (headline + sub first,
          visual below). */}
      <div className="max-w-[1160px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 lg:gap-16 items-center relative z-10">
        <div>
          <h3
            className={[
              'text-[clamp(40px,6vw,80px)] leading-[1.05] font-semibold tracking-[-0.03em] text-[var(--color-canvas)]',
              'transition-[opacity,transform] duration-[640ms]',
              inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
            ].join(' ')}
            style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
          >
            {headline}
          </h3>
          <p
            className={[
              'mt-5 text-[16px] lg:text-[18px] leading-[1.55] text-[var(--color-ink-muted)] max-w-[520px]',
              'transition-opacity duration-[280ms] delay-[240ms]',
              inView ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          >
            {sub}
          </p>
        </div>

        <div
          className={[
            'w-full max-w-[360px] justify-self-start lg:justify-self-end',
            'transition-opacity duration-[480ms] delay-[320ms]',
            inView ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          {visual}
        </div>
      </div>
    </div>
  );
}
