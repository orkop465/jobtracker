"use client";

interface MiniSparkProps {
  points: number[];
  stroke?: string;
  w?: number;
  h?: number;
}

export function MiniSpark({ points, stroke = "var(--accent)", w = 72, h = 28 }: MiniSparkProps) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const pts = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - 2 - ((v - min) / range) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" L ");

  const lastY = h - 2 - ((points[points.length - 1] - min) / range) * (h - 4);

  return (
    <svg className="dash-tile-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path
        d={`M ${pts}`}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={w} cy={lastY} r="1.8" fill={stroke} />
    </svg>
  );
}
