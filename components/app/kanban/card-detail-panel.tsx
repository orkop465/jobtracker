"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import {
  STATUS_OPTIONS,
  SOURCE_OPTIONS,
  PRIORITY_OPTIONS,
  CURRENCY_OPTIONS,
  statusLabel,
} from "@/lib/constants";
import type { BoardColumnType, KanbanApplication } from "@/lib/board/types";

const inputCls =
  "w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10 transition-colors duration-[180ms]";
const selectCls = `${inputCls} appearance-none cursor-pointer`;
const labelCls =
  "block font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-ink-muted)] mb-1.5";
const sectionCls =
  "font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)] pb-2 border-b border-[var(--color-line-subtle)] mb-3";

interface StatusEvent {
  id: string;
  fromStatus: string;
  toStatus: string;
  occurredAt: string;
}

interface Props {
  app: KanbanApplication;
  columns: BoardColumnType[];
  resumes: { id: string; label: string }[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function CardDetailPanel({
  app,
  columns,
  resumes,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [timeline, setTimeline] = useState<StatusEvent[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  // Form state — initialize from app
  const [form, setForm] = useState({
    company: app.company,
    roleTitle: app.roleTitle,
    jobUrl: app.jobUrl ?? "",
    location: app.location ?? "",
    status: app.status,
    boardColumnId: app.boardColumnId ?? "",
    priority: app.priority ?? "",
    source: app.source ?? "",
    resumeId: app.resumeId ?? "",
    nextFollowUp: app.nextFollowUp ? app.nextFollowUp.slice(0, 16) : "",
    salaryMin: app.salaryMin != null ? String(app.salaryMin) : "",
    salaryMax: app.salaryMax != null ? String(app.salaryMax) : "",
    currency: app.currency ?? "USD",
    contactName: app.contactName ?? "",
    contactEmail: app.contactEmail ?? "",
    contactLinkedIn: app.contactLinkedIn ?? "",
    notes: app.notes ?? "",
    jobDescription: app.jobDescription ?? "",
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Sync form if app prop changes
  useEffect(() => {
    setForm({
      company: app.company,
      roleTitle: app.roleTitle,
      jobUrl: app.jobUrl ?? "",
      location: app.location ?? "",
      status: app.status,
      boardColumnId: app.boardColumnId ?? "",
      priority: app.priority ?? "",
      source: app.source ?? "",
      resumeId: app.resumeId ?? "",
      nextFollowUp: app.nextFollowUp ? app.nextFollowUp.slice(0, 16) : "",
      salaryMin: app.salaryMin != null ? String(app.salaryMin) : "",
      salaryMax: app.salaryMax != null ? String(app.salaryMax) : "",
      currency: app.currency ?? "USD",
      contactName: app.contactName ?? "",
      contactEmail: app.contactEmail ?? "",
      contactLinkedIn: app.contactLinkedIn ?? "",
      notes: app.notes ?? "",
      jobDescription: app.jobDescription ?? "",
    });

    fetch(`/api/applications/${app.id}/status-events`)
      .then((r) => r.json())
      .then((d) => setTimeline(d.items ?? []))
      .catch(() => setTimeline([]));
  }, [app]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        company: form.company,
        roleTitle: form.roleTitle,
        jobUrl: form.jobUrl || null,
        location: form.location || null,
        status: form.status,
        boardColumnId: form.boardColumnId || null,
        resumeId: form.resumeId || "",
        contactName: form.contactName || null,
        contactEmail: form.contactEmail || null,
        contactLinkedIn: form.contactLinkedIn || null,
        notes: form.notes || null,
        source: form.source || null,
        jobDescription: form.jobDescription || null,
        priority: form.priority || null,
        nextFollowUp: form.nextFollowUp
          ? new Date(form.nextFollowUp).toISOString()
          : "",
        currency: form.currency,
        salaryMin: form.salaryMin ? parseInt(form.salaryMin, 10) : null,
        salaryMax: form.salaryMax ? parseInt(form.salaryMax, 10) : null,
      };

      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Save failed");
      }

      toast("Application updated", "success");
      onSaved();
    } catch (err: any) {
      toast(err.message ?? "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${app.company} — ${app.roleTitle}?`)) return;
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast("Application deleted", "success");
      onDeleted();
    } catch (err: any) {
      toast(err.message ?? "Delete failed", "error");
    }
  }

  async function handleUndo() {
    try {
      const res = await fetch(`/api/applications/${app.id}/undo-status`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Undo failed");
      toast(`Status reverted to ${statusLabel(data.newStatus)}`, "success");
      onSaved();
    } catch (err: any) {
      toast(err.message ?? "Undo failed", "error");
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 z-50 h-screen w-full max-w-[520px] bg-[var(--color-surface)] border-l border-[var(--color-line)] overflow-y-auto"
        style={{
          animation: "slide-in-right 280ms var(--ease-out-quart) both",
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--color-surface)] px-6 py-4 border-b border-[var(--color-line)] flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--color-ink)]">
              {app.company}
            </h2>
            <p className="text-[13px] text-[var(--color-ink-muted)]">
              {app.roleTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {/* Details */}
          <section>
            <h3 className={sectionCls}>Details</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Company</label>
                  <input
                    className={inputCls}
                    value={form.company}
                    onChange={(e) => set("company", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Role Title</label>
                  <input
                    className={inputCls}
                    value={form.roleTitle}
                    onChange={(e) => set("roleTitle", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Location</label>
                  <input
                    className={inputCls}
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="Remote, NYC"
                  />
                </div>
                <div>
                  <label className={labelCls}>Job URL</label>
                  <input
                    className={inputCls}
                    value={form.jobUrl}
                    onChange={(e) => set("jobUrl", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    className={selectCls}
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Column</label>
                  <select
                    className={selectCls}
                    value={form.boardColumnId}
                    onChange={(e) => set("boardColumnId", e.target.value)}
                  >
                    <option value="">Auto (by status)</option>
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Priority</label>
                  <select
                    className={selectCls}
                    value={form.priority}
                    onChange={(e) => set("priority", e.target.value)}
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
                  <label className={labelCls}>Source</label>
                  <select
                    className={selectCls}
                    value={form.source}
                    onChange={(e) => set("source", e.target.value)}
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
                  <label className={labelCls}>Resume</label>
                  <select
                    className={selectCls}
                    value={form.resumeId}
                    onChange={(e) => set("resumeId", e.target.value)}
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
              <div>
                <label className={labelCls}>Follow-up Date</label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={form.nextFollowUp}
                  onChange={(e) => set("nextFollowUp", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Compensation */}
          <section>
            <h3 className={sectionCls}>Compensation</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Min Salary</label>
                <input
                  type="number"
                  className={inputCls}
                  value={form.salaryMin}
                  onChange={(e) => set("salaryMin", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelCls}>Max Salary</label>
                <input
                  type="number"
                  className={inputCls}
                  value={form.salaryMax}
                  onChange={(e) => set("salaryMax", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelCls}>Currency</label>
                <select
                  className={selectCls}
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value)}
                >
                  {CURRENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h3 className={sectionCls}>Contact</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Name</label>
                  <input
                    className={inputCls}
                    value={form.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                    placeholder="Recruiter name"
                  />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    className={inputCls}
                    value={form.contactEmail}
                    onChange={(e) => set("contactEmail", e.target.value)}
                    placeholder="recruiter@..."
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>LinkedIn</label>
                <input
                  className={inputCls}
                  value={form.contactLinkedIn}
                  onChange={(e) => set("contactLinkedIn", e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <h3 className={sectionCls}>Notes</h3>
            <textarea
              className={`${inputCls} min-h-[100px] resize-y`}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Interview prep, reflections, questions asked..."
              maxLength={10000}
            />
            <p className="font-mono text-[9px] text-[var(--color-ink-muted)] mt-1 tabular-nums text-right">
              {form.notes.length}/10000
            </p>
          </section>

          {/* Job Description */}
          <section>
            <h3 className={sectionCls}>Job Description</h3>
            <textarea
              className={`${inputCls} min-h-[120px] resize-y`}
              value={form.jobDescription}
              onChange={(e) => set("jobDescription", e.target.value)}
              placeholder="Paste the job description here (postings get taken down!)"
              maxLength={50000}
            />
            <p className="font-mono text-[9px] text-[var(--color-ink-muted)] mt-1 tabular-nums text-right">
              {form.jobDescription.length}/50000
            </p>
          </section>

          {/* Timeline */}
          {timeline.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className={sectionCls + " mb-0 pb-0 border-0"}>
                  Timeline
                </h3>
                <button
                  onClick={handleUndo}
                  className="font-mono text-[10px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                >
                  Undo Last
                </button>
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {timeline.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-2 text-[11px] py-1.5 px-2 rounded-md bg-[var(--color-canvas)]"
                  >
                    <span className="font-mono text-[10px] text-[var(--color-ink)]">
                      {statusLabel(ev.fromStatus)}
                    </span>
                    <span className="text-[var(--color-ink-muted)]">&rarr;</span>
                    <span className="font-mono text-[10px] text-[var(--color-ink)]">
                      {statusLabel(ev.toStatus)}
                    </span>
                    <span className="ml-auto font-mono text-[9px] tabular-nums text-[var(--color-ink-muted)]">
                      {new Date(ev.occurredAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-[var(--color-surface)] px-6 py-4 border-t border-[var(--color-line)] flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[12px] font-mono tracking-wide text-[var(--color-surface)] bg-[var(--color-ink)] rounded-md hover:bg-[var(--color-ink)]/90 transition-colors duration-[180ms] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-mono tracking-wide text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors duration-[180ms]"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="ml-auto px-4 py-2 text-[12px] font-mono tracking-wide text-[var(--color-sink)] hover:bg-[var(--color-sink)]/5 rounded-md transition-colors duration-[180ms]"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  );
}
