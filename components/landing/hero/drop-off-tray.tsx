'use client';

import { COMPANY_TEMPLATES } from '@/lib/landing/company-templates';

interface DropOffTrayProps {
  /** Ring buffer of recent drop-off template indices (newest last). */
  recentDropoffs: number[];
  /** Displayed total count label, e.g. "258 total" */
  totalLabel: string;
}

export function DropOffTray({ recentDropoffs, totalLabel }: DropOffTrayProps) {
  return (
    <div
      className="mt-3 border border-dashed border-[var(--color-line)] rounded-md px-3 py-2 flex items-center gap-3 bg-[var(--color-canvas)]"
      aria-label="Drop-off tray"
    >
      <span className="font-mono uppercase text-[9px] tracking-[0.12em] text-[var(--color-ink-muted)] font-semibold whitespace-nowrap">
        Drop-off
      </span>
      <div className="flex gap-1.5 flex-wrap flex-1 min-h-[20px]">
        {recentDropoffs.map((tplIdx, i) => {
          const tpl = COMPANY_TEMPLATES[tplIdx % COMPANY_TEMPLATES.length];
          return (
            <span
              key={`${tplIdx}-${i}`}
              className="text-[9px] text-[var(--color-ink-muted)] px-1.5 py-[3px] bg-white border border-[var(--color-line-subtle)] rounded-full line-through decoration-[rgba(115,115,115,0.5)] transition-opacity duration-[280ms]"
            >
              {tpl.company}
            </span>
          );
        })}
      </div>
      <span className="font-mono text-[12px] text-[var(--color-ink)] tabular-nums whitespace-nowrap">
        {totalLabel}
      </span>
    </div>
  );
}
