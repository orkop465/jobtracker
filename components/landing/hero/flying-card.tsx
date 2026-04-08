'use client';

import { useRef } from 'react';
import { CompanyCard } from './company-card';
import { useFlightPath } from './use-flight-path';

interface FlyingCardProps {
  cardId: string;
  templateIndex: number;
  pathElement: SVGPathElement | null;
  startedAt: number;
  durationMs: number;
  onComplete: (cardId: string) => void;
}

export function FlyingCard({
  cardId,
  templateIndex,
  pathElement,
  startedAt,
  durationMs,
  onComplete,
}: FlyingCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useFlightPath({
    pathElement,
    duration: durationMs,
    startedAt,
    cardRef: ref,
    onComplete: () => onComplete(cardId),
  });

  return (
    <CompanyCard
      ref={ref}
      templateIndex={templateIndex}
      className="absolute top-0 left-0 z-20 bg-[var(--color-ink)] text-[var(--color-canvas)] shadow-[0_10px_24px_rgba(0,0,0,0.18)] border-[rgba(21,128,61,0.35)] pointer-events-none"
      style={{ willChange: 'transform', transform: 'translate(-9999px, -9999px)' }}
    />
  );
}
