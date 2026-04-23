'use client';

import { useEffect, useRef, useState } from 'react';
import { HERO_STAGES, HERO_STAGE_LABELS, type HeroStage } from '@/lib/landing/constants';
import { COMPANY_TEMPLATES } from '@/lib/landing/company-templates';

/**
 * Animated ambient pipeline for the auth left panel.
 * A simplified, half-speed version of the hero kanban — 5 columns,
 * ~3 cards per column, one visible transition every ~5s.
 * See spec §7.2.
 */

const CYCLE_DURATION_MS = 60_000;
const TICK_INTERVAL_MS = 100;
const LEAVE_ANIMATION_MS = 380;
const START_DELAY_MS = 800; // spec §7.4: simulation begins at 800ms

interface AmbientTransition {
  atMs: number;
  from: HeroStage;
  to: HeroStage;
  /** false = bookkeeping (silent card recycle, no animation) */
  visible: boolean;
}

/**
 * 60-second balanced schedule. Visible transitions fire every ~5s,
 * interspersed with silent bookkeeping recycling to keep column sizes
 * bounded (no column exceeds initial + 1 or drops below 1).
 *
 * Visible (10 total):
 *   applied → screen      ×4
 *   screen → interview    ×3
 *   interview → final     ×2
 *   final → offer         ×1
 *
 * Bookkeeping (4 total, silent):
 *   offer → applied       ×1
 *   screen → applied      ×1
 *   interview → applied   ×1
 *   final → applied       ×1
 *
 * Net per column over one full cycle: 0 ✓
 *
 * Column size trace (initial a:3 s:2 i:2 f:2 o:1):
 *   applied  3→2→1→2→3→2→3→2→3→2→3  (min:1 max:3)
 *   screen   2→3→2→3→2→1→2→1→2→2     (min:1 max:3)
 *   interview  2→3→2→3→2→1→2          (min:1 max:3)
 *   final    2→3→2→3→2                 (min:2 max:3)
 *   offer    1→2→1                     (min:1 max:2)
 *
 * Max 3 cards in any column → always fits within min-h-[90px]
 * (3 cards ≈ 78px), no overflow clipping or layout shift needed.
 */
const AMBIENT_SCHEDULE: readonly AmbientTransition[] = [
  { atMs:  3_000, from: 'applied',   to: 'screen',    visible: true },
  { atMs:  9_000, from: 'screen',    to: 'interview', visible: true },
  { atMs: 14_000, from: 'applied',   to: 'screen',    visible: true },
  { atMs: 19_000, from: 'interview', to: 'final',     visible: true },
  { atMs: 22_000, from: 'screen',    to: 'applied',   visible: false },
  { atMs: 26_000, from: 'screen',    to: 'interview', visible: true },
  { atMs: 31_000, from: 'final',     to: 'offer',     visible: true },
  { atMs: 35_000, from: 'offer',     to: 'applied',   visible: false },
  { atMs: 39_000, from: 'applied',   to: 'screen',    visible: true },
  { atMs: 43_000, from: 'interview', to: 'final',     visible: true },
  { atMs: 46_000, from: 'interview', to: 'applied',   visible: false },
  { atMs: 50_000, from: 'screen',    to: 'interview', visible: true },
  { atMs: 54_000, from: 'applied',   to: 'screen',    visible: true },
  { atMs: 57_000, from: 'final',     to: 'applied',   visible: false },
];

const INITIAL_PER_COLUMN: Record<HeroStage, number> = {
  applied: 3,
  screen: 2,
  interview: 2,
  final: 2,
  offer: 1,
};

interface CardSlot {
  id: string;
  templateIndex: number;
  /** Triggers the fade-up entrance animation */
  entering?: boolean;
  /** Triggers the fade-out leave animation */
  leaving?: boolean;
}

type ColumnState = Record<HeroStage, CardSlot[]>;

let nextId = 0;

function buildInitialColumns(): ColumnState {
  const cols: ColumnState = { applied: [], screen: [], interview: [], final: [], offer: [] };
  let tplIdx = 0;
  for (const stage of HERO_STAGES) {
    for (let i = 0; i < INITIAL_PER_COLUMN[stage]; i++) {
      cols[stage].push({
        id: `amb-${nextId++}`,
        templateIndex: tplIdx % COMPANY_TEMPLATES.length,
      });
      tplIdx++;
    }
  }
  return cols;
}

