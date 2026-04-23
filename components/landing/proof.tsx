'use client';

import { PROOF_COUNTERS } from '@/lib/landing/constants';
import { useInView } from '@/lib/motion/use-in-view';
import { useCountUp } from '@/lib/motion/use-count-up';

function ProofCounter({
  value,
  prefix,
  suffix,
  label,
  start,
  delay,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  start: boolean;
  delay: number;
}) {
  const displayed = useCountUp(value, { start, duration: 1200 });
  return (
    <div style={{ transitionDelay: `${delay}ms` }}>
      <div className="text-[36px] sm:text-[48px] lg:text-[64px] leading-[1] font-semibold tabular-nums tracking-[-0.03em] text-[var(--color-ink)]">
        {prefix}
        {displayed.toLocaleString()}
        {suffix}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)] mt-3">
        {label}
      </div>
    </div>
  );
}

export function Proof() {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.3 });

  return (
    <section ref={ref} className="py-32 bg-[var(--color-canvas)]">
      <div className="max-w-[1160px] mx-auto px-6">
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] mb-10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink)]" />
          Across every user
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
          {PROOF_COUNTERS.map((c, i) => (
            <ProofCounter
              key={c.label}
              value={c.value}
              prefix={c.prefix}
              suffix={c.suffix}
              label={c.label}
              start={inView}
              delay={i * 120}
            />
          ))}
        </div>
        <div
          className="mt-12 h-px w-[80%] origin-left bg-[var(--color-line)]"
          style={{
            transform: inView ? 'scaleX(1)' : 'scaleX(0)',
            transition: 'transform 800ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
    </section>
  );
}
