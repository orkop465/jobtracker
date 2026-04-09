'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { HERO_STAGES, HERO_STAGE_LABELS, type HeroStage } from '@/lib/landing/constants';
import { COMPANY_TEMPLATES } from '@/lib/landing/company-templates';
import { SankeyRibbons } from './sankey-ribbons';
import { StageColumn, type StageColumnCard } from './stage-column';
import { FlyingCard } from './flying-card';
import { FlightTrail } from './flight-trail';
import { usePipelineState } from './use-pipeline-state';
import {
  PIPELINE_SCHEDULE,
  CYCLE_DURATION_MS,
  type ScheduledTransition,
} from '@/lib/landing/pipeline-schedule';

const FLIGHT_DURATION_MS = 640;
const TICK_INTERVAL_MS = 50;
const CLOSED_BUFFER_SIZE = 6;
const CLOSED_INITIAL_COUNT = 258;
const TRAIL_FADE_MS = 240;
const TRAIL_LIFETIME_MS = FLIGHT_DURATION_MS + TRAIL_FADE_MS + 40;

/** Forward (survive) paths get a green trail behind the flying card. */
const FORWARD_PATH_NAMES = new Set([
  'applied-screen',
  'screen-interview',
  'interview-final',
  'final-offer',
]);

/** Pending arrival target. Internal `'dropoff'` = the visible "Closed" column. */
type PendingColumn = HeroStage | 'dropoff';

interface CardSlot {
  cardId: string;
  templateIndex: number;
  column: HeroStage;
  /** Plays the fade-up entrance animation when rendered for the first time. */
  isNew?: boolean;
}

interface ClosedCardSlot {
  cardId: string;
  templateIndex: number;
}

interface ActiveTrail {
  id: string;
  d: string;
  totalLength: number;
}

/** Initial column population for the 5 active stages. */
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

/** Initial cards resident in the Closed column (historical dropouts). */
function buildInitialClosedSlots(): ClosedCardSlot[] {
  return [20, 21, 22, 23].map((tplIdx, i) => ({
    cardId: `closed-init-${i}`,
    templateIndex: tplIdx,
  }));
}

