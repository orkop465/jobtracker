'use client';

import { useEffect, useRef } from 'react';
import { easeInOutCubic } from '@/lib/motion/easings';

interface UseFlightPathOptions {
  /** SVG path element to follow (must implement getPointAtLength). */
  pathElement: SVGPathElement | null;
  /** Flight duration in ms (per spec §6.3: 640ms). */
  duration: number;
  /** Timestamp (performance.now-compatible) when the flight began. */
  startedAt: number;
  /** Ref to the card element whose transform will be mutated. */
  cardRef: React.RefObject<HTMLElement | null>;
  /** Called when progress reaches 1. */
  onComplete: () => void;
}

/**
 * Drives one flying card along a static SVG path. Uses requestAnimationFrame
 * to update transform each frame. Hardware-accelerated (transform + opacity).
 * Respects prefers-reduced-motion by skipping directly to onComplete.
 */
export function useFlightPath({
  pathElement,
  duration,
  startedAt,
  cardRef,
  onComplete,
}: UseFlightPathOptions) {
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!pathElement || !cardRef.current) return;

    // Reduced-motion: finish immediately, no animation.
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }

    const totalLength = pathElement.getTotalLength();
    const startPoint = pathElement.getPointAtLength(0);
    const card = cardRef.current;
    card.style.transform = `translate(${startPoint.x}px, ${startPoint.y}px) scale(1)`;

    const tick = () => {
      if (!cardRef.current) return;
      const now = performance.now();
      const rawProgress = (now - startedAt) / duration;
      const progress = Math.max(0, Math.min(1, rawProgress));
      const eased = easeInOutCubic(progress);

      const pt = pathElement.getPointAtLength(eased * totalLength);
      // Scale bump peaks at mid-flight and returns to 1.0 at either end.
      const scaleBump = 1 + 0.04 * (1 - Math.abs(eased - 0.5) * 2);
      cardRef.current.style.transform = `translate(${pt.x}px, ${pt.y}px) scale(${scaleBump})`;

      if (progress >= 1) {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathElement, startedAt]);
}
