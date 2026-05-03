"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Status = "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "UNPUBLISHED";

interface Detail {
  id: string;
  title: string;
  roleCategory: string;
  seniority: string;
  notes: string | null;
  pageCount: number;
  sizeBytes: number;
  publishedAt: string | null;
  ratingCount: number;
  ratingSum: number;
  ratingAverage: number | null;
  featured: boolean;
  signedUrl: string;
  thumbSignedUrl: string | null;
  myRating: number | null;
  distribution: { stars: number; pct: number }[];
}

interface Props {
  id: string;
}

export function AdminDetailClient({ id }: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [reasonOpen, setReasonOpen] = useState<"reject" | "unpublish" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/marketplace/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Detail & { status?: Status }) => {
        setDetail(d);
        if (d.status) setStatus(d.status);
      });
  }, [id]);

  // Find the next pending submission so we can chain through the queue.
  async function gotoNextOrQueue() {
    try {
      const res = await fetch("/api/admin/marketplace?status=PENDING_REVIEW", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      const items = (data?.items ?? []) as Array<{ id: string }>;
      const next = items.find((it) => it.id !== id);
      if (next) router.push(`/app/admin/marketplace/${next.id}`);
      else router.push("/app/admin/marketplace");
    } catch {
      router.push("/app/admin/marketplace");
    }
  }

  async function action(
    path: string,
    body?: Record<string, unknown>,
  ): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `Action failed (${res.status})`);
        setBusy(false);
        return false;
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
      setBusy(false);
      return false;
    }
  }

  async function approve() {
    if (await action(`/api/admin/marketplace/${id}/approve`)) {
      setStatus("PUBLISHED");
      await gotoNextOrQueue();
    }
  }
  async function rejectSubmit() {
    if (!reason.trim()) {
      setError("Reason required");
      return;
    }
    if (await action(`/api/admin/marketplace/${id}/reject`, { reason: reason.trim() })) {
      setStatus("REJECTED");
      setReasonOpen(null);
      setReason("");
      await gotoNextOrQueue();
    }
  }
  async function unpublishSubmit() {
    if (!reason.trim()) {
      setError("Reason required");
      return;
    }
    if (await action(`/api/admin/marketplace/${id}/unpublish`, { reason: reason.trim() })) {
      setStatus("UNPUBLISHED");
      setReasonOpen(null);
      setReason("");
      // Unpublish lives off the Published tab — go back to the queue
      // rather than chaining through Pending.
      router.push("/app/admin/marketplace");
    }
  }
  async function toggleFeature() {
    if (!detail) return;
    const next = !detail.featured;
    if (await action(`/api/admin/marketplace/${id}/feature`, { featured: next })) {
      setDetail({ ...detail, featured: next });
      setBusy(false);
    }
  }

  if (!detail) {
    return (
      <div style={{ padding: 40, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
        Loading…
      </div>
    );
  }

  const canApprove = status === "PENDING_REVIEW" || status === "REJECTED" || status === "UNPUBLISHED";
  const canReject = status === "PENDING_REVIEW";
  const canUnpublish = status === "PUBLISHED";

  return (
    <div className="market-page">
      <div
        style={{
          padding: "16px 40px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Link
          href="/app/admin/marketplace"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--ink-3)",
            textDecoration: "none",
          }}
        >
          ← Queue
        </Link>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "3px 8px",
            border: "1px solid var(--line)",
            borderRadius: 999,
            color: "var(--ink-2)",
          }}
        >
          {status ?? "…"}
        </span>
        <button
          onClick={toggleFeature}
          disabled={busy}
          style={{
            padding: "6px 12px",
            background: detail.featured ? "var(--accent)" : "transparent",
            color: detail.featured ? "var(--bg)" : "var(--accent-ink)",
            border: "1px solid var(--accent)",
            borderRadius: 4,
            fontFamily: "var(--sans)",
            fontSize: 12,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {detail.featured ? "★ Featured" : "Feature"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          height: "100%",
          minHeight: 0,
        }}
      >
        <div style={{ padding: 32, overflowY: "auto", background: "var(--bg-2)" }}>
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
            <div>PDF unavailable</div>
          )}
        </div>

        <aside
          style={{
            padding: "24px 24px 60px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div className="market-modal-eyebrow">
            {detail.roleCategory} · {detail.seniority}
          </div>
          <h2 style={{ fontFamily: "var(--display)", fontSize: 22, margin: "0 0 4px" }}>
            {detail.title}
          </h2>
          {detail.notes && (
            <p
              style={{
                fontFamily: "var(--sans)",
                fontSize: 13,
                color: "var(--ink-2)",
                lineHeight: 1.5,
              }}
            >
              {detail.notes}
            </p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <Stat label="Pages" value={String(detail.pageCount)} />
            <Stat label="Size" value={`${(detail.sizeBytes / 1024).toFixed(0)} KB`} />
            {detail.ratingCount > 0 && (
              <>
                <Stat
                  label="Avg rating"
                  value={(detail.ratingAverage ?? 0).toFixed(1)}
                />
                <Stat label="Ratings" value={String(detail.ratingCount)} />
              </>
            )}
          </div>

          {error && (
            <div
              style={{
                padding: "8px 12px",
                border: "1px solid oklch(0.55 0.15 30)",
                borderRadius: 4,
                fontFamily: "var(--sans)",
                fontSize: 12,
                color: "oklch(0.45 0.15 30)",
                background: "oklch(0.96 0.04 30 / 0.5)",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {canApprove && (
              <button
                onClick={approve}
                disabled={busy}
                className="modal-rate-btn"
                style={{
                  background: "oklch(0.55 0.13 145)",
                  borderColor: "oklch(0.55 0.13 145)",
                  opacity: busy ? 0.6 : 1,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "Approving…" : "Approve"}
              </button>
            )}
            {canReject && (
              <button
                onClick={() => setReasonOpen("reject")}
                disabled={busy}
                style={{
                  padding: "9px 14px",
                  borderRadius: 4,
                  background: "transparent",
                  border: "1px solid var(--line)",
                  fontFamily: "var(--sans)",
                  fontSize: 13,
                  color: "var(--ink)",
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                Reject…
              </button>
            )}
            {canUnpublish && (
              <button
                onClick={() => setReasonOpen("unpublish")}
                disabled={busy}
                style={{
                  padding: "9px 14px",
                  borderRadius: 4,
                  background: "transparent",
                  border: "1px solid var(--line)",
                  fontFamily: "var(--sans)",
                  fontSize: 13,
                  color: "var(--ink)",
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                Unpublish…
              </button>
            )}
            <button
              onClick={() => router.push("/app/admin/marketplace")}
              style={{
                padding: "8px 12px",
                background: "transparent",
                border: "1px solid var(--line)",
                borderRadius: 4,
                fontFamily: "var(--sans)",
                fontSize: 12,
                color: "var(--ink-3)",
                cursor: "pointer",
              }}
            >
              Back to queue
            </button>
          </div>
        </aside>
      </div>

      {reasonOpen && (
        <div className="market-modal-overlay" onClick={() => setReasonOpen(null)}>
          <div
            className="market-modal"
            style={{ gridTemplateColumns: "1fr", maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="market-modal-head">
              <div className="market-modal-eyebrow">
                {reasonOpen === "reject" ? "Reject submission" : "Unpublish submission"}
              </div>
              <h2 className="market-modal-title">Tell the submitter why</h2>
              <button
                className="market-modal-close"
                onClick={() => setReasonOpen(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="market-modal-body" style={{ padding: "20px 24px 24px" }}>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tell the submitter what to fix — they'll see this."
                maxLength={500}
                style={{
                  width: "100%",
                  padding: "10px",
                  fontFamily: "var(--sans)",
                  fontSize: 13,
                  color: "var(--ink)",
                  background: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 4,
                  resize: "vertical",
                }}
              />
              {error && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    border: "1px solid oklch(0.55 0.15 30)",
                    borderRadius: 4,
                    fontFamily: "var(--sans)",
                    fontSize: 12,
                    color: "oklch(0.45 0.15 30)",
                    background: "oklch(0.96 0.04 30 / 0.5)",
                  }}
                >
                  {error}
                </div>
              )}
              <button
                onClick={reasonOpen === "reject" ? rejectSubmit : unpublishSubmit}
                disabled={busy || !reason.trim()}
                className="modal-rate-btn"
                style={{
                  marginTop: 14,
                  opacity: busy || !reason.trim() ? 0.6 : 1,
                  cursor: busy || !reason.trim() ? "not-allowed" : "pointer",
                }}
              >
                {busy
                  ? reasonOpen === "reject"
                    ? "Rejecting…"
                    : "Unpublishing…"
                  : reasonOpen === "reject"
                    ? "Reject"
                    : "Unpublish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="market-stat-tile">
      <div className="market-stat-tile-label">{label}</div>
      <div className="market-stat-tile-value">{value}</div>
    </div>
  );
}
