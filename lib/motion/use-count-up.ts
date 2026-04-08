'use client';

import { useEffect, useRef, useState } from 'react';
import { easeOutQuart } from './easings';

/**
 * Pure function: given a target and normalized progress (0–1), returns
 * the current integer value, eased via easeOutQuart. Extracted for unit
 * testing; the hook below uses it.
 */
export function computeCountUpValue(target: number, progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return Math.round(target * easeOutQuart(p));
}

interface UseCountUpOptions {
  /** Animate when this becomes true (e.g., useInView result). */
  start: boolean;
  /** Duration in ms. Default 1200. */
  duration?: number;
}

/**
 * Counts a number from 0 to `target` over `duration` ms once `start` is true.
 * Respects prefers-reduced-motion by snapping to target immediately.
 */
export function useCountUp(target: number, { start, duration = 1200 }: UseCountUpOptions): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!start) return;

    if (typeof window === 'undefined') {
      setValue(target);
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(target);
      return;
    }

    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = (now - startTime) / duration;
      setValue(computeCountUpValue(target, progress));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [start, target, duration]);

  return value;
}
