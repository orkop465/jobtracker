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

const AFFIRMATION =
  "I confirm I have covered every piece of personally identifiable information in this resume (name, contact info, specific employer/school names if I want them hidden, etc.). I understand an admin will review this before it goes public, but I am responsible for the accuracy of this redaction.";

export function SubmitClient({ stagingKey }: Props) {
  const router = useRouter();
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [pageCount, setPageCount] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<RoleId | "">("");
  const [seniority, setSeniority] = useState<SeniorityId | "">("");
  const [notes, setNotes] = useState("");
  const [affirmed, setAffirmed] = useState(false);
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
    affirmed &&
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
        gridTemplateColumns: "minmax(0, 1fr) 360px",
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
          Drag a black rectangle over your name, email, phone, school name, employer logos —
          anything you don&apos;t want public. Click a rectangle to select it; press Delete to
          remove. The server rebuilds the PDF as flat images so redacted text cannot be recovered.
        </p>

        <RedactionCanvas
          sourceUrl={sourceUrl}
          rectangles={rectangles}
          onChange={setRectangles}
          onPageCount={onPageCount}
        />
      </div>

      <aside
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

        <FieldLabel>Notes (optional)</FieldLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="What did people respond to? Any framing tricks?"
          style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--sans)" }}
        />

        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            fontFamily: "var(--sans)",
            fontSize: 12,
            color: "var(--ink-2)",
            lineHeight: 1.5,
            border: "1px dashed var(--line-2)",
            padding: 12,
            borderRadius: 4,
            background: "var(--bg-2)",
          }}
        >
          <input
            type="checkbox"
            checked={affirmed}
            onChange={(e) => setAffirmed(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span>{AFFIRMATION}</span>
        </label>

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

