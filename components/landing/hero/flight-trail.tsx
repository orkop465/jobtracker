'use client';

import { useEffect, useRef } from 'react';
import { easeInOutCubic } from '@/lib/motion/easings';

interface FlightTrailProps {
  /** The SVG path element the card is flying along. */
  pathElement: SVGPathElement;
  /** Flight duration in ms (same as the card's). */
  durationMs: number;
  /** performance.now() timestamp when the flight started. */
  startedAt: number;
}

const NUM_DOTS = 14;
const TRAIL_PORTION = 0.5; // trail covers the trailing 50% of the drawn path
const MAX_RADIUS = 6;
const MIN_RADIUS = 1;

/**
 * Particle-based flight trail rendered as SVG circles that follow the card
 * along the path. Uses direct DOM manipulation (no React re-renders) for
 * smooth 60fps updates.
 *
 * The trail sits BEHIND the card (the front dot is offset back from the
 * card's current position) and tapers from ~6px radius near the card to
 * ~1px at the tail. A Gaussian blur filter softens the dots into a glow.
 *
 * The trail begins fading at 85% flight progress so it's nearly gone by
 * the time the card lands and unmounts — no orphaned trail visible after
 * the card disappears.
 */
export function FlightTrail({ pathElement, durationMs, startedAt }: FlightTrailProps) {
  const groupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const g = groupRef.current;
    if (!g || !pathElement) return;

    const totalLength = pathElement.getTotalLength();
    const trailLength = TRAIL_PORTION * totalLength;
    // The front dot sits this far BEHIND the card's actual position.
    const frontOffset = 0.06 * totalLength;

    // Create circle elements once — green base + white highlight
    const greens: SVGCircleElement[] = [];
    const whites: SVGCircleElement[] = [];
    const svgNs = 'http://www.w3.org/2000/svg';

    for (let i = 0; i < NUM_DOTS; i++) {
      const gc = document.createElementNS(svgNs, 'circle');
      gc.setAttribute('fill', 'var(--color-survive)');
      g.appendChild(gc);
      greens.push(gc);

      const wc = document.createElementNS(svgNs, 'circle');
      wc.setAttribute('fill', 'white');
      g.appendChild(wc);
      whites.push(wc);
    }

    let rafId: number;

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const rawProgress = elapsed / durationMs;
      const progress = Math.min(rawProgress, 1);
      const eased = easeInOutCubic(progress);

      // Begin fading at 85% progress so the trail is nearly gone when the
      // card lands and unmounts. Fully faded by 100%.
      const fadeMul = progress > 0.85 ? Math.max(0, 1 - (progress - 0.85) / 0.15) : 1;
      if (fadeMul <= 0 && rawProgress >= 1) return; // done

      const cardLength = eased * totalLength;
      // Front of trail sits behind the card; back of trail is trailLength further back.
      const frontLength = Math.max(0, cardLength - frontOffset);
      const backLength = Math.max(0, frontLength - trailLength);

      for (let i = 0; i < NUM_DOTS; i++) {
        // t: 0 = tail (back), 1 = front (near card)
        const t = i / (NUM_DOTS - 1);
        const lengthAt = backLength + t * (frontLength - backLength);
        const pt = pathElement.getPointAtLength(lengthAt);

        // Radius: tapers from front to tail
        const r = MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
        // Green opacity: 0 at tail → 0.5 at front, modulated by fade
        const greenOp = t * 0.5 * fadeMul;

        greens[i].setAttribute('cx', String(pt.x));
        greens[i].setAttribute('cy', String(pt.y));
        greens[i].setAttribute('r', String(r));
        greens[i].setAttribute('opacity', String(greenOp));

        // White highlight: only the front 30% of dots
        const whiteFrac = t > 0.7 ? (t - 0.7) / 0.3 : 0;
        const whiteOp = whiteFrac * 0.3 * fadeMul;
        const whiteR = r * 0.45;

        whites[i].setAttribute('cx', String(pt.x));
        whites[i].setAttribute('cy', String(pt.y));
        whites[i].setAttribute('r', String(whiteR));
        whites[i].setAttribute('opacity', String(whiteOp));
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [pathElement, durationMs, startedAt]);

  return <g ref={groupRef} filter="url(#trailBlur)" />;
}
