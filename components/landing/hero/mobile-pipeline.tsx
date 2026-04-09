'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HERO_STAGES, type HeroStage } from '@/lib/landing/constants';
import type { PipelineState, PipelineAction } from './use-pipeline-state';
import { MobileBarStack, type MobileSegment } from './mobile-bar-stack';
import { MobileFlyingSegment } from './mobile-flying-segment';
import { MobileDrainSegment } from './mobile-drain-segment';

const LABELS: Record<HeroStage, string> = {
  applied: 'Applied',
  screen: 'Screen',
  interview: 'Interview',
  final: 'Final',
  offer: 'Offer',
};

const MAX_SEGMENTS = 14;
const FLIGHT_DURATION_MS = 450;

interface FlyingSegmentState {
  id: string;
  fromStage: HeroStage;
  toStage: HeroStage | 'dropoff';
  fromRect: { x: number; y: number; width: number };
  toRect: { x: number; y: number; width: number };
  isOffer: boolean;
}

interface DrainSegmentState {
  id: string;
  x: number;
  y: number;
  width: number;
  opacity: number;
}

/** Build proportional segment arrays from counts. */
function buildSegments(counts: Record<HeroStage, number>): Record<HeroStage, MobileSegment[]> {
  const maxCount = Math.max(...HERO_STAGES.map((s) => counts[s]), 1);
  const result = {} as Record<HeroStage, MobileSegment[]>;
  for (const stage of HERO_STAGES) {
    const n = Math.round((counts[stage] / maxCount) * MAX_SEGMENTS);
    const segments: MobileSegment[] = [];
    for (let i = 0; i < n; i++) {
      // Opacity: higher at bottom (older), lower at top (newer)
      const opacity = 0.08 + (1 - i / Math.max(n - 1, 1)) * 0.14;
      segments.push({ id: `${stage}-${i}`, opacity });
    }
    result[stage] = segments;
  }
  return result;
}

interface MobilePipelineProps {
  state: PipelineState;
  dispatch: React.ActionDispatch<[action: PipelineAction]>;
  onFlightComplete: (cardId: string) => void;
}

export function MobilePipeline({ state, dispatch, onFlightComplete }: MobilePipelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<Partial<Record<HeroStage, HTMLDivElement>>>({});
  const [flyingSegments, setFlyingSegments] = useState<FlyingSegmentState[]>([]);
  const [drainSegments, setDrainSegments] = useState<DrainSegmentState[]>([]);
  const processedFlights = useRef<Set<string>>(new Set());

  const segments = useMemo(() => buildSegments(state.counts), [state.counts]);

  // Check for reduced motion preference.
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const getBarRect = useCallback((stage: HeroStage) => {
    const barEl = barRefs.current[stage];
    const container = containerRef.current;
    if (!barEl || !container) return null;
    const barBox = barEl.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    return {
      x: barBox.left - containerBox.left,
      y: barBox.top - containerBox.top,
      width: barBox.width,
      height: barBox.height,
    };
  }, []);

  // Watch state.flying for new entries and spawn mobile animations.
  useEffect(() => {
    if (prefersReducedMotion) return;

    for (const flight of state.flying) {
      if (processedFlights.current.has(flight.cardId)) continue;
      if (flight.pathName === 'bookkeeping') continue;
      processedFlights.current.add(flight.cardId);

      const fromStage = flight.from as HeroStage;
      if (!HERO_STAGES.includes(fromStage as HeroStage)) {
        // inflow — no source bar, skip flight animation (handled by segment-enter)
        continue;
      }

      const sourceRect = getBarRect(fromStage);
      if (!sourceRect) continue;

      // Pick a random y position within the source bar for departure point
      const segHeight = 5;
      const segGap = 1.5;
      const sourceSegments = segments[fromStage];
      const randomIdx = Math.floor(Math.random() * Math.max(sourceSegments.length, 1));
      const segY = sourceRect.y + sourceRect.height - (randomIdx + 1) * (segHeight + segGap);
      const removedOpacity = sourceSegments[randomIdx]?.opacity ?? 0.12;

      if (flight.to === 'dropoff') {
        // Drain animation
        setDrainSegments((prev) => [
          ...prev,
          {
            id: flight.cardId,
            x: sourceRect.x,
            y: segY,
            width: sourceRect.width,
            opacity: removedOpacity,
          },
        ]);
      } else {
        // Forward flight
        const toStage = flight.to as HeroStage;
        const destRect = getBarRect(toStage);
        if (!destRect) continue;

        // Destination: top of the destination bar
        const destSegments = segments[toStage];
        const destY = destRect.y + destRect.height - (destSegments.length + 1) * (segHeight + segGap);

        setFlyingSegments((prev) => [
          ...prev,
          {
            id: flight.cardId,
            fromStage,
            toStage,
            fromRect: { x: sourceRect.x, y: segY, width: sourceRect.width },
            toRect: { x: destRect.x, y: destY, width: destRect.width },
            isOffer: toStage === 'offer',
          },
        ]);
      }
    }
  }, [state.flying, segments, getBarRect, prefersReducedMotion]);

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
      // Drain = dropoff, the desktop handleComplete already handles count via dispatch
      onFlightComplete(id);
    },
    [onFlightComplete],
  );

  const setBarRef = useCallback(
    (stage: HeroStage) => (el: HTMLDivElement | null) => {
      if (el) barRefs.current[stage] = el;
    },
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
          <div key={stage} ref={setBarRef(stage)} className="flex-1 min-w-0">
            <MobileBarStack
              label={LABELS[stage]}
              count={state.counts[stage]}
              flash={state.lastFlash[stage] ?? null}
              segments={segments[stage]}
              isOffer={stage === 'offer'}
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
          isOffer={f.isOffer}
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
