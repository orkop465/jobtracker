'use client';

import { useEffect, useState } from 'react';
import { CompanyCard } from './company-card';

export type StageColumnVariant = 'default' | 'offer' | 'closed';

export interface StageColumnCard {
  cardId: string;
  templateIndex: number;
  ghost?: boolean;
  arriving?: boolean;
  /** When true, the card plays the fade-up entrance animation on mount. */
  isNew?: boolean;
}

interface StageColumnProps {
  /** Human-readable column label, rendered uppercase via font-mono. */
  label: string;
  /** Numeric display count. */
  count: number;
  /**
   * Flash state keyed by its timestamp so the floating sprite re-mounts (and
   * re-runs its animation) on every new flash event.
   */
  flash?: { kind: 'up' | 'down'; at: number } | null;
  /** Cards currently resident in this column. */
  cards: StageColumnCard[];
  /** Visual variant: default (ink), offer (green accent), closed (dimmed). */
  variant?: StageColumnVariant;
}

/** How long the count number stays tinted after a flash event. */
const FLASH_HOLD_MS = 400;

export function StageColumn({ label, count, flash, cards, variant = 'default' }: StageColumnProps) {
  const isOffer = variant === 'offer';
  const isClosed = variant === 'closed';

  // Local "flash is active" mirror that auto-clears after FLASH_HOLD_MS so the
  // count tint fades back to its base color via the transition-colors property.
  // Without this, the count would stay tinted indefinitely between flash events.
  const [flashActive, setFlashActive] = useState(false);
  useEffect(() => {
    if (!flash) return;
    setFlashActive(true);
    const t = setTimeout(() => setFlashActive(false), FLASH_HOLD_MS);
    return () => clearTimeout(t);
  }, [flash?.at]);

  return (
    <div className="flex flex-col relative">
      <h4 className="font-mono uppercase flex justify-between items-baseline text-[9px] tracking-[0.12em] text-[var(--color-ink-muted)] mb-[3px] font-semibold relative">
        <span
          className={
            isOffer
              ? 'text-[var(--color-survive)]'
              : isClosed
              ? 'text-[var(--color-ink-muted)]'
              : ''
          }
        >
          {label}
        </span>
        <span
          className={[
            'font-mono text-[13px] tabular-nums transition-colors duration-[280ms]',
            flashActive && flash?.kind === 'up' && 'text-[var(--color-survive)]',
            flashActive && flash?.kind === 'down' && 'text-[var(--color-ink-muted)]',
            !flashActive && isOffer && 'text-[var(--color-survive)]',
            !flashActive && isClosed && 'text-[var(--color-ink-muted)]',
            !flashActive && !isOffer && !isClosed && 'text-[var(--color-ink)]',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {count}
        </span>

        {/* Floating +1 / -1 sprite — re-mounts on every new flash via `key`.
            Anchored at the top-right edge of the count and rises 12px max,
            staying inside the hero card's padding-box so it never clips. */}
        {flash && (
          <span
            key={flash.at}
            aria-hidden
            className="absolute right-0 top-0 font-mono text-[10px] font-semibold pointer-events-none tabular-nums"
            style={{
              color: flash.kind === 'up' ? 'var(--color-survive)' : 'var(--color-sink)',
              animation: 'float-up 900ms cubic-bezier(0.22, 1, 0.36, 1) both',
            }}
          >
            {flash.kind === 'up' ? '+1' : '−1'}
          </span>
        )}
      </h4>
      <div
        className={[
          'border border-dashed border-[var(--color-line)] rounded-md min-h-[260px] p-1.5 flex flex-col gap-1',
          isOffer && 'border-[var(--color-survive-soft)] bg-[rgba(21,128,61,0.03)]',
          isClosed && 'bg-[rgba(10,10,10,0.015)]',
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
            className={[
              c.isNew && 'card-enter',
              isClosed && 'opacity-50 [&>div:first-child]:line-through',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
