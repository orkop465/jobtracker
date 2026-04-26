"use client";

import type { InsightData } from "./types";

interface InsightCardProps {
  insight: InsightData | null;
}

export function InsightCard({ insight }: InsightCardProps) {
  if (!insight) return null;

  const weekNum = Math.ceil(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  return (
    <div className="card">
      <div className="insight">
        <div className="insight-head">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5 3v2.5M5 7v0.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Insight &middot; week {weekNum}
        </div>
        <div className="insight-body">{insight.message}</div>
        <div className="insight-foot">
          <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>data-derived</span>
          {insight.cta && (
            <a href="#" className="insight-link">
              {insight.cta}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5h6m0 0L5 2m3 3L5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
