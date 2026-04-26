"use client";

import { useState } from "react";
import type { ActivityItem } from "./types";

interface FeedCardProps {
  activity: ActivityItem[];
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "move", label: "Moves" },
  { id: "add", label: "Adds" },
  { id: "note", label: "Notes" },
  { id: "reminder", label: "Reminders" },
];

function FeedIcon({ kind }: { kind: string }) {
  return (
    <span className={`feed-icon kind-${kind}`}>
      {kind === "move" && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5h6m0 0L5 2m3 3L5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {kind === "add" && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )}
      {kind === "note" && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M3 2h4l2 2v4a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      )}
      {kind === "reminder" && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="5" cy="5.3" r="3.3" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5 3.8v1.5L6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export function FeedCard({ activity }: FeedCardProps) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? activity : activity.filter((a) => a.kind === filter);

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <span className="card-index">[06]</span>
          <span className="card-title">Recent activity</span>
        </div>
      </div>
      <div className="feed-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`feed-filter ${filter === f.id ? "is-active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="feed-list">
        {filtered.length === 0 ? (
          <div style={{ padding: "16px 6px", color: "var(--ink-3)", fontSize: 12 }}>
            No activity to show.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id + item.occurredAt} className="feed-item">
              <FeedIcon kind={item.kind} />
              <div className="feed-body">
                <div className="feed-text">
                  <strong>{item.company} &mdash; {item.roleTitle}</strong>
                  {item.kind === "move" && item.toStatus && (
                    <> moved to <span className="feed-badge">{item.toStatus}</span></>
                  )}
                  {item.kind === "add" && <> added to pipeline</>}
                </div>
                <div className="feed-time">{timeAgo(item.occurredAt)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
