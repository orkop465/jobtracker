'use client';

import { useEffect, useRef, useState } from 'react';

interface Rect {
  x: number;
  y: number;
  width: number;
}

interface MobileFlyingSegmentProps {
  id: string;
  from: Rect;
  to: Rect;
  durationMs: number;
  isOffer: boolean;
  onComplete: (id: string) => void;
}

const ARC_HEIGHT = 12; // pixels of upward arc at midpoint

export function MobileFlyingSegment({
  id,
  from,
  to,
  durationMs,
  isOffer,
  onComplete,
}: MobileFlyingSegmentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const t = Math.min(elapsed / durationMs, 1);

      // Ease out quart
      const ease = 1 - Math.pow(1 - t, 4);

      // Interpolate x and width
      const x = from.x + (to.x - from.x) * ease;
      const y = from.y + (to.y - from.y) * ease - Math.sin(t * Math.PI) * ARC_HEIGHT;
      const width = from.width + (to.width - from.width) * ease;

      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.width = `${width}px`;

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDone(true);
        onComplete(id);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [id, from, to, durationMs, onComplete]);

  if (done) return null;

  return (
    <div
      ref={ref}
      className="absolute top-0 left-0 h-[5px] rounded-[1.5px] pointer-events-none z-30"
      style={{
        backgroundColor: isOffer ? 'var(--color-survive)' : 'var(--color-survive)',
        opacity: 0.45,
        transform: `translate(${from.x}px, ${from.y}px)`,
        width: `${from.width}px`,
      }}
    />
  );
}
