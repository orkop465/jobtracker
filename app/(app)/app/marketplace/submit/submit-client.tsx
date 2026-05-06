"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RedactionCanvas, type Rectangle } from "@/components/app/marketplace/redaction-canvas";
import {
  ROLE_FILTERS,
  SENIORITY_FILTERS,
  type RoleId,
  type SeniorityId,
} from "@/components/app/marketplace/types";

interface Props {
  stagingKey: string;
}

interface AffirmationItem {
  id: string;
  label: string;
}

const AFFIRMATIONS: AffirmationItem[] = [
  {
    id: "name",
    label:
      "I have redacted my full legal name, any preferred or alternative names, and any initials that could identify me, in every place they appear in this resume.",
  },
  {
    id: "contact",
    label:
      "I have redacted my email address, phone number(s), and every other direct contact identifier (including personal websites, social handles, and messaging IDs).",
  },
  {
    id: "address",
    label:
      "I have redacted my home address, mailing address, city of residence, and any other physical location identifiers I do not wish to disclose publicly.",
  },
  {
    id: "orgs",
    label:
      "I have redacted the names of any current or former employers and educational institutions that I do not want to be publicly associated with this resume.",
  },
  {
    id: "liability",
    label:
      "I acknowledge that I am solely responsible for any personally identifiable information that remains visible after submission, and I agree that the operator of this marketplace bears no liability for any PII that is not properly redacted by me.",
  },
  {
    id: "review",
    label:
      "I consent to a marketplace administrator reviewing my redacted resume in full prior to publication, and I understand that administrative approval does not constitute a guarantee that all PII has been removed.",
  },
];

export function SubmitClient({ stagingKey }: Props) {
  const router = useRouter();
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [pageCount, setPageCount] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<RoleId | "">("");
  const [seniority, setSeniority] = useState<SeniorityId | "">("");
  const [notes, setNotes] = useState("");
  const [affirmedSet, setAffirmedSet] = useState<Set<string>>(() => new Set());
  const allAffirmed = affirmedSet.size === AFFIRMATIONS.length;
  const toggleAffirm = (id: string) => {
    setAffirmedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sourceUrl = useMemo(
    () => `/api/marketplace/staging/preview?key=${encodeURIComponent(stagingKey)}`,
    [stagingKey],
  );

  const ready =
    title.trim().length > 0 &&
    title.length <= 100 &&
    role &&
    seniority &&
    rectangles.length > 0 &&
    allAffirmed &&
    !submitting;

  const onPageCount = useCallback((n: number) => setPageCount(n), []);

  async function submit() {
    if (!ready) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stagingKey,
          title: title.trim(),
          roleCategory: role,
          seniority,
          notes: notes.trim() || null,
          rectangles,
          affirmed: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `Submission failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      setToast("Submitted for review");
      setTimeout(() => router.push("/app/marketplace?tab=mine"), 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 400px",
        height: "100%",
        minHeight: 0,
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          padding: "24px 32px 60px",
          overflowY: "auto",
          borderRight: "1px solid var(--line)",
          background: "var(--bg-2)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--accent-ink)",
            marginBottom: 6,
          }}
        >
          Step 2 · Redact PII
        </div>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontSize: 26,
            fontWeight: 500,
            margin: "0 0 8px",
          }}
        >
          Cover anything that identifies you.
        </h1>
        <p
          style={{
            fontFamily: "var(--sans)",
            fontSize: 13,
            color: "var(--ink-2)",
            maxWidth: 620,
            lineHeight: 1.5,
            marginBottom: 18,
          }}
        >
          Use <strong>Highlight</strong> mode to drag across text and instantly redact it — click
          any highlight to remove it. Switch to <strong>Rectangle</strong> mode to draw a black box
          over logos, photos, or scanned regions. The server rebuilds the PDF as flat images so
          redacted content cannot be recovered after submission.
        </p>

        <RedactionCanvas
          sourceUrl={sourceUrl}
          rectangles={rectangles}
          onChange={setRectangles}
          onPageCount={onPageCount}
        />
      </div>

      <style>{`
        .rdx-sidebar > * { flex-shrink: 0; }
      `}</style>
      <aside
        className="rdx-sidebar"
        style={{
          padding: "24px 24px 60px",
          overflowY: "auto",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--ink-3)",
              marginBottom: 4,
            }}
          >
            Status
          </div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>
            {pageCount > 0 ? `${pageCount} page${pageCount === 1 ? "" : "s"}` : "Loading…"} ·{" "}
            {rectangles.length} redaction{rectangles.length === 1 ? "" : "s"}
          </div>
        </div>

        <FieldLabel>Title (one short line)</FieldLabel>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="Frontend engineer, design-system focus"
          style={inputStyle}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FieldLabel>Role</FieldLabel>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleId)}
              style={inputStyle}
            >
              <option value="">Choose role…</option>
              {ROLE_FILTERS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FieldLabel>Seniority</FieldLabel>
            <select
              value={seniority}
              onChange={(e) => setSeniority(e.target.value as SeniorityId)}
              style={inputStyle}
            >
              <option value="">Choose level…</option>
              {SENIORITY_FILTERS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <FieldLabel>Notes (optional)</FieldLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="What did people respond to? Any framing tricks?"
          style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--sans)" }}
        />

        <div
          style={{
            border: "1px dashed var(--line-2)",
            borderRadius: 4,
            padding: "8px 10px 10px",
            background: "var(--bg-2)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 2,
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--accent-ink)",
              }}
            >
              Submission agreement · check each
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: allAffirmed ? "var(--accent-ink)" : "var(--ink-3)",
              }}
            >
              {affirmedSet.size}/{AFFIRMATIONS.length}
            </div>
          </div>
          {AFFIRMATIONS.map((a) => (
            <label
              key={a.id}
              style={{
                display: "flex",
                gap: 7,
                alignItems: "flex-start",
                fontFamily: "var(--sans)",
                fontSize: 11,
                color: "var(--ink-2)",
                lineHeight: 1.4,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={affirmedSet.has(a.id)}
                onChange={() => toggleAffirm(a.id)}
                style={{ marginTop: 2, flexShrink: 0, transform: "scale(0.95)" }}
              />
              <span>{a.label}</span>
            </label>
          ))}
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

        <button
          className="modal-rate-btn"
          disabled={!ready}
          onClick={submit}
          style={{ marginTop: 6, opacity: ready ? 1 : 0.5, cursor: ready ? "pointer" : "not-allowed" }}
        >
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/app/marketplace")}
          style={{
            padding: "8px 12px",
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: 4,
            fontFamily: "var(--sans)",
            fontSize: 12,
            color: "var(--ink-2)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <p
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--ink-3)",
            marginTop: 8,
          }}
        >
          Desktop only. Open on a larger screen if mobile.
        </p>
      </aside>

      {toast && <div className="market-toast">{toast}</div>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--mono)",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "var(--ink-3)",
        marginBottom: -8,
      }}
    >
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontFamily: "var(--sans)",
  fontSize: 13,
  color: "var(--ink)",
  background: "var(--bg-2)",
  border: "1px solid var(--line)",
  borderRadius: 4,
};

