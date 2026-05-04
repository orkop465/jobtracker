"use client";

import { StarRow } from "./star-row";
import { MiniRedactedPdf } from "./mini-redacted-pdf";
import type { PublicResumeListItem } from "./types";
import { shortRoleLabel, shortSeniorityLabel } from "./types";

interface Props {
  resume: PublicResumeListItem;
  thumbUrl: string | null;
  isSaved: boolean;
  onOpen: () => void;
  onSave: () => void;
}

function pluralAgo(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.max(0, Math.round((Date.now() - d.getTime()) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const mo = Math.round(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

export function MarketCard({ resume, thumbUrl, isSaved, onOpen, onSave }: Props) {
  const eyebrow = `${shortSeniorityLabel(resume.seniority)} · ${shortRoleLabel(resume.roleCategory)} · ${pluralAgo(resume.publishedAt)}`;
  const tags = [shortRoleLabel(resume.roleCategory), shortSeniorityLabel(resume.seniority)];
  const rating = resume.ratingAverage ?? 0;
  return (
    <div
      className={`market-card ${resume.featured ? "is-featured" : ""}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {resume.featured && <span className="market-card-badge featured">Editor&apos;s pick</span>}
      <div className="market-card-thumb">
        <MiniRedactedPdf thumbUrl={thumbUrl} alt={resume.title} />
      </div>
      <div className="market-card-body">
        <div className="market-card-meta-row">
          <span>{eyebrow}</span>
        </div>
        <h3 className="market-card-h">{resume.title}</h3>
        {resume.notes && <p className="market-card-snippet">{resume.notes}</p>}
        <div className="market-card-tags">
          {tags.map((t) => (
            <span key={t} className="market-card-tag">
              {t}
            </span>
          ))}
        </div>
        <div className="market-card-footer">
          <div className="market-card-rating">
            <StarRow rating={rating} />
            <span className="market-card-rating-num">
              {resume.ratingCount > 0 ? rating.toFixed(1) : "—"}
            </span>
            <span className="market-card-rating-count">· {resume.ratingCount}</span>
          </div>
          <div className="market-card-actions">
            <button
              className={`market-card-mini-btn ${isSaved ? "is-saved" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              title={isSaved ? "Saved" : "Save"}
              aria-label={isSaved ? "Unsave" : "Save"}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill={isSaved ? "currentColor" : "none"}>
                <path
                  d="M3 1.5h6a0.5.5 0 01.5.5v9l-3.5-2-3.5 2v-9a0.5.5 0 01.5-.5z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
