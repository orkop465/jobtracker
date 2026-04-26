"use client";

import { useEffect, useState } from "react";
import { CompanyLogo } from "./company-logo";
import { statusLabel } from "@/lib/constants";

interface PeekSheetProps {
  appId: string;
  onClose: () => void;
}

interface AppDetail {
  id: string;
  company: string;
  roleTitle: string;
  status: string;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  source: string | null;
  contactName: string | null;
  notes: string | null;
  appliedAt: string;
  resume: { label: string } | null;
  statusEvents: {
    id: string;
    fromStatus: string;
    toStatus: string;
    occurredAt: string;
  }[];
}

export function PeekSheet({ appId, onClose }: PeekSheetProps) {
  const [data, setData] = useState<AppDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [appRes, eventsRes] = await Promise.all([
          fetch(`/api/applications/${appId}`),
          fetch(`/api/applications/${appId}/status-events`),
        ]);
        if (!appRes.ok) throw new Error();
        const appData = await appRes.json();
        const eventsData = eventsRes.ok ? await eventsRes.json() : { items: [] };
        setData({ ...appData, statusEvents: eventsData.items || [] });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [appId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const salaryText = data?.salaryMin && data?.salaryMax
    ? `${data.currency || "USD"} ${data.salaryMin.toLocaleString()} – ${data.salaryMax.toLocaleString()}`
    : data?.salaryMin ? `${data.currency || "USD"} ${data.salaryMin.toLocaleString()}+`
    : null;

  return (
    <>
      <div className="peek-backdrop" onClick={onClose} />
      <div className="peek" role="dialog" aria-modal="true">
        <button className="peek-close" onClick={onClose} aria-label="Close">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M2 2l7 7M9 2l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            Loading...
          </div>
        ) : data ? (
          <>
            <div className="peek-head">
              <span className="peek-stage" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                {statusLabel(data.status)}
              </span>
              <h2 className="peek-role">{data.roleTitle}</h2>
              <div className="peek-company">
                <CompanyLogo company={data.company} size={16} />
                {data.company}
                {data.location && <> &middot; {data.location}</>}
              </div>
            </div>

            <div className="peek-body">
              <div className="peek-fields">
                {data.resume && (
                  <><span className="peek-k">Resume</span><span className="peek-v">{data.resume.label}</span></>
                )}
                <span className="peek-k">Applied</span>
                <span className="peek-v">{new Date(data.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                {salaryText && (
                  <><span className="peek-k">Comp band</span><span className="peek-v">{salaryText}</span></>
                )}
                {data.source && (
                  <><span className="peek-k">Source</span><span className="peek-v">{data.source}</span></>
                )}
                {data.contactName && (
                  <><span className="peek-k">Contact</span><span className="peek-v">{data.contactName}</span></>
                )}
              </div>

              {data.notes && (
                <>
                  <div className="peek-section-title">Latest note</div>
                  <div className="peek-note">{data.notes}</div>
                </>
              )}

              {data.statusEvents.length > 0 && (
                <>
                  <div className="peek-section-title">Timeline</div>
                  <div className="feed-list" style={{ maxHeight: "none" }}>
                    {data.statusEvents.map((ev) => (
                      <div key={ev.id} className="feed-item">
                        <span className="feed-icon kind-move">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5h6m0 0L5 2m3 3L5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                        </span>
                        <div className="feed-body">
                          <div className="feed-text">
                            Moved to <strong>{statusLabel(ev.toStatus)}</strong>
                          </div>
                          <div className="feed-time">
                            {new Date(ev.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="peek-actions">
              <button onClick={onClose}>Close</button>
              <button className="primary" onClick={() => window.location.href = "/app/applications"}>
                Open full
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            Could not load application.
          </div>
        )}
      </div>
    </>
  );
}
