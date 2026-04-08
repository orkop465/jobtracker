'use client';

import { HERO_STAGES, HERO_STAGE_LABELS } from '@/lib/landing/constants';
import { COMPANY_TEMPLATES } from '@/lib/landing/company-templates';

/**
 * Simplified ambient pipeline for the auth left panel.
 * For MVP: static visual (no simulation) matching the hero's vocabulary.
 * The hero's steady-state simulation is intentionally NOT reused here — a
 * secondary, silent visual is clearer at this scale and avoids distracting
 * from the form.
 *
 * A later enhancement can swap this for a quarter-cadence simulation if
 * visual QA decides the static version is too lifeless.
 */
export function AmbientPipeline() {
  return (
    <div className="w-full max-w-[420px]">
      <div className="grid grid-cols-5 gap-2">
        {HERO_STAGES.map((stage, sIdx) => (
          <div key={stage} className="flex flex-col">
            <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)] mb-1">
              {HERO_STAGE_LABELS[stage]}
            </div>
            <div className="border border-dashed border-[var(--color-line)] rounded p-1 min-h-[90px] flex flex-col gap-0.5">
              {Array.from({ length: 3 - Math.floor(sIdx / 2) }).map((_, i) => {
                const tpl = COMPANY_TEMPLATES[(sIdx * 3 + i) % COMPANY_TEMPLATES.length];
                return (
                  <div
                    key={i}
                    className="bg-white border border-[var(--color-line)] rounded px-1.5 py-1 text-[8px] text-[var(--color-ink)]"
                  >
                    {tpl.company}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
