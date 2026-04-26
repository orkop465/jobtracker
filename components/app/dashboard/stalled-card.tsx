"use client";

import { CompanyLogo } from "./company-logo";
import type { StalledItem } from "./types";

interface StalledCardProps {
  apps: StalledItem[];
  onSelect?: (appId: string) => void;
}

export function StalledCard({ apps, onSelect }: StalledCardProps) {
  if (apps.length === 0) return null;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <span className="card-index">[03]</span>
          <span className="card-title">Stalled applications</span>
          <span className="card-sub">&middot; 10+ days</span>
        </div>
        <button className="card-action">Nudge all &rarr;</button>
      </div>
      <div className="stalled-list">
        {apps.map((s) => (
          <div key={s.id} className="stalled-row" onClick={() => onSelect?.(s.id)}>
            <CompanyLogo company={s.company} size={22} />
            <div style={{ minWidth: 0 }}>
              <div className="stalled-role">{s.roleTitle}</div>
              <div className="stalled-company">{s.company} &middot; {s.statusLabel}</div>
            </div>
            <span className={`stalled-days ${s.daysSinceUpdate >= 14 ? "" : "warn"}`}>
              {s.daysSinceUpdate}d
            </span>
            <button className="stalled-action" onClick={(e) => { e.stopPropagation(); }}>
              Nudge
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
