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

const NUM_DOTS = 12;
const TRAIL_PORTION = 0.3; // trail covers the trailing 30% of the drawn path
const FADE_MS = 280;
const MAX_RADIUS = 10; // front dot (card-sized feel)
const MIN_RADIUS = 1.5; // tail dot

/**
 * Particle-based flight trail rendered as SVG circles that follow the card
 * along the path. Uses direct DOM manipulation (no React re-renders) for
 * smooth 60fps updates.
 *
 * Visual: a tapered comet tail — large soft green circles near the card
 * that shrink and fade to transparent toward the tail. The front 20% of
 * dots blend from green to white for a hot-core gradient effect.
 *
 * The trail is rendered inside the parent SVG (same viewBox as the path
 * defs), so coordinates from getPointAtLength are used directly.
 */
export function FlightTrail({ pathElement, durationMs, startedAt }: FlightTrailProps) {
  const groupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const g = groupRef.current;
    if (!g || !pathElement) return;

    const totalLength = pathElement.getTotalLength();
    const trailLength = TRAIL_PORTION * totalLength;

    // Create circle elements once — green base layer + white highlight layer
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

      // Fade multiplier: after the flight ends, fade everything over FADE_MS
      const fadeMul = rawProgress > 1 ? Math.max(0, 1 - (elapsed - durationMs) / FADE_MS) : 1;
      if (fadeMul <= 0) return; // fully faded — stop

      const currentLength = eased * totalLength;
      const trailStart = Math.max(0, currentLength - trailLength);

      for (let i = 0; i < NUM_DOTS; i++) {
        // t: 0 = tail, 1 = front (near card)
        const t = i / (NUM_DOTS - 1);
        const lengthAt = trailStart + t * (currentLength - trailStart);
        const pt = pathElement.getPointAtLength(lengthAt);

        // Radius: small at tail → large at front
        const r = MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
        // Green opacity: faint at tail → solid at front
        const greenOp = t * 0.4 * fadeMul;

        greens[i].setAttribute('cx', String(pt.x));
        greens[i].setAttribute('cy', String(pt.y));
        greens[i].setAttribute('r', String(r));
        greens[i].setAttribute('opacity', String(greenOp));

        // White highlight: only the front 25% of dots get a smaller white core
        const whiteFrac = t > 0.75 ? (t - 0.75) / 0.25 : 0;
        const whiteOp = whiteFrac * 0.35 * fadeMul;
        const whiteR = r * 0.5;

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
