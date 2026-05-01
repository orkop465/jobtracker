"use client";

import { sourceBucketLabel, type SourceBucket } from "@/lib/board/stage-meta";
import type { CardStyle, Density } from "./tweaks-panel";

interface BoardFiltersProps {
  search: string;
  onSearchChange: (q: string) => void;
  sourceFilter: SourceBucket;
  onSourceChange: (b: SourceBucket) => void;
  sourceCounts: Record<SourceBucket, number>;
  density: Density;
  onDensityChange: (d: Density) => void;
  cardStyle: CardStyle;
  onCardStyleChange: (s: CardStyle) => void;
  meta: {
    responseRate: number | null;
    inFlight: number | null;
    stalled: number | null;
  };
}

const PILL_ORDER: SourceBucket[] = ["all", "referral", "board", "recruit", "direct"];

export function BoardFilters({
  search,
  onSearchChange,
  sourceFilter,
  onSourceChange,
  sourceCounts,
  density,
  onDensityChange,
  cardStyle,
  onCardStyleChange,
  meta,
}: BoardFiltersProps) {
  const metaParts: string[] = [];
  if (meta.responseRate != null) metaParts.push(`${meta.responseRate}% response`);
  if (meta.inFlight != null) metaParts.push(`${meta.inFlight} in flight`);
  if (meta.stalled != null && meta.stalled > 0) metaParts.push(`${meta.stalled} stalled`);

  return (
    <div className="board-filters">
      <div className="board-search">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="5.5" cy="5.5" r="3.8" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M11.5 11.5L8.5 8.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="text"
          placeholder="Search role or company…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="board-pills">
        {PILL_ORDER.map((b) => (
          <button
            key={b}
            type="button"
            className={`board-pill ${sourceFilter === b ? "is-active" : ""}`}
            onClick={() => onSourceChange(b)}
          >
            {sourceBucketLabel(b)}
            <span className="pill-count">{sourceCounts[b] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="board-spacer" />

      <div className="board-meta">
        <span className="dot" />
        {metaParts.length > 0 ? metaParts.join(" · ") : "synced just now"}
      </div>

      <div className="density-toggle" role="group" aria-label="Card density">
        <button
          type="button"
          className={density === "compact" ? "is-active" : ""}
          title="Compact"
          aria-label="Compact density"
          onClick={() => onDensityChange("compact")}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path
              d="M2 4h9M2 6.5h9M2 9h9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className={density === "rich" ? "is-active" : ""}
          title="Rich"
          aria-label="Rich density"
          onClick={() => onDensityChange("rich")}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect
              x="2"
              y="2.5"
              width="9"
              height="3"
              rx="0.5"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <rect
              x="2"
              y="7"
              width="9"
              height="3.5"
              rx="0.5"
              stroke="currentColor"
              strokeWidth="1.3"
            />
          </svg>
        </button>
      </div>

      <div className="density-toggle" role="group" aria-label="Card style">
        <button
          type="button"
          className={cardStyle === "pinned" ? "is-active" : ""}
          title="Pinned"
          aria-label="Pinned card style"
          onClick={() => onCardStyleChange("pinned")}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="2.5" y="3.5" width="8" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="6.5" cy="2.5" r="1.3" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          className={cardStyle === "taped" ? "is-active" : ""}
          title="Taped"
          aria-label="Taped card style"
          onClick={() => onCardStyleChange("taped")}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="2.5" y="4" width="8" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="3.7" y="2.2" width="4" height="2" transform="rotate(-8 5.7 3.2)" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </button>
        <button
          type="button"
          className={cardStyle === "plain" ? "is-active" : ""}
          title="Plain"
          aria-label="Plain card style"
          onClick={() => onCardStyleChange("plain")}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="2.5" y="3" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