export function AmbientPipeline() {
  const [columns, setColumns] = useState<ColumnState>(buildInitialColumns);
  const mountedAtRef = useRef(0);
  const lastTickRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Respect reduced motion: stay static
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const mountedAt = performance.now();
    mountedAtRef.current = mountedAt;
    lastTickRef.current = mountedAt;

    const findTransitionsInWindow = (fromMs: number, toMs: number): AmbientTransition[] => {
      const fromCycle = fromMs % CYCLE_DURATION_MS;
      const toCycle = toMs % CYCLE_DURATION_MS;
      const wraps = Math.floor(toMs / CYCLE_DURATION_MS) > Math.floor(fromMs / CYCLE_DURATION_MS);

      if (!wraps) {
        return AMBIENT_SCHEDULE.filter((t) => t.atMs >= fromCycle && t.atMs < toCycle);
      }
      return [
        ...AMBIENT_SCHEDULE.filter((t) => t.atMs >= fromCycle),
        ...AMBIENT_SCHEDULE.filter((t) => t.atMs < toCycle),
      ];
    };

    const fireTransition = (t: AmbientTransition) => {
      if (!t.visible) {
        // Bookkeeping: silently move card, no animation
        setColumns((prev) => {
          const source = [...prev[t.from]];
          if (source.length === 0) return prev;
          const [moved, ...rest] = source;
          return {
            ...prev,
            [t.from]: rest,
            [t.to]: [...prev[t.to], { id: `amb-${nextId++}`, templateIndex: moved.templateIndex }],
          };
        });
        return;
      }

      // Visible transition: mark top card in source as leaving
      setColumns((prev) => {
        const source = [...prev[t.from]];
        if (source.length === 0) return prev;
        // Mark the first non-leaving card as leaving
        const idx = source.findIndex((c) => !c.leaving);
        if (idx === -1) return prev;
        source[idx] = { ...source[idx], leaving: true };
        return { ...prev, [t.from]: source };
      });

      // After the leave animation completes, remove from source and add to destination
      setTimeout(() => {
        setColumns((prev) => {
          const source = [...prev[t.from]];
          const leavingIdx = source.findIndex((c) => c.leaving);
          if (leavingIdx === -1) return prev;
          const moved = source[leavingIdx];
          const remaining = source.filter((_, i) => i !== leavingIdx);
          const newCard: CardSlot = {
            id: `amb-${nextId++}`,
            templateIndex: moved.templateIndex,
            entering: true,
          };
          return {
            ...prev,
            [t.from]: remaining,
            [t.to]: [...prev[t.to], newCard],
          };
        });
      }, LEAVE_ANIMATION_MS);
    };

    // Delay start per spec §7.4
    delayRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        const now = performance.now();
        const lastTick = lastTickRef.current;
        lastTickRef.current = now;

        const windowFrom = lastTick - mountedAt;
        const windowTo = now - mountedAt;
        const transitions = findTransitionsInWindow(windowFrom, windowTo);

        for (const t of transitions) {
          fireTransition(t);
        }
      }, TICK_INTERVAL_MS);
    }, START_DELAY_MS);

    return () => {
      if (delayRef.current) clearTimeout(delayRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="w-full max-w-[420px]">
      <div className="grid grid-cols-5 gap-2">
        {HERO_STAGES.map((stage) => (
          <div key={stage} className="flex flex-col">
            <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)] mb-1">
              {HERO_STAGE_LABELS[stage]}
            </div>
            <div className="border border-dashed border-[var(--color-line)] rounded p-1 min-h-[90px] flex flex-col gap-0.5">
              {columns[stage].map((card) => {
                const tpl = COMPANY_TEMPLATES[card.templateIndex];
                return (
                  <div
                    key={card.id}
                    className={[
                      'bg-white border border-[var(--color-line)] rounded px-1.5 py-1 text-[8px] text-[var(--color-ink)]',
                      card.entering && 'ambient-card-enter',
                      card.leaving && 'ambient-card-leave',
                    ]
                      .filter(Boolean)
                      .join(' ')}
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
