"use client";

import { MiniSpark } from "./mini-spark";

interface StatTileProps {
  label: string;
  value: string | number;
  suffix?: string;
  delta?: string;
  deltaKind?: "pos" | "neg" | "neu";
  sparkData?: number[];
  sparkColor?: string;
  foot?: string;
  footRight?: string;
}

export function StatTile({
  label, value, suffix, delta, deltaKind = "neu",
  sparkData, sparkColor, foot, footRight,
}: StatTileProps) {
  return (
    <div className="dash-tile">
      <div className="dash-tile-head">
        <span className="dash-tile-label">{label}</span>
        {delta && (
          <span className={`dash-tile-delta ${deltaKind}`}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              {deltaKind === "pos" && (
                <path d="M1.5 5.5l2.5-2.5 2.5 2.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
              )}
              {deltaKind === "neg" && (
                <path d="M1.5 2.5l2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
              )}
              {deltaKind === "neu" && (
                <path d="M1.5 4h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              )}
            </svg>
            {delta}
          </span>
        )}
      </div>
      <div className="dash-tile-row">
        <div>
          <span className="dash-tile-value">{value}</span>
          {suffix && <span className="dash-tile-value-suffix">{suffix}</span>}
        </div>
        {sparkData && sparkData.length > 1 && (
          <MiniSpark points={sparkData} stroke={sparkColor} />
        )}
      </div>
      {(foot || footRight) && (
        <div className="dash-tile-foot">
          <span>{foot}</span>
          <span>{footRight}</span>
        </div>
      )}
    </div>
  );
}
