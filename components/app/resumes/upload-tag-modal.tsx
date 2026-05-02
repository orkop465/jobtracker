"use client";

import { useEffect, useState } from "react";
import {
  ROLE_OPTIONS,
  SENIORITY_OPTIONS,
  type RoleCategory,
  type Seniority,
} from "./types";

interface Props {
  filename: string;
  initialRole?: RoleCategory | null;
  initialSeniority?: Seniority | null;
  onCancel: () => void;
  onSubmit: (role: RoleCategory, seniority: Seniority) => void;
}

export function UploadTagModal({
  filename,
  initialRole,
  initialSeniority,
  onCancel,
  onSubmit,
}: Props) {
  const [role, setRole] = useState<RoleCategory | "">(initialRole ?? "");
  const [seniority, setSeniority] = useState<Seniority | "">(initialSeniority ?? "");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const ready = role && seniority;

  return (
    <div className="market-modal-overlay" onClick={onCancel}>
      <div
        className="market-modal"
        style={{ gridTemplateColumns: "1fr", maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="market-modal-head">
          <div className="market-modal-eyebrow">Tag your resume</div>
          <h2 className="market-modal-title">Quick tags first</h2>
          <button className="market-modal-close" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>
        <div className="market-modal-body" style={{ padding: "20px 24px 24px" }}>
          <p className="market-modal-bio">
            Tagging <strong>{filename}</strong> with role + seniority makes it filterable later
            and pre-fills the form when you share it to the marketplace.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--ink-3)",
              }}
            >
              Role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as RoleCategory)}
                style={{
                  display: "block",
                  marginTop: 6,
                  width: "100%",
                  padding: "8px 10px",
                  fontFamily: "var(--sans)",
                  fontSize: 13,
                  color: "var(--ink)",
                  background: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 4,
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                <option value="">Choose role…</option>
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--ink-3)",
              }}
            >
              Seniority
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value as Seniority)}
                style={{
                  display: "block",
                  marginTop: 6,
                  width: "100%",
                  padding: "8px 10px",
                  fontFamily: "var(--sans)",
                  fontSize: 13,
                  color: "var(--ink)",
                  background: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 4,
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                <option value="">Choose level…</option>
                {SENIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: "9px 14px",
                background: "transparent",
                border: "1px solid var(--line)",
                borderRadius: 4,
                fontFamily: "var(--sans)",
                fontSize: 13,
                color: "var(--ink-2)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={() => ready && onSubmit(role as RoleCategory, seniority as Seniority)}
              className="modal-rate-btn"
              style={{ flex: 2, opacity: ready ? 1 : 0.5, cursor: ready ? "pointer" : "not-allowed" }}
            >
              Upload &amp; tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
