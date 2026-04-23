'use client';

import { METRIC_STRIP } from '@/lib/landing/constants';

export function MetricStrip() {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-t border-b border-[var(--color-line)] py-4 mb-7"
      aria-label="Pipeline metrics"
    >
      {METRIC_STRIP.map((cell, i) => (
        <div
          key={cell.label}
          className={[
            'px-4',
            i < METRIC_STRIP.length - 1 && 'lg:border-r lg:border-[var(--color-line-subtle)]',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] mb-1.5">
            {cell.label}
          </div>
          <div
            className={[
              'text-[18px] sm:text-[22px] font-medium tabular-nums tracking-[-0.02em]',
              cell.label === 'Offers'
                ? 'text-[var(--color-survive)]'
                : 'text-[var(--color-ink)]',
            ].join(' ')}
          >
            {cell.value}
            {cell.delta && (
              <span
                className={[
                  'text-[10px] font-medium ml-1.5',
                  cell.deltaKind === 'up' && 'text-[var(--color-survive)]',
                  cell.deltaKind === 'down' && 'text-[var(--color-sink)]',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {cell.delta}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
