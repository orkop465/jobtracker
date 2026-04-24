"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import {
  SOURCE_OPTIONS,
  PRIORITY_OPTIONS,
} from "@/lib/constants";

const inputCls =
  "w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10 transition-colors duration-[180ms]";

const selectCls = `${inputCls} appearance-none cursor-pointer`;

const labelCls =
  "block font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-ink-muted)] mb-1.5";

interface Props {
  resumes: { id: string; label: string }[];
  onClose: () => void;
  onCreated: () => void;
}

export function AddApplicationModal({ resumes, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");
  const [resumeId, setResumeId] = useState("");

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);

    const body: Record<string, unknown> = {
      company: company.trim(),
      roleTitle: roleTitle.trim(),
      jobUrl: jobUrl.trim() || undefined,
      location: location.trim() || undefined,
      resumeId: resumeId || undefined,
    };
    if (source) body.source = source;
    if (priority) body.priority = priority;

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error ?? "Failed to create", "error");
        return;
      }
      toast(`Added ${company.trim()}`, "success");
      onCreated();
    } catch {
      toast("Failed to create application", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[10px] shadow-lg w-full max-w-[480px] mx-4"
        style={{ animation: "fade-up 280ms var(--ease-out-quart) both" }}
      >
        <div className="px-6 pt-5 pb-4 border-b border-[var(--color-line)]">
          <h2 className="text-[18px] font-semibold text-[var(--color-ink)]">
            Add Application
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Company *</label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Google"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Role Title *</label>
              <input
                type="text"
                required
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Software Engineer"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Job URL</label>
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Remote, NYC"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={selectCls}
              >
                <option value="">Select...</option>
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={selectCls}
              >
                <option value="">Select...</option>
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Resume</label>
              <select
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                className={selectCls}
              >
                <option value="">None</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 text-[12px] font-mono tracking-wide text-[var(--color-surface)] bg-[var(--color-ink)] rounded-md hover:bg-[var(--color-ink)]/90 transition-colors duration-[180ms] disabled:opacity-50"
            >
              {creating ? "Adding..." : "Add Application"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-mono tracking-wide text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors duration-[180ms]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
