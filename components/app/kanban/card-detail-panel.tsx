"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/toast";
import {
  STATUS_OPTIONS,
  SOURCE_OPTIONS,
  PRIORITY_OPTIONS,
  CURRENCY_OPTIONS,
  statusLabel,
} from "@/lib/constants";
import type { KanbanApplication } from "@/lib/board/types";

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
  resumes: { id: string; label: string }[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function CardDetailPanel({
  app,
  resumes,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [timeline, setTimeline] = useState<StatusEvent[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  // Pending undos: count of latest events to void on Save. Each click of
  // "Stage undo" increments. Save calls /undo-status that many times in
  // sequence before the PATCH for other fields.
  const [pendingUndoCount, setPendingUndoCount] = useState(0);
  const pendingUndo = pendingUndoCount > 0;
  const panelRef = useRef<HTMLDivElement>(null);

  // Form state — initialize from app
  const [form, setForm] = useState({
    company: app.company,
    roleTitle: app.roleTitle,
    jobUrl: app.jobUrl ?? "",
    location: app.location ?? "",
    status: app.status,
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

  // Reset form ONLY when a different card opens — not when the same card's
  // data refreshes from the parent. Otherwise typing in the form gets
  // overwritten on every parent refetch. We guard inside the effect by
  // comparing the last initialized card id, which lets us depend on the
  // full `app` object without re-initializing on every refresh.
  const lastInitIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastInitIdRef.current === app.id) return;
    lastInitIdRef.current = app.id;
    setPendingUndoCount(0);
    setForm({
      company: app.company,
      roleTitle: app.roleTitle,
      jobUrl: app.jobUrl ?? "",
      location: app.location ?? "",
      status: app.status,
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
  }, [app]);

  // Refetch timeline when card identity OR status changes.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/applications/${app.id}/status-events`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTimeline(d.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setTimeline([]);
      });
    return () => {
      cancelled = true;
    };
  }, [app.id, app.status]);

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
      // Step 1: void the latest N status events. Each call to /undo-status
      // voids one event server-side. We sequence them so the conditional
      // update inside the route sees a consistent state.
      for (let i = 0; i < pendingUndoCount; i += 1) {
        const undoRes = await fetch(`/api/applications/${app.id}/undo-status`, {
          method: "POST",
        });
        const undoData = await undoRes.json().catch(() => null);
        if (!undoRes.ok || !undoData?.ok) {
          throw new Error(undoData?.error ?? "Undo failed");
        }
      }

      // Step 2: PATCH any other field edits. Skip `status` when an undo
      // was just applied — the server already set status to its prior
      // value. Sending it again would trigger the conditional-update
      // conflict path and create a forward event.
      // Only send fields the user actually filled. Fields left blank are
      // omitted so the server treats them as "no change" rather than
      // forcing the user to satisfy validation for fields they never set.
      const body: Record<string, unknown> = {
        company: form.company.trim(),
        roleTitle: form.roleTitle.trim(),
      };
      if (!pendingUndo) body.status = form.status;

      const optionalString: [keyof typeof form, string][] = [
        ["jobUrl", "jobUrl"],
        ["location", "location"],
        ["contactName", "contactName"],
        ["contactEmail", "contactEmail"],
        ["contactLinkedIn", "contactLinkedIn"],
        ["notes", "notes"],
        ["jobDescription", "jobDescription"],
      ];
      for (const [field, key] of optionalString) {
        const v = String(form[field] ?? "").trim();
        if (v) body[key] = v;
      }

      if (form.source) body.source = form.source;
      if (form.priority) body.priority = form.priority;
      // boardColumnId is no longer user-editable. Server keeps it in
      // sync with status whenever status changes.
      body.resumeId = form.resumeId || "";

      if (form.nextFollowUp) {
        body.nextFollowUp = new Date(form.nextFollowUp).toISOString();
      }
      if (form.salaryMin) body.salaryMin = parseInt(form.salaryMin, 10);
      if (form.salaryMax) body.salaryMax = parseInt(form.salaryMax, 10);
      if (form.salaryMin || form.salaryMax) body.currency = form.currency;

      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Save failed");
      }

      setPendingUndoCount(0);
      toast(pendingUndo ? "Undo applied and saved" : "Application updated", "success");
      onSaved();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    setConfirmingDelete(false);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Delete failed");
      }
      toast("Application deleted", "success");
      onDeleted();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  // Stage a true undo (event-void) without hitting the server. handleSave
  // calls /undo-status before the PATCH. Closing the panel discards.
  function performUndo() {
    setConfirmingUndo(false);
    if (pendingUndoCount >= timeline.length) return;
    setPendingUndoCount((n) => n + 1);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
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
                <p className="font-mono text-[9px] text-[var(--color-ink-muted)] mt-1.5">
                  Status drives the column. Changing it moves the card to the matching column.
                </p>
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
                <div className="flex items-center gap-2">
                  {pendingUndoCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPendingUndoCount((n) => Math.max(0, n - 1))}
                      className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] px-2 py-1"
                      title="Remove last staged undo"
                    >
                      − stage
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmingUndo(true)}
                    disabled={pendingUndoCount >= timeline.length}
                    className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-ink)] border border-[var(--color-line)] rounded-md px-2.5 py-1 hover:bg-[var(--color-canvas)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {pendingUndoCount > 0
                      ? `Undo staged · ${pendingUndoCount}`
                      : "Undo last"}
                  </button>
                </div>
              </div>
              {pendingUndoCount > 0 && (
                <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[oklch(0.55_0.13_30)] mb-2">
                  Will void {pendingUndoCount} {pendingUndoCount === 1 ? "event" : "events"}.
                  Save to commit, close panel to discard.
                </p>
              )}
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {timeline.map((ev, i) => {
                  // Mark the latest N events as "will void" (most recent first)
                  const willVoid = i >= timeline.length - pendingUndoCount;
                  return (
                    <div
                      key={ev.id}
                      className={`flex items-center gap-2 text-[11px] py-1.5 px-2 rounded-md bg-[var(--color-canvas)] ${willVoid ? "opacity-40 line-through" : ""}`}
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
                  );
                })}
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
            onClick={() => setConfirmingDelete(true)}
            className="ml-auto px-4 py-2 text-[12px] font-mono tracking-wide rounded-md transition-colors duration-[180ms]"
            style={{ color: "oklch(0.55 0.13 30)" }}
          >
            Delete
          </button>
        </div>

      </div>

      {/* Confirms portaled to body so they escape the panel's transform stacking context */}
      {typeof document !== "undefined" && confirmingDelete &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
            onClick={() => setConfirmingDelete(false)}
          >
            <div
              className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md shadow-lg p-5 w-[88%] max-w-[420px]"
              onClick={(e) => e.stopPropagation()}
              style={{ animation: "fade-up 160ms ease-out both" }}
            >
              <h3 className="text-[14px] font-semibold text-[var(--color-ink)] mb-1">
                Delete this application?
              </h3>
              <p className="text-[12px] text-[var(--color-ink-muted)] mb-4">
                {app.company} — {app.roleTitle}. This cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="px-3 py-1.5 text-[12px] font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={performDelete}
                  className="px-3 py-1.5 text-[12px] font-mono text-white rounded-md"
                  style={{ background: "oklch(0.55 0.13 30)" }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {typeof document !== "undefined" && confirmingUndo &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
            onClick={() => setConfirmingUndo(false)}
          >
            <div
              className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md shadow-lg p-5 w-[88%] max-w-[420px]"
              onClick={(e) => e.stopPropagation()}
              style={{ animation: "fade-up 160ms ease-out both" }}
            >
              {(() => {
                const idx = timeline.length - 1 - pendingUndoCount;
                const target = timeline[idx];
                return (
                  <>
                    <h3 className="text-[14px] font-semibold text-[var(--color-ink)] mb-1">
                      Stage undo · #{pendingUndoCount + 1}?
                    </h3>
                    <p className="text-[12px] text-[var(--color-ink-muted)] mb-4">
                      {target
                        ? `Will revert ${statusLabel(target.toStatus)} → ${statusLabel(target.fromStatus)} when you click Save. Stack more by clicking again. Close the panel to discard all.`
                        : "No more events to revert."}
                    </p>
                  </>
                );
              })()}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingUndo(false)}
                  className="px-3 py-1.5 text-[12px] font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={performUndo}
                  className="px-3 py-1.5 text-[12px] font-mono text-white rounded-md bg-[var(--color-ink)] hover:bg-[var(--color-ink)]/90"
                >
                  Stage undo
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
