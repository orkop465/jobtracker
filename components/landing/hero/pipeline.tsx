'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { HERO_STAGES, type HeroStage } from '@/lib/landing/constants';
import { COMPANY_TEMPLATES } from '@/lib/landing/company-templates';
import { SankeyRibbons } from './sankey-ribbons';
import { StageColumn } from './stage-column';
import { FlyingCard } from './flying-card';
import { DropOffTray } from './drop-off-tray';
import { usePipelineState } from './use-pipeline-state';
import {
  PIPELINE_SCHEDULE,
  CYCLE_DURATION_MS,
  type ScheduledTransition,
} from '@/lib/landing/pipeline-schedule';

const FLIGHT_DURATION_MS = 640;
const TICK_INTERVAL_MS = 50;
const DROPOFF_BUFFER_SIZE = 6;

interface CardSlot {
  cardId: string;
  templateIndex: number;
  column: HeroStage;
}

/** Initial column population. */
function buildInitialSlots(): CardSlot[] {
  const perColumn: Record<HeroStage, number> = {
    applied: 5,
    screen: 4,
    interview: 3,
    final: 2,
    offer: 2,
  };
  const slots: CardSlot[] = [];
  let templateIdx = 0;
  for (const stage of HERO_STAGES) {
    for (let i = 0; i < perColumn[stage]; i++) {
      slots.push({
        cardId: `${stage}-${i}`,
        templateIndex: templateIdx % COMPANY_TEMPLATES.length,
        column: stage,
      });
      templateIdx++;
    }
  }
  return slots;
}

