"use client";

import { relativeTime, type Resume } from "./types";

interface Props {
  resume: Resume;
  isActive: boolean;
  onClick: () => void;
}

// TEMPORARY stop-gap (Task 3.5). Replaced by persisted-tag chip stack in Task 3.6.
type LegacyDerivedTag = "swe" | "pm" | "design" | "data" | "ml" | "other";
const LEGACY_TAG_PATTERNS: { tag: LegacyDerivedTag; rx: RegExp }[] = [
  { tag: "ml", rx: /\b(ml|machine\s?learning|ai|llm|nlp|recsys)\b/i },
  { tag: "data", rx: /\b(data|analyst|analytics|scientist)\b/i },
  { tag: "design", rx: /\b(design|ux|ui)\b/i },
  { tag: "pm", rx: /\b(pm|product\s?manager|product)\b/i },
  { tag: "swe", rx: /\b(swe|sde|engineer|frontend|backend|fullstack|full-stack|developer|software)\b/i },
];
function deriveLegacyTag(label: string): LegacyDerivedTag {
  for (const { tag, rx } of LEGACY_TAG_PATTERNS) {
    if (rx.test(label)) return tag;
  }
  return "other";
}

export function LibraryCard({ resume, isActive, onClick }: Props) {
  const tag = deriveLegacyTag(resume.label);
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
