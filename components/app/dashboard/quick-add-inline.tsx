"use client";

import { useEffect, useRef, useState } from "react";

interface QuickAddInlineProps {
  open: boolean;
  setOpen: (v: boolean) => void;
  onCreated: () => void;
}

export function QuickAddInline({ open, setOpen, onCreated }: QuickAddInlineProps) {
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState("APPLIED");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!role.trim() || !company.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleTitle: role.trim(),
          company: company.trim(),
          status: stage,
        }),
      });
      if (!res.ok) throw new Error();
      setRole("");
      setCompany("");
      setStage("APPLIED");
      setOpen(false);
      onCreated();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`quickadd-inline ${open ? "is-open" : ""}`}>
      {!open ? (
        <button className="quickadd-trigger" onClick={() => setOpen(true)}>
          <span className="quickadd-trigger-icon">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          Quick-add a role&hellip;
          <kbd>N</kbd>
        </button>
      ) : (
        <form className="quickadd-form" onSubmit={submit}>
          <div className="quickadd-form-row">
            <input
              ref={inputRef}
              className="role"
              type="text"
              placeholder="Role title (e.g. Senior SWE, Platform)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div className="quickadd-form-row">
            <input
              type="text"
              placeholder="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="APPLIED">Applied</option>
              <option value="RECRUITER_SCREEN">Phone Screen</option>
              <option value="INTERVIEW_ROUND_1">Interview</option>
              <option value="OFFER">Offer</option>
            </select>
          </div>
          <div className="quickadd-actions">
            <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>&crarr; to save &middot; esc to cancel</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="quickadd-cancel" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="quickadd-submit" disabled={submitting}>
                Add role
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 6h6m0 0L6 3m3 3L6 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
