'use client';

import { useEffect, useState } from 'react';

interface FlightTrailProps {
  /** SVG path d-string to draw. */
  d: string;
  /** Total length of the path in viewBox units (from getTotalLength()). */
  totalLength: number;
  /** How long the draw-in animation runs (matches the flight duration). */
  durationMs: number;
}

/**
 * Short-lived green trail that draws behind a flying card on a forward
 * (survive) progression. Lifecycle:
 *
 *   1. Mount with stroke-dashoffset = totalLength (line invisible).
 *   2. Next frame: animate stroke-dashoffset → 0 over `durationMs` so the
 *      line "draws in" alongside the card's flight.
 *   3. After `durationMs`: fade stroke-opacity → 0 over 240ms.
 *
 * The orchestrator removes the trail from its activeTrails state ~280ms
 * after the flight completes, which is when this fade has finished.
 */
export function FlightTrail({ d, totalLength, durationMs }: FlightTrailProps) {
  const [phase, setPhase] = useState<'idle' | 'drawing' | 'fading'>('idle');

  useEffect(() => {
    // Kick off the draw on the next frame so the initial idle state is
    // committed before the transition begins.
    const rafId = requestAnimationFrame(() => setPhase('drawing'));
    const fadeTimer = setTimeout(() => setPhase('fading'), durationMs);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(fadeTimer);
    };
  }, [durationMs]);

  const isDrawing = phase === 'drawing';
  const isFading = phase === 'fading';

  return (
    <path
      d={d}
      fill="none"
      stroke="var(--color-survive)"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeOpacity={isFading ? 0 : 0.55}
      style={{
        strokeDasharray: totalLength,
        strokeDashoffset: isDrawing || isFading ? 0 : totalLength,
        transition: isDrawing
          ? `stroke-dashoffset ${durationMs}ms cubic-bezier(0.65, 0, 0.35, 1)`
          : isFading
          ? 'stroke-opacity 240ms ease-out'
          : 'none',
      }}
    />
  );
}
