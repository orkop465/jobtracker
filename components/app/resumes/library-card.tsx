"use client";

import { relativeTime, type Resume } from "./types";

interface Props {
  resume: Resume;
  isActive: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const MAX_VISIBLE_CHIPS = 3;

export function LibraryCard({ resume, isActive, onClick, onContextMenu }: Props) {
  const sizeKb = Math.max(1, Math.round(resume.sizeBytes / 1024));
  const visible = resume.tags.slice(0, MAX_VISIBLE_CHIPS);
  const overflow = Math.max(0, resume.tags.length - MAX_VISIBLE_CHIPS);

  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`res-card ${isActive ? "is-active" : ""}`}
    >
      <h3 className="res-card-title">{resume.label}</h3>
      <div className="res-card-meta">
        <span>uploaded {relativeTime(resume.createdAt)}</span>
        <span className="sep">·</span>
        <span>last sent {relativeTime(resume.lastAppliedAt)}</span>
      </div>
      <div className="res-card-tags">
        {visible.map((t) => (
          <span
            key={t.id}
            className="res-card-tag"
            style={{
              borderColor: t.color ?? "var(--color-line)",
              color: t.color ?? "var(--color-ink-muted)",
            }}
          >
            {t.name}
          </span>
        ))}
        {overflow > 0 && <span className="res-card-tag">+{overflow}</span>}
        <span className="res-card-tag">{sizeKb} KB</span>
      </div>
      <div className="res-card-stats">
        <div className="res-card-stat">
          <div className="res-card-stat-num tabular-nums">{resume.sentCount}</div>
          <div className="res-card-stat-label">sent</div>
        </div>
      </div>
    </button>
  );
}
