"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/toast";
import type { Resume } from "@/components/app/resumes/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const STAGES: Array<{ value: string; label: string }> = [
  { value: "APPLIED", label: "Applied" },
  { value: "RECRUITER_SCREEN", label: "Phone Screen" },
  { value: "INTERVIEW_ROUND_1", label: "Interview" },
  { value: "OFFER", label: "Offer" },
];

export function QuickAddOverlay({ open, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState("APPLIED");
  const [resumeId, setResumeId] = useState<string>("");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    setRole("");
    setCompany("");
    setStage("APPLIED");
    setResumeId("");
    (async () => {
      try {
        const res = await fetch("/api/resumes", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        setResumes(data?.items ?? []);
      } catch {
        /* leave dropdown empty on failure */
      }
    })();
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !role.trim() || !company.trim()) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        roleTitle: role.trim(),
        company: company.trim(),
        status: stage,
      };
      if (resumeId) body.resumeId = resumeId;

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error ?? "Failed to add role", "error");
        return;
      }
      toast("Role added", "success");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md shadow-lg p-5 w-[88%] max-w-[440px]"
        style={{ animation: "fade-up 160ms ease-out both" }}
      >
        <h3 className="text-[14px] font-semibold text-[var(--color-ink)] mb-3">
          Quick-add a role
        </h3>
        <form onSubmit={submit} className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Role title (e.g. Senior SWE, Platform)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-3 py-2 bg-transparent border border-[var(--color-line)] rounded text-[13px]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="px-3 py-2 bg-transparent border border-[var(--color-line)] rounded text-[13px]"
            />
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="px-3 py-2 bg-transparent border border-[var(--color-line)] rounded text-[13px]"
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <select
            value={resumeId}
            onChange={(e) => setResumeId(e.target.value)}
            className="px-3 py-2 bg-transparent border border-[var(--color-line)] rounded text-[13px]"
          >
            <option value="">No resume</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>

          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
              ↵ to save · esc to cancel
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-[12px] font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !role.trim() || !company.trim()}
                className="px-3 py-1.5 text-[12px] font-mono text-white rounded-md"
                style={{ background: "oklch(0.62 0.155 55)" }}
              >
                Add role
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
