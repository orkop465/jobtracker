'use client';

import { CompanyCard } from './company-card';
import type { HeroStage } from '@/lib/landing/constants';
import { HERO_STAGE_LABELS } from '@/lib/landing/constants';

interface StageColumnProps {
  stage: HeroStage;
  count: number;
  /** Flash state for count (+1 up, -1 down, or none). */
  flash?: 'up' | 'down' | null;
  /** Indices into COMPANY_TEMPLATES for cards currently in this column. */
  cards: { cardId: string; templateIndex: number; ghost?: boolean; arriving?: boolean }[];
}

export function StageColumn({ stage, count, flash, cards }: StageColumnProps) {
  const isOffer = stage === 'offer';
  return (
    <div className="flex flex-col">
      <h4 className="font-mono uppercase flex justify-between items-baseline text-[9px] tracking-[0.12em] text-[var(--color-ink-muted)] mb-[3px] font-semibold">
        <span className={isOffer ? 'text-[var(--color-survive)]' : ''}>
          {HERO_STAGE_LABELS[stage]}
        </span>
        <span
          className={[
            'font-mono text-[13px] tabular-nums transition-colors duration-[240ms]',
            flash === 'up' && 'text-[var(--color-survive)]',
            flash === 'down' && 'text-[var(--color-ink-muted)]',
            !flash && (isOffer ? 'text-[var(--color-survive)]' : 'text-[var(--color-ink)]'),
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {count}
        </span>
      </h4>
      <div
        className={[
          'border border-dashed border-[var(--color-line)] rounded-md min-h-[260px] p-1.5 flex flex-col gap-1',
          isOffer && 'border-[var(--color-survive-soft)] bg-[rgba(21,128,61,0.03)]',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {cards.map((c) => (
          <CompanyCard
            key={c.cardId}
            templateIndex={c.templateIndex}
            ghost={c.ghost}
            arriving={c.arriving}
          />
        ))}
      </div>
    </div>
  );
}
