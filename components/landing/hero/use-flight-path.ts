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
 *
 * The path coordinates live in the SVG's viewBox (1000 × 300) which is
 * stretched to the hero container via preserveAspectRatio="none". This hook
 * reads the SVG's rendered dimensions at start and scales every
 * getPointAtLength result to actual pixels so the flying DOM card lands
 * on the correct column regardless of viewport width.
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

    // Compute viewBox → pixel scale factors.
    const svg = pathElement.ownerSVGElement;
    if (!svg) return;
    const vb = svg.viewBox.baseVal;
    const svgRect = svg.getBoundingClientRect();
    const scaleX = svgRect.width / (vb.width || 1000);
    const scaleY = svgRect.height / (vb.height || 300);

    const totalLength = pathElement.getTotalLength();
    const card = cardRef.current;
    const cardW = card.offsetWidth;
    const cardH = card.offsetHeight;

    // Position the card at the path start, centered on the point.
    const sp = pathElement.getPointAtLength(0);
    card.style.transform = `translate(${sp.x * scaleX - cardW / 2}px, ${sp.y * scaleY - cardH / 2}px) scale(1)`;

    const tick = () => {
      if (!cardRef.current) return;
      const now = performance.now();
      const rawProgress = (now - startedAt) / duration;
      const progress = Math.max(0, Math.min(1, rawProgress));
      const eased = easeInOutCubic(progress);

      const pt = pathElement.getPointAtLength(eased * totalLength);
      const scaleBump = 1 + 0.04 * (1 - Math.abs(eased - 0.5) * 2);
      cardRef.current.style.transform = `translate(${pt.x * scaleX - cardW / 2}px, ${pt.y * scaleY - cardH / 2}px) scale(${scaleBump})`;

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
