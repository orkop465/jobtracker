"use client";

import { deriveTag, relativeTime, type Resume } from "./types";

interface Props {
  resume: Resume;
  isActive: boolean;
  onClick: () => void;
}

export function LibraryCard({ resume, isActive, onClick }: Props) {
  const tag = deriveTag(resume.label);
  const sizeKb = Math.max(1, Math.round(resume.sizeBytes / 1024));

  return (
    <button
      type="button"
      onClick={onClick}
      className={`res-card ${isActive ? "is-active" : ""}`}
    >
      <span className={`res-card-pin tag-${tag}`} />
      <h3 className="res-card-title">{resume.label}</h3>
      <div className="res-card-meta">
        <span>uploaded {relativeTime(resume.createdAt)}</span>
        <span className="sep">·</span>
        <span>last sent {relativeTime(resume.lastAppliedAt)}</span>
      </div>
      <div className="res-card-tags">
        <span className="res-card-tag">{tag}</span>
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