export function HeroPipeline() {
  const [mountedAt] = useState(() => (typeof performance !== 'undefined' ? performance.now() : 0));
  const [state, dispatch] = usePipelineState(mountedAt);
  const [slots, setSlots] = useState<CardSlot[]>(() => buildInitialSlots());
  const [dropoffs, setDropoffs] = useState<number[]>([20, 21, 22, 23, 24, 25]); // template indices

  // Refs to escape stale closures inside the setInterval tick.
  const slotsRef = useRef<CardSlot[]>(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  const pathsMapRef = useRef<Record<string, SVGPathElement>>({});
  const svgContainerRef = useRef<HTMLDivElement | null>(null);
  const lastTickRef = useRef<number>(mountedAt);
  const cardCounter = useRef(0);
  const pendingArrivalsRef = useRef<Record<string, { templateIndex: number; column: HeroStage }>>({});

  // Collect SVG path elements after mount.
  useEffect(() => {
    if (!svgContainerRef.current) return;
    const nodes = svgContainerRef.current.querySelectorAll<SVGPathElement>('[data-path-name]');
    const map: Record<string, SVGPathElement> = {};
    nodes.forEach((n) => {
      const name = n.getAttribute('data-path-name');
      if (name) map[name] = n;
    });
    pathsMapRef.current = map;
  }, []);

  // Schedule driver: ticks every 50ms, fires transitions whose atMs has passed.
  useEffect(() => {
    // Respect reduced motion: do not start the schedule.
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const findTransitionsInWindow = (fromMs: number, toMs: number): ScheduledTransition[] => {
      const fromCycle = fromMs % CYCLE_DURATION_MS;
      const toCycle = toMs % CYCLE_DURATION_MS;
      const wraps = Math.floor(toMs / CYCLE_DURATION_MS) > Math.floor(fromMs / CYCLE_DURATION_MS);

      if (!wraps) {
        return PIPELINE_SCHEDULE.filter((t) => t.atMs >= fromCycle && t.atMs < toCycle);
      }
      return [
        ...PIPELINE_SCHEDULE.filter((t) => t.atMs >= fromCycle),
        ...PIPELINE_SCHEDULE.filter((t) => t.atMs < toCycle),
      ];
    };

    const fireTransition = (t: ScheduledTransition, now: number) => {
      // Bookkeeping transitions: silent count adjustment only.
      if (t.pathName === 'bookkeeping') {
        dispatch({
          type: 'fireTransition',
          cardId: `bk-${cardCounter.current++}`,
          from: t.from,
          to: t.to,
          pathName: t.pathName,
          now,
        });
        return;
      }

      // Drop-off to visible tray: pop a slot from source column, push to dropoffs buffer.
      if (t.to === 'dropoff') {
        if (t.from !== 'inflow' && t.from !== 'dropoff') {
          const currentSlots = slotsRef.current;
          const idx = currentSlots.findIndex((s) => s.column === t.from);
          if (idx !== -1) {
            const removed = currentSlots[idx];
            setSlots((prev) => prev.filter((s) => s.cardId !== removed.cardId));
            setDropoffs((d) => [...d, removed.templateIndex].slice(-DROPOFF_BUFFER_SIZE));
          }
        }
        dispatch({
          type: 'fireTransition',
          cardId: `flight-${cardCounter.current++}`,
          from: t.from,
          to: t.to,
          pathName: t.pathName,
          now,
        });
        return;
      }

      // inflow → applied: animate a new card in, add slot on arrival.
      if (t.from === 'inflow' && t.to === 'applied') {
        const newTemplateIdx = (cardCounter.current + 15) % COMPANY_TEMPLATES.length;
        const newId = `flight-${cardCounter.current++}`;
        pendingArrivalsRef.current[newId] = { templateIndex: newTemplateIdx, column: 'applied' };
        dispatch({
          type: 'fireTransition',
          cardId: newId,
          from: t.from,
          to: t.to,
          pathName: t.pathName,
          now,
        });
        return;
      }

      // Normal forward progression between hero stages.
      const fromStage = t.from as HeroStage;
      const toStage = t.to as HeroStage;
      const currentSlots = slotsRef.current;
      const sourceSlot = currentSlots.find((s) => s.column === fromStage);
      if (!sourceSlot) {
        // No card available in source column; skip silently.
        return;
      }

      const newFlightId = `flight-${cardCounter.current++}`;
      pendingArrivalsRef.current[newFlightId] = {
        templateIndex: sourceSlot.templateIndex,
        column: toStage,
      };
      setSlots((prev) => prev.filter((s) => s.cardId !== sourceSlot.cardId));
      dispatch({
        type: 'fireTransition',
        cardId: newFlightId,
        from: t.from,
        to: t.to,
        pathName: t.pathName,
        now,
      });
    };

    const interval = setInterval(() => {
      const now = performance.now();
      const lastTick = lastTickRef.current;
      lastTickRef.current = now;

      const windowFrom = lastTick - mountedAt;
      const windowTo = now - mountedAt;
      const transitions = findTransitionsInWindow(windowFrom, windowTo);

      for (const t of transitions) {
        fireTransition(t, now);
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountedAt]);

  function handleComplete(cardId: string) {
    const arrival = pendingArrivalsRef.current[cardId];
    dispatch({ type: 'completeTransition', cardId, now: performance.now() });
    if (arrival) {
      setSlots((prev) => [
        ...prev,
        {
          cardId: `slot-${cardCounter.current++}`,
          templateIndex: arrival.templateIndex,
          column: arrival.column,
        },
      ]);
      delete pendingArrivalsRef.current[cardId];
    }
  }

  // Group slots by column for rendering.
  const slotsByColumn = useMemo(() => {
    const grouped: Record<HeroStage, CardSlot[]> = {
      applied: [],
      screen: [],
      interview: [],
      final: [],
      offer: [],
    };
    for (const slot of slots) grouped[slot.column].push(slot);
    return grouped;
  }, [slots]);

  return (
    <div
      ref={svgContainerRef}
      className="relative bg-white border border-[var(--color-line)] rounded-[10px] p-4 pt-[18px] min-h-[340px]"
    >
      {/* Ribbons + path defs */}
      <div className="absolute inset-[46px_14px_14px] pointer-events-none z-0">
        <SankeyRibbons />
      </div>

      {/* Flying cards overlay */}
      <div className="absolute inset-[46px_14px_14px] pointer-events-none z-30">
        {state.flying
          .filter((f) => f.pathName !== 'bookkeeping')
          .map((f) => {
            const arrival = pendingArrivalsRef.current[f.cardId];
            return (
              <FlyingCard
                key={f.cardId}
                cardId={f.cardId}
                templateIndex={arrival?.templateIndex ?? 0}
                pathElement={pathsMapRef.current[f.pathName] ?? null}
                startedAt={f.startedAt}
                durationMs={FLIGHT_DURATION_MS}
                onComplete={handleComplete}
              />
            );
          })}
      </div>

      {/* Columns */}
      <div className="grid grid-cols-5 gap-3 relative z-10">
        {HERO_STAGES.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            count={state.counts[stage]}
            flash={state.lastFlash[stage]?.kind ?? null}
            cards={slotsByColumn[stage].map((s) => ({
              cardId: s.cardId,
              templateIndex: s.templateIndex,
            }))}
          />
        ))}
      </div>

      {/* Drop-off tray */}
      <DropOffTray recentDropoffs={dropoffs} totalLabel="258 total" />
    </div>
  );
}
