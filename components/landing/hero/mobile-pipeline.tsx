'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HERO_STAGES, HERO_STAGE_LABELS, HERO_BASELINE_COUNTS, type HeroStage } from '@/lib/landing/constants';
import type { PipelineState } from './use-pipeline-state';
import { MobileBarStack, type MobileSegment } from './mobile-bar-stack';
import { MobileFlyingSegment } from './mobile-flying-segment';
import { MobileDrainSegment } from './mobile-drain-segment';

/**
 * Base segment counts per stage — proportional to baseline counts via
 * power scaling (exponent 0.45). This creates a funnel shape where the
 * ratio between bars reflects the ratio between counts, compressed so
 * that even small counts (Offer=4) get visible segments.
 *
 * Computed from HERO_BASELINE_COUNTS: 280→13, 87→8, 34→5, 9→3, 4→2.
 */
const BASE_SEGMENTS: Record<HeroStage, number> = {
  applied: 13,
  screen: 8,
  interview: 5,
  final: 3,
  offer: 2,
};
const MAX_SEGMENTS = 16;
const FLIGHT_DURATION_MS = 800;
const SEG_HEIGHT = 7;
const SEG_GAP = 2;

interface FlyingSegmentState {
  id: string;
  fromStage: HeroStage;
  toStage: HeroStage | 'dropoff';
  fromRect: { x: number; y: number; width: number };
  toRect: { x: number; y: number; width: number };
}

interface DrainSegmentState {
  id: string;
  x: number;
  y: number;
  width: number;
  opacity: number;
}

/**
 * Build segment arrays using a delta from baseline counts.
 * Each ±1 in count directly adds/removes one segment, making transitions visible.
 * IDs are indexed from the bottom so React removes/adds from the top.
 */
function buildSegments(counts: Record<HeroStage, number>): Record<HeroStage, MobileSegment[]> {
  const result = {} as Record<HeroStage, MobileSegment[]>;
  for (const stage of HERO_STAGES) {
    const delta = counts[stage] - HERO_BASELINE_COUNTS[stage];
    const n = Math.max(1, Math.min(MAX_SEGMENTS, BASE_SEGMENTS[stage] + delta));
    const segments: MobileSegment[] = [];
    for (let i = 0; i < n; i++) {
      // i=0 is the top (newest, faintest), i=n-1 is the bottom (oldest, darkest)
      const opacity = 0.15 + (i / Math.max(n - 1, 1)) * 0.40;
      // ID indexed from bottom so the top segment's key changes on count changes
      segments.push({ id: `${stage}-${n - 1 - i}`, opacity });
    }
    result[stage] = segments;
  }
  return result;
}

/** Y position of the topmost segment in a stack with n segments. */
function stackTopY(stackRect: { y: number; height: number }, n: number): number {
  const totalHeight = n * SEG_HEIGHT + Math.max(0, n - 1) * SEG_GAP;
  return stackRect.y + stackRect.height - totalHeight;
}

interface MobilePipelineProps {
  state: PipelineState;
  onFlightComplete: (cardId: string) => void;
}

