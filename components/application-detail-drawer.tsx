"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge, statusToBadgeVariant, priorityToBadgeVariant } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  STATUS_OPTIONS,
  SOURCE_OPTIONS,
  PRIORITY_OPTIONS,
  CURRENCY_OPTIONS,
  statusLabel,
  sourceLabel,
  priorityLabel,
} from "@/lib/constants";

interface Resume {
  id: string;
  label: string;
}

interface StatusEvent {
  id: string;
  fromStatus: string;
  toStatus: string;
  occurredAt: string;
}

interface Application {
  id: string;
  company: string;
  roleTitle: string;
  jobUrl: string | null;
  location: string | null;
  status: string;
  appliedAt: string;
  resumeId: string | null;
  resume: Resume | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactLinkedIn: string | null;
  notes: string | null;
  source: string | null;
  jobDescription: string | null;
  priority: string | null;
  nextFollowUp: string | null;
}

interface DrawerProps {
  app: Application | null;
  resumes: Resume[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function ApplicationDetailDrawer({ app, resumes, open, onClose, onSaved, onDeleted }: DrawerProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [timeline, setTimeline] = useState<StatusEvent[]>([]);

  // Form state
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("APPLIED");
  const [resumeId, setResumeId] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactLinkedIn, setContactLinkedIn] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");

  // Sync form when app changes
  useEffect(() => {
    if (!app) return;
    setCompany(app.company);
    setRoleTitle(app.roleTitle);
    setJobUrl(app.jobUrl ?? "");
    setLocation(app.location ?? "");
    setStatus(app.status);
    setResumeId(app.resumeId ?? "");
    setSalaryMin(app.salaryMin != null ? String(app.salaryMin) : "");
    setSalaryMax(app.salaryMax != null ? String(app.salaryMax) : "");
    setCurrency(app.currency ?? "USD");
    setContactName(app.contactName ?? "");
    setContactEmail(app.contactEmail ?? "");
    setContactLinkedIn(app.contactLinkedIn ?? "");
    setNotes(app.notes ?? "");
    setSource(app.source ?? "");
    setJobDescription(app.jobDescription ?? "");
    setPriority(app.priority ?? "");
    setNextFollowUp(app.nextFollowUp ? app.nextFollowUp.slice(0, 16) : "");

    // Fetch timeline
    fetch(`/api/applications/${app.id}/status-events`)
      .then((r) => r.json())
      .then((d) => setTimeline(d.items ?? []))
      .catch(() => setTimeline([]));
  }, [app]);

  if (!app) return null;

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        company,
        roleTitle,
        jobUrl,
        location,
        status,
        resumeId,
        contactName,
        contactEmail,
        contactLinkedIn,
        notes,
        source: source || null,
        jobDescription,
        priority: priority || null,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp).toISOString() : "",
        currency,
      };
      if (salaryMin) body.salaryMin = parseInt(salaryMin, 10);
      else body.salaryMin = null;
      if (salaryMax) body.salaryMax = parseInt(salaryMax, 10);
      else body.salaryMax = null;

      const res = await fetch(`/api/applications/${app!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save");
      }

      toast("Application updated", "success");
      onSaved();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${app!.company} - ${app!.roleTitle}?`)) return;
    try {
      const res = await fetch(`/api/applications/${app!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast("Application deleted", "success");
      onDeleted();
      onClose();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  async function handleUndo() {
    try {
      const res = await fetch(`/api/applications/${app!.id}/undo-status`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Undo failed");
      toast(`Status reverted to ${statusLabel(data.newStatus)}`, "success");
      onSaved();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Undo failed", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`${app.company} — ${app.roleTitle}`} width="max-w-xl">
      <div className="space-y-6">
        {/* Status & Priority header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={statusToBadgeVariant(status)} dot>{statusLabel(status)}</Badge>
          {priority && (
            <Badge variant={priorityToBadgeVariant(priority)}>{priorityLabel(priority)} Priority</Badge>
          )}
          {source && (
            <Badge variant="default">{sourceLabel(source)}</Badge>
          )}
        </div>

        {/* Core fields */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
            <Input label="Role Title" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Remote, NYC" />
            <Input label="Job URL" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[...STATUS_OPTIONS]} />
            <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} options={[...PRIORITY_OPTIONS]} placeholder="Select..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Source" value={source} onChange={(e) => setSource(e.target.value)} options={[...SOURCE_OPTIONS]} placeholder="Where found..." />
            <Select
              label="Resume"
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              options={resumes.map((r) => ({ value: r.id, label: r.label }))}
              placeholder="None"
            />
          </div>
          <div>
            <Input
              label="Follow-up Date"
              type="datetime-local"
              value={nextFollowUp}
              onChange={(e) => setNextFollowUp(e.target.value)}
            />
          </div>
        </section>

        {/* Compensation */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Compensation</h3>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Min Salary" type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="0" />
            <Input label="Max Salary" type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="0" />
            <Select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} options={[...CURRENCY_OPTIONS]} />
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Contact</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Recruiter name" />
            <Input label="Email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="recruiter@..." />
          </div>
          <Input label="LinkedIn" value={contactLinkedIn} onChange={(e) => setContactLinkedIn(e.target.value)} placeholder="https://linkedin.com/in/..." />
        </section>

        {/* Notes */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Notes</h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Interview prep, reflections, questions asked..."
            maxLength={10000}
            charCount
            className="min-h-[100px]"
          />
        </section>

        {/* Job Description */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Job Description</h3>
          <Textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here (postings get taken down!)"
            maxLength={50000}
            charCount
            className="min-h-[120px]"
          />
        </section>

        {/* Timeline */}
        {timeline.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Timeline</h3>
              <Button variant="ghost" size="sm" onClick={handleUndo}>Undo Last</Button>
            </div>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {timeline.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 text-xs text-text-secondary py-1.5 px-2 rounded-md bg-surface-2">
                  <Badge variant={statusToBadgeVariant(ev.fromStatus)} className="text-[10px]">{statusLabel(ev.fromStatus)}</Badge>
                  <span className="text-text-muted">&rarr;</span>
                  <Badge variant={statusToBadgeVariant(ev.toStatus)} className="text-[10px]">{statusLabel(ev.toStatus)}</Badge>
                  <span className="ml-auto text-text-muted font-mono text-[10px]">
                    {new Date(ev.occurredAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Button variant="primary" onClick={handleSave} loading={saving}>Save Changes</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} className="ml-auto">Delete</Button>
        </div>
      </div>
    </Modal>
  );
}
