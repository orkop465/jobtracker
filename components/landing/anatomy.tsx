'use client';

import { ANATOMY_STAGES } from '@/lib/landing/constants';
import { useInView } from '@/lib/motion/use-in-view';

export function Anatomy() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.15 });

  return (
    <section id="anatomy" className="py-32 bg-[var(--color-canvas)]">
      <div className="max-w-[1160px] mx-auto px-6">
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink)]" />
          Stage by stage
        </div>
        <h2 className="text-[44px] leading-[1.05] font-semibold tracking-[-0.02em] text-[var(--color-ink)] mb-4 max-w-[680px]">
          Ten stages between &ldquo;applied&rdquo; and &ldquo;hired&rdquo;.<br />
          You&rsquo;ve been tracking three.
        </h2>
        <p className="text-[14px] text-[var(--color-ink-muted)] leading-[1.55] mb-12 max-w-[560px]">
          Each percentage is the median <strong className="text-[var(--color-ink)] font-semibold">advance rate</strong> — the
          share of applications at that stage that made it to the next one.
          Multiplied across every active stage it compounds to roughly{' '}
          <span className="font-mono text-[var(--color-ink)]">1.2%</span> — the
          actual yield of most job searches.
        </p>

        <div
          ref={ref}
          className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 overflow-x-auto"
        >
          {ANATOMY_STAGES.map((stage, i) => {
            const isClosed = stage.variant === 'closed';
            const isEnd = stage.variant === 'end';
            return (
              <div
                key={stage.key}
                className={[
                  'bg-white border border-[var(--color-line)] rounded-md p-4 min-h-[140px] flex flex-col justify-between',
                  'transition-[transform,opacity] duration-[480ms]',
                  isClosed && 'border-dashed',
                  isEnd && 'border-[var(--color-survive-soft)] bg-[rgba(21,128,61,0.04)]',
                  inView
                    ? isClosed
                      ? 'opacity-60 translate-y-0'
                      : 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-3',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  transitionDelay: `${i * 80}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <div className="font-mono text-[8px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)]">
                  {stage.label}
                </div>

                {stage.variant === 'advance' && (
                  <div className="mt-2">
                    <div className="text-[22px] font-semibold tabular-nums text-[var(--color-ink)] tracking-[-0.02em] leading-none">
                      {Math.round((stage.medianConversion ?? 0) * 100)}
                      <span className="text-[12px] text-[var(--color-ink-muted)] ml-0.5">%</span>
                    </div>
                    <div className="font-mono text-[8px] text-[var(--color-ink-muted)] mt-1 uppercase tracking-[0.1em]">
                      advance rate
                    </div>
                    <div className="font-mono text-[9px] text-[var(--color-ink-muted)] mt-2">
                      ~{stage.medianDaysInStage}d typical
                    </div>
                  </div>
                )}

                {stage.variant === 'end' && (
                  <div className="mt-2">
                    <div className="text-[22px] font-semibold tabular-nums text-[var(--color-survive)] tracking-[-0.02em] leading-none">
                      ✓
                    </div>
                    <div className="font-mono text-[8px] text-[var(--color-ink-muted)] mt-1 uppercase tracking-[0.1em]">
                      end of pipeline
                    </div>
                    <div className="font-mono text-[9px] text-[var(--color-ink-muted)] mt-2">
                      ~{stage.medianDaysInStage}d to decide
                    </div>
                  </div>
                )}

                {stage.variant === 'closed' && (
                  <div className="mt-2">
                    <div className="font-mono text-[8px] text-[var(--color-ink-muted)] uppercase tracking-[0.1em]">
                      closed
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