export function HeroPipeline() {
  const [mountedAt] = useState(() => (typeof performance !== 'undefined' ? performance.now() : 0));
  const [state, dispatch] = usePipelineState(mountedAt);
  const [slots, setSlots] = useState<CardSlot[]>(() => buildInitialSlots());
  const [closedSlots, setClosedSlots] = useState<ClosedCardSlot[]>(() => buildInitialClosedSlots());
  const [closedCount, setClosedCount] = useState(CLOSED_INITIAL_COUNT);
  const [closedFlash, setClosedFlash] = useState<{ kind: 'up' | 'down'; at: number } | null>(null);
  const [activeTrails, setActiveTrails] = useState<ActiveTrail[]>([]);

  // Refs to escape stale closures inside the setInterval tick.
  const slotsRef = useRef<CardSlot[]>(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  const pathsMapRef = useRef<Record<string, SVGPathElement>>({});
  const svgContainerRef = useRef<HTMLDivElement | null>(null);
  const lastTickRef = useRef<number>(mountedAt);
  const cardCounter = useRef(0);
  const pendingArrivalsRef = useRef<Record<string, { templateIndex: number; column: PendingColumn }>>({});
  const trailIdRef = useRef(0);

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

  /**
   * Spawn a green trail for a forward (survive) flight. The trail draws in
   * sync with the card's flight, then fades and is removed from state after
   * TRAIL_LIFETIME_MS.
   */
  const spawnTrailFor = (pathName: string) => {
    if (!FORWARD_PATH_NAMES.has(pathName)) return;
    const pathEl = pathsMapRef.current[pathName];
    if (!pathEl) return;
    const d = pathEl.getAttribute('d');
    if (!d) return;
    const totalLength = pathEl.getTotalLength();
    const id = `trail-${++trailIdRef.current}`;
    setActiveTrails((prev) => [...prev, { id, d, totalLength }]);
    setTimeout(() => {
      setActiveTrails((prev) => prev.filter((t) => t.id !== id));
    }, TRAIL_LIFETIME_MS);
  };

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

      // Closed column (internal name 'dropoff'): the card flies to the Closed
      // column and is added to the closed ring buffer on arrival.
      if (t.to === 'dropoff') {
        if (t.from === 'inflow' || t.from === 'dropoff') return;
        const currentSlots = slotsRef.current;
        const idx = currentSlots.findIndex((s) => s.column === t.from);
        if (idx === -1) return;
        const removed = currentSlots[idx];
        const newFlightId = `flight-${cardCounter.current++}`;
        pendingArrivalsRef.current[newFlightId] = {
          templateIndex: removed.templateIndex,
          column: 'dropoff',
        };
        setSlots((prev) => prev.filter((s) => s.cardId !== removed.cardId));
        dispatch({
          type: 'fireTransition',
          cardId: newFlightId,
          from: t.from,
          to: t.to,
          pathName: t.pathName,
          now,
        });
        return;
      }

      // inflow → applied: materialize a new card INSIDE the Applied column
      // (no fly-in from off-screen). arriveDirectly increments the count and
      // fires an "up" flash; the new slot carries isNew=true so it animates in.
      if (t.from === 'inflow' && t.to === 'applied') {
        const newTemplateIdx = (cardCounter.current + 15) % COMPANY_TEMPLATES.length;
        cardCounter.current++;
        setSlots((prev) => [
          ...prev,
          {
            cardId: `slot-${cardCounter.current++}`,
            templateIndex: newTemplateIdx,
            column: 'applied',
            isNew: true,
          },
        ]);
        dispatch({ type: 'arriveDirectly', column: 'applied', now });
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
      // Spawn a green trail behind this forward flight.
      spawnTrailFor(t.pathName);
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
      if (arrival.column === 'dropoff') {
        // Card landed in the Closed column. Push to the ring buffer, bump
        // the displayed count, and flash the Closed column header +1.
        setClosedSlots((prev) =>
          [
            ...prev,
            {
              cardId: `closed-${cardCounter.current++}`,
              templateIndex: arrival.templateIndex,
            },
          ].slice(-CLOSED_BUFFER_SIZE),
        );
        setClosedCount((c) => c + 1);
        setClosedFlash({ kind: 'up', at: performance.now() });
      } else {
        const heroStage = arrival.column; // narrowed: not 'dropoff' in this branch
        setSlots((prev) => [
          ...prev,
          {
            cardId: `slot-${cardCounter.current++}`,
            templateIndex: arrival.templateIndex,
            column: heroStage,
          },
        ]);
      }
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

  const closedColumnCards: StageColumnCard[] = closedSlots.map((c) => ({
    cardId: c.cardId,
    templateIndex: c.templateIndex,
  }));

  return (
    <div
      ref={svgContainerRef}
      className="relative bg-white border border-[var(--color-line)] rounded-[10px] p-4 pt-6 overflow-x-auto"
    >
      {/* Inner kanban — fixed min-width so the 6 columns stay readable on
          mobile (scrolls horizontally). */}
      <div className="relative min-w-[780px]">
        {/* Ribbons + hidden path defs — full width so dropoff paths can
            reach the Closed column on the far right. */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <SankeyRibbons />
        </div>

        {/* Trail overlay — short-lived green trails behind forward flights.
            Same coordinate space as SankeyRibbons (full-width viewBox). */}
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          viewBox="0 0 1000 300"
          preserveAspectRatio="none"
        >
          {activeTrails.map((trail) => (
            <FlightTrail
              key={trail.id}
              d={trail.d}
              totalLength={trail.totalLength}
              durationMs={FLIGHT_DURATION_MS}
            />
          ))}
        </svg>

        {/* Flying cards overlay — full width to cover the Closed column path. */}
        <div className="absolute inset-0 pointer-events-none z-30">
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

        {/* Columns — 5 active stages + 1 Closed column */}
        <div className="grid grid-cols-6 gap-2 relative z-10">
          {HERO_STAGES.map((stage) => (
            <StageColumn
              key={stage}
              label={HERO_STAGE_LABELS[stage]}
              count={state.counts[stage]}
              flash={state.lastFlash[stage] ?? null}
              variant={stage === 'offer' ? 'offer' : 'default'}
              cards={slotsByColumn[stage].map((s) => ({
                cardId: s.cardId,
                templateIndex: s.templateIndex,
                isNew: s.isNew,
              }))}
            />
          ))}
          <StageColumn
            label="Closed"
            count={closedCount}
            flash={closedFlash}
            variant="closed"
            cards={closedColumnCards}
          />
        </div>
      </div>
    </div>
  );
}
