"use client";

import { useEffect, useState } from "react";
import type { PublicResumeDetail } from "./types";
import { shortRoleLabel, shortSeniorityLabel } from "./types";

interface Props {
  detail: PublicResumeDetail;
  isOwn: boolean;
  onClose: () => void;
  onRated: (stars: number | null) => void;
  onToast: (msg: string) => void;
}

const RATE_TAGS = [
  "Strong bullets",
  "Clear narrative",
  "Great metrics",
  "Career change",
  "Concise",
  "Visual design",
];

export function PeekModal({ detail, isOwn, onClose, onRated, onToast }: Props) {
  const [myRating, setMyRating] = useState(detail.myRating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [myTags, setMyTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(detail.myRating !== null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleTag = (t: string) =>
    setMyTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  async function submit() {
    if (!myRating || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/${detail.id}/rating`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars: myRating }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onToast(err?.error ?? "Failed to submit rating");
        return;
      }
      setSubmitted(true);
      onRated(myRating);
      onToast("Rating submitted — thank you!");
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadPdf() {
    if (!detail.signedUrl) return;
    window.open(detail.signedUrl, "_blank", "noopener");
  }

  const avg = detail.ratingAverage ?? 0;

  return (
    <div className="market-modal-overlay" onClick={onClose}>
      <div className="market-modal" onClick={(e) => e.stopPropagation()}>
        <div className="market-modal-pdf-pane">
          {detail.signedUrl ? (
            <iframe
              src={detail.signedUrl}
              title={detail.title}
              style={{
                width: "100%",
                aspectRatio: "8.5 / 11",
                border: "1px solid var(--line)",
                background: "white",
              }}
            />
          ) : (
            <div className="market-modal-pdf">PDF unavailable.</div>
          )}
        </div>
        <div className="market-modal-meta-pane">
          <div className="market-modal-head">
            <div className="market-modal-eyebrow">
              {shortSeniorityLabel(detail.seniority)} · {shortRoleLabel(detail.roleCategory)}
            </div>
            <h2 className="market-modal-title">{detail.title}</h2>
            <button className="market-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          <div className="market-modal-body">
            {detail.notes && <p className="market-modal-bio">{detail.notes}</p>}

            <div className="market-modal-stats">
              <div className="market-stat-tile">
                <div className="market-stat-tile-label">Avg rating</div>
                <div className="market-stat-tile-value">
                  {detail.ratingCount > 0 ? avg.toFixed(1) : "—"}
                </div>
                <div className="market-stat-tile-sub">
                  from {detail.ratingCount} {detail.ratingCount === 1 ? "rating" : "ratings"}
                </div>
              </div>
              <div className="market-stat-tile">
                <div className="market-stat-tile-label">Pages</div>
                <div className="market-stat-tile-value">{detail.pageCount}</div>
                <div className="market-stat-tile-sub">
                  {(detail.sizeBytes / 1024).toFixed(0)} KB
                </div>
              </div>
            </div>

            <div className="market-modal-section">
              <div className="market-modal-section-h">Rating distribution</div>
              {detail.distribution.map((row) => (
                <div key={row.stars} className="rating-row">
                  <span>{row.stars} stars</span>
                  <div className="rating-bar">
                    <div className="rating-bar-fill" style={{ width: `${row.pct}%` }} />
                  </div>
                  <span className="rating-row-num">{row.pct}%</span>
                </div>
              ))}
            </div>

            {!isOwn && (
              <div className="modal-rate-card">
                <h3 className="modal-rate-card-h">
                  {submitted ? "Thanks for rating!" : "Rate this resume"}
                </h3>
                <div className="modal-rate-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      className={`modal-rate-star ${(hoverRating || myRating) >= n ? "is-on" : ""}`}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setMyRating(n)}
                      disabled={submitting}
                      aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M12 2l3 6.5 7 .8-5.2 5 1.4 7L12 17.8 5.8 21.3l1.4-7L2 9.3l7-.8z" />
                      </svg>
                    </button>
                  ))}
                </div>
                <div className="modal-rate-tags">
                  {RATE_TAGS.map((t) => (
                    <button
                      key={t}
                      className={`modal-rate-tag ${myTags.includes(t) ? "is-on" : ""}`}
                      onClick={() => toggleTag(t)}
                      disabled={submitting}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  className={`modal-rate-btn ${submitted ? "is-done" : ""}`}
                  onClick={submit}
                  disabled={submitting || !myRating}
                >
                  {submitted ? "✓ Rating submitted" : submitting ? "Submitting…" : "Submit rating"}
                </button>
              </div>
            )}
            {isOwn && (
              <p
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ink-3)",
                }}
              >
                You shared this resume — others can rate it.
              </p>
            )}
          </div>
          <div className="market-modal-actions">
            <div style={{ flex: 1 }} />
            <button className="market-modal-action primary" onClick={downloadPdf}>
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
