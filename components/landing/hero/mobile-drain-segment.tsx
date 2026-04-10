'use client';

import { useEffect, useState } from 'react';

const DRAIN_DURATION_MS = 600;

interface MobileDrainSegmentProps {
  id: string;
  x: number;
  y: number;
  width: number;
  opacity: number;
  onComplete: (id: string) => void;
}

export function MobileDrainSegment({ id, x, y, width, opacity, onComplete }: MobileDrainSegmentProps) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDone(true);
      onComplete(id);
    }, DRAIN_DURATION_MS);
    return () => clearTimeout(t);
  }, [id, onComplete]);

  if (done) return null;

  return (
    <div
      className="absolute h-[7px] rounded-[1.5px] pointer-events-none z-30"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        backgroundColor: 'var(--color-sink)',
        ['--seg-opacity' as string]: opacity,
        opacity: Math.max(0.3, opacity),
        animation: `segment-drain ${DRAIN_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
      }}
    />
  );
}
