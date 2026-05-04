"use client";

import { StarRow } from "./star-row";
import type { PublicResumeListItem } from "./types";
import { shortRoleLabel, shortSeniorityLabel } from "./types";

interface Props {
  resume: PublicResumeListItem;
  isSaved: boolean;
  onOpen: () => void;
  onSave: () => void;
}

export function MarketRow({ resume, isSaved, onOpen, onSave }: Props) {
  const tags = [shortRoleLabel(resume.roleCategory), shortSeniorityLabel(resume.seniority)];
  const rating = resume.ratingAverage ?? 0;
  return (
    <div className="market-row" onClick={onOpen}>
      <div className="market-row-thumb" />
      <div className="market-row-content">
        <h3 className="market-row-title">{resume.title}</h3>
        <div className="market-row-meta">
          {shortSeniorityLabel(resume.seniority)} · {shortRoleLabel(resume.roleCategory)}
        </div>
      </div>
      <div className="market-row-tags">
        {tags.map((t) => (
          <span key={t} className="market-card-tag">
            {t}
          </span>
        ))}
      </div>
      <div className="market-card-rating">
        <StarRow rating={rating} />
        <span className="market-card-rating-num">{resume.ratingCount > 0 ? rating.toFixed(1) : "—"}</span>
        <span className="market-card-rating-count">· {resume.ratingCount}</span>
      </div>
      <button
        className={`market-card-mini-btn ${isSaved ? "is-saved" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
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
  );
}
