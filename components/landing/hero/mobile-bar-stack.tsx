'use client';

import { useEffect, useState } from 'react';

export interface MobileSegment {
  id: string;
  /** 0-1 opacity value. Higher = lower in the stack (older). */
  opacity: number;
}

interface MobileBarStackProps {
  label: string;
  count: number;
  flash: { kind: 'up' | 'down'; at: number } | null;
  segments: MobileSegment[];
  isOffer?: boolean;
}

const FLASH_HOLD_MS = 400;

export function MobileBarStack({ label, count, flash, segments, isOffer = false }: MobileBarStackProps) {
  const [flashActive, setFlashActive] = useState(false);
  useEffect(() => {
    if (!flash) return;
    setFlashActive(true);
    const t = setTimeout(() => setFlashActive(false), FLASH_HOLD_MS);
    return () => clearTimeout(t);
  }, [flash?.at]);

  const segColor = isOffer ? 'var(--color-survive)' : 'var(--color-ink)';

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      {/* Segment stack — bottom aligned */}
      <div className="w-full flex flex-col gap-[1.5px] justify-end h-[110px]">
        {segments.map((seg) => (
          <div
            key={seg.id}
            className="h-[5px] rounded-[1.5px] transition-transform duration-200 ease-out"
            style={{
              backgroundColor: segColor,
              opacity: isOffer ? 0.35 : seg.opacity,
              ['--seg-opacity' as string]: seg.opacity,
            }}
          />
        ))}
      </div>

      {/* Label */}
      <div
        className={[
          'font-mono uppercase text-[8px] tracking-[0.1em] mt-1.5 font-medium',
          isOffer ? 'text-[var(--color-survive)]' : 'text-[var(--color-ink-muted)]',
        ].join(' ')}
      >
        {label}
      </div>

      {/* Count + flash */}
      <div className="relative">
        <span
          className={[
            'font-mono text-[13px] font-semibold tabular-nums leading-tight transition-colors duration-[280ms]',
            flashActive && flash?.kind === 'up' && 'text-[var(--color-survive)]',
            flashActive && flash?.kind === 'down' && 'text-[var(--color-ink-muted)]',
            !flashActive && isOffer && 'text-[var(--color-survive)]',
            !flashActive && !isOffer && 'text-[var(--color-ink)]',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {count}
        </span>
        {flash && (
          <span
            key={flash.at}
            aria-hidden
            className="absolute -right-4 top-0 font-mono text-[9px] font-semibold pointer-events-none tabular-nums"
            style={{
              color: flash.kind === 'up' ? 'var(--color-survive)' : 'var(--color-sink)',
              animation: 'float-up 900ms cubic-bezier(0.22, 1, 0.36, 1) both',
            }}
          >
            {flash.kind === 'up' ? '+1' : '−1'}
          </span>
        )}
      </div>
    </div>
  );
}