export function MobilePipeline({ state, onFlightComplete }: MobilePipelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stackRefs = useRef<Partial<Record<HeroStage, HTMLDivElement>>>({});
  const [flyingSegments, setFlyingSegments] = useState<FlyingSegmentState[]>([]);
  const [drainSegments, setDrainSegments] = useState<DrainSegmentState[]>([]);
  const processedFlights = useRef<Set<string>>(new Set());

  const segments = useMemo(() => buildSegments(state.counts), [state.counts]);

  // Check for reduced motion preference (CSS fallback also squashes durations).
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const getStackRect = useCallback((stage: HeroStage) => {
    const stackEl = stackRefs.current[stage];
    const container = containerRef.current;
    if (!stackEl || !container) return null;
    const stackBox = stackEl.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    return {
      x: stackBox.left - containerBox.left,
      y: stackBox.top - containerBox.top,
      width: stackBox.width,
      height: stackBox.height,
    };
  }, []);

  // Watch state.flying for new entries and spawn mobile animations.
  useEffect(() => {
    if (prefersReducedMotion) return;

    const newFlying: FlyingSegmentState[] = [];
    const newDrain: DrainSegmentState[] = [];

    for (const flight of state.flying) {
      if (processedFlights.current.has(flight.cardId)) continue;
      if (flight.pathName === 'bookkeeping') continue;
      processedFlights.current.add(flight.cardId);

      const fromStage = flight.from as HeroStage;
      if (!HERO_STAGES.includes(fromStage as HeroStage)) {
        // inflow — no source bar, skip flight animation
        continue;
      }

      const sourceRect = getStackRect(fromStage);
      if (!sourceRect) continue;

      const sourceSegs = segments[fromStage];
      const topY = stackTopY(sourceRect, sourceSegs.length);
      // Pick a random departure slot among the top third of the stack
      const maxSlot = Math.max(1, Math.ceil(sourceSegs.length / 3));
      const departSlot = Math.floor(Math.random() * maxSlot);
      const fromY = topY + departSlot * (SEG_HEIGHT + SEG_GAP);
      const departOpacity = sourceSegs[departSlot]?.opacity ?? 0.25;

      if (flight.to === 'dropoff') {
        newDrain.push({
          id: flight.cardId,
          x: sourceRect.x,
          y: fromY,
          width: sourceRect.width,
          opacity: Math.max(0.3, departOpacity),
        });
      } else {
        const toStage = flight.to as HeroStage;
        const destRect = getStackRect(toStage);
        if (!destRect) continue;

        const destSegs = segments[toStage];
        // Arrive one slot above current top of destination stack
        const toY = stackTopY(destRect, destSegs.length + 1);

        newFlying.push({
          id: flight.cardId,
          fromStage,
          toStage,
          fromRect: { x: sourceRect.x, y: fromY, width: sourceRect.width },
          toRect: { x: destRect.x, y: toY, width: destRect.width },
        });
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- batched response to parent flight state
    if (newFlying.length) setFlyingSegments((prev) => [...prev, ...newFlying]);
    if (newDrain.length) setDrainSegments((prev) => [...prev, ...newDrain]);
  }, [state.flying, segments, getStackRect, prefersReducedMotion]);

  // Clean up processedFlights when flights complete
  useEffect(() => {
    const currentIds = new Set(state.flying.map((f) => f.cardId));
    processedFlights.current.forEach((id) => {
      if (!currentIds.has(id)) processedFlights.current.delete(id);
    });
  }, [state.flying]);

  const handleFlyingComplete = useCallback(
    (id: string) => {
      setFlyingSegments((prev) => prev.filter((f) => f.id !== id));
      onFlightComplete(id);
    },
    [onFlightComplete],
  );

  const handleDrainComplete = useCallback(
    (id: string) => {
      setDrainSegments((prev) => prev.filter((d) => d.id !== id));
      onFlightComplete(id);
    },
    [onFlightComplete],
  );

  const stackRefCallbacks = useMemo(
    () =>
      Object.fromEntries(
        HERO_STAGES.map((stage) => [
          stage,
          (el: HTMLDivElement | null) => {
            if (el) stackRefs.current[stage] = el;
            else delete stackRefs.current[stage];
          },
        ]),
      ) as Record<HeroStage, (el: HTMLDivElement | null) => void>,
    [],
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      aria-label="Pipeline funnel"
    >
      <div className="flex gap-1.5 items-end px-1">
        {HERO_STAGES.map((stage) => (
          <div key={stage} className="flex-1 min-w-0">
            <MobileBarStack
              label={HERO_STAGE_LABELS[stage]}
              count={state.counts[stage]}
              flash={state.lastFlash[stage] ?? null}
              segments={segments[stage]}
              isOffer={stage === 'offer'}
              stackRef={stackRefCallbacks[stage]}
            />
          </div>
        ))}
      </div>

      {/* Flying segments overlay */}
      {flyingSegments.map((f) => (
        <MobileFlyingSegment
          key={f.id}
          id={f.id}
          from={f.fromRect}
          to={f.toRect}
          durationMs={FLIGHT_DURATION_MS}
          onComplete={handleFlyingComplete}
        />
      ))}

      {/* Drain segments overlay */}
      {drainSegments.map((d) => (
        <MobileDrainSegment
          key={d.id}
          id={d.id}
          x={d.x}
          y={d.y}
          width={d.width}
          opacity={d.opacity}
          onComplete={handleDrainComplete}
        />
      ))}
    </div>
  );
}
