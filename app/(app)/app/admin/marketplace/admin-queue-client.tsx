"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Status = "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "UNPUBLISHED";

interface QueueItem {
  id: string;
  title: string;
  roleCategory: string;
  seniority: string;
  status: Status;
  pageCount: number;
  sizeBytes: number;
  createdAt: string;
  publishedAt: string | null;
  ratingCount: number;
  ratingSum: number;
  featured: boolean;
  uploaderEmail: string | null;
  rejectionReason: string | null;
}

const TABS: { id: Status; label: string }[] = [
  { id: "PENDING_REVIEW", label: "Pending" },
  { id: "PUBLISHED", label: "Published" },
  { id: "REJECTED", label: "Rejected" },
  { id: "UNPUBLISHED", label: "Unpublished" },
];

export function AdminQueueClient() {
  const [tab, setTab] = useState<Status>("PENDING_REVIEW");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [counts, setCounts] = useState<Record<Status, number>>({
    PENDING_REVIEW: 0,
    PUBLISHED: 0,
    REJECTED: 0,
    UNPUBLISHED: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/marketplace?status=${tab}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setCounts(d.counts ?? counts);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="market-page">
      <div className="market-hero">
        <div>
          <div className="market-hero-eyebrow">Admin · Marketplace queue</div>
          <h1 className="market-hero-title">Review submissions.</h1>
          <p className="market-hero-sub">
            Approve, reject, unpublish, or feature anonymized resumes. Approve only what is
            actually anonymized — uploader is responsible, but you&apos;re the gate.
          </p>
        </div>
        <div className="market-hero-stats">
          {TABS.map((t) => (
            <div key={t.id} className="market-hero-stat">
              <div className="market-hero-stat-num">{counts[t.id]}</div>
              <div className="market-hero-stat-label">{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 18,
          padding: "12px 40px 0",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 2px",
              border: "none",
              background: "transparent",
              fontFamily: "var(--mono)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: tab === t.id ? "var(--ink)" : "var(--ink-3)",
              borderBottom: tab === t.id ? "2px solid var(--ink)" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t.label}
            <span style={{ marginLeft: 6, color: "var(--ink-3)" }}>{counts[t.id]}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: "24px 40px 60px", overflowY: "auto" }}>
        {loading && (
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--ink-3)",
            }}
          >
            Loading…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: 32,
              textAlign: "center",
              fontFamily: "var(--sans)",
              color: "var(--ink-2)",
              background: "var(--bg-2)",
            }}
          >
            Nothing here.
          </div>
        )}

        {!loading && items.length > 0 && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--sans)",
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ink-3)",
                }}
              >
                <th style={th}>Title</th>
                <th style={th}>Uploader</th>
                <th style={th}>Role / Seniority</th>
                <th style={th}>Pages</th>
                <th style={th}>Submitted</th>
                {tab === "PUBLISHED" && <th style={th}>Rating</th>}
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.id}
                  style={{ borderTop: "1px solid var(--line-2)", height: 44 }}
                >
                  <td style={td}>
                    <Link
                      href={`/app/admin/marketplace/${it.id}`}
                      style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 500 }}
                    >
                      {it.title}
                    </Link>
                    {it.featured && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontFamily: "var(--mono)",
                          fontSize: 9,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          padding: "2px 6px",
                          border: "1px solid var(--accent)",
                          borderRadius: 999,
                          color: "var(--accent-ink)",
                        }}
                      >
                        Featured
                      </span>
                    )}
                  </td>
                  <td style={{ ...td, fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-2)" }}>
                    {it.uploaderEmail ?? "—"}
                  </td>
                  <td style={{ ...td, color: "var(--ink-2)" }}>
                    {it.roleCategory} · {it.seniority}
                  </td>
                  <td style={{ ...td, fontFamily: "var(--mono)", color: "var(--ink-2)" }}>
                    {it.pageCount}
                  </td>
                  <td style={{ ...td, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
                    {new Date(it.createdAt).toLocaleDateString()}
                  </td>
                  {tab === "PUBLISHED" && (
                    <td style={{ ...td, fontFamily: "var(--mono)", color: "var(--ink-2)" }}>
                      {it.ratingCount > 0
                        ? `${(it.ratingSum / it.ratingCount).toFixed(1)} (${it.ratingCount})`
                        : "—"}
                    </td>
                  )}
                  <td style={td}>
                    <Link
                      href={`/app/admin/marketplace/${it.id}`}
                      style={{
                        padding: "4px 10px",
                        background: "var(--ink)",
                        color: "var(--bg)",
                        borderRadius: 4,
                        fontSize: 12,
                        textDecoration: "none",
                      }}
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 10px", fontWeight: 400 };
const td: React.CSSProperties = { padding: "8px 10px", verticalAlign: "middle" };
