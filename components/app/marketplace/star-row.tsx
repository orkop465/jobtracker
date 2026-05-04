"use client";

interface Props {
  rating: number;
  max?: number;
}

export function StarRow({ rating, max = 5 }: Props) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="market-card-stars" aria-label={`${rating.toFixed(1)} out of ${max}`}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < full || (i === full && half);
        return (
          <svg key={i} viewBox="0 0 12 12" className={filled ? "filled" : ""}>
            <path
              d="M6 1l1.5 3.3 3.5.4-2.6 2.5.7 3.5L6 9l-3.1 1.7.7-3.5L1 4.7l3.5-.4z"
              fill={filled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>
  );
}
