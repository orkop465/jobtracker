"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, statusToBadgeVariant, priorityToBadgeVariant } from "@/components/ui/badge";
import { ErrorBanner } from "@/components/ui/error-banner";
import { useToast } from "@/components/ui/toast";
import { ApplicationDetailDrawer } from "@/components/application-detail-drawer";
import {
  STATUS_OPTIONS,
  SOURCE_OPTIONS,
  PRIORITY_OPTIONS,
  statusLabel,
  sourceLabel,
  priorityLabel,
} from "@/lib/constants";

type Resume = { id: string; label: string };

type Application = {
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
};

const PAGE_SIZE = 12;

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function ApplicationsPage() {
  const { toast } = useToast();

  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [companyQuery, setCompanyQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [resumes, setResumes] = useState<Resume[]>([]);

  // Create form
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [location, setLocation] = useState("");
  const [resumeIdForCreate, setResumeIdForCreate] = useState("");
  const [sourceForCreate, setSourceForCreate] = useState("");
  const [priorityForCreate, setPriorityForCreate] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Drawer
  const [drawerApp, setDrawerApp] = useState<Application | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filteredItems = items.filter((item) => {
    const matchesCompany =
      companyQuery.trim().length === 0 ||
      item.company.toLowerCase().includes(companyQuery.trim().toLowerCase());
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesCompany && matchesStatus;
  });

  const visibleItems = filteredItems.slice(0, visibleCount);

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/applications", { cache: "no-store" });
      const data = await safeJson(res);
      if (!res.ok) {
        setItems([]);
        setErr(data?.error ?? `Failed to load applications (${res.status})`);
      } else {
        setItems(data?.items ?? []);
      }
    } catch (e) {
      console.error("[applications] load failed", e);
      setItems([]);
      setErr("Failed to load applications. Check your connection and retry.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  async function loadResumes() {
    try {
      const res = await fetch("/api/resumes", { cache: "no-store" });
      const data = await safeJson(res);
      if (res.ok) {
        setResumes((data?.items ?? []).map((r: any) => ({ id: r.id, label: r.label })));
      }
    } catch (e) {
      console.error("[applications] loadResumes failed", e);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return; // double-submit guard
    setErr(null);
    setCreating(true);
    try {
      const body: Record<string, unknown> = { company, roleTitle, jobUrl, location, resumeId: resumeIdForCreate };
      if (sourceForCreate) body.source = sourceForCreate;
      if (priorityForCreate) body.priority = priorityForCreate;

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setErr(data?.error ?? `Request failed (${res.status})`);
        return;
      }
      toast(`Added ${company.trim()}`, "success");
      setCompany("");
      setRoleTitle("");
      setJobUrl("");
      setLocation("");
      setResumeIdForCreate("");
      setSourceForCreate("");
      setPriorityForCreate("");
      setShowCreateForm(false);
      await load(false);
    } catch (e) {
      console.error("[applications] create failed", e);
      setErr("Failed to create application. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function onStatusChange(id: string, status: string) {
    if (busyId === id) return;
    const prev = items;
    setItems((cur) => cur.map((a) => (a.id === id ? { ...a, status } : a)));
    setBusyId(id);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setItems(prev);
        toast(data?.error ?? "Update failed", "error");
      }
    } finally {
      setBusyId(null);
    }
  }

  function openDrawer(app: Application) {
    setDrawerApp(app);
    setDrawerOpen(true);
  }

  useEffect(() => {
    load(true);
    loadResumes();
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [companyQuery, statusFilter, items.length]);

  // Keep the drawer in sync when the items list is refreshed (e.g. after undo)
  useEffect(() => {
    if (drawerApp) {
      const updated = items.find((a) => a.id === drawerApp.id);
      if (updated) setDrawerApp(updated);
    }
  }, [items]);

  function formatSalary(app: Application) {
    if (app.salaryMin == null && app.salaryMax == null) return null;
    const cur = app.currency ?? "USD";
    const fmt = (n: number) => n.toLocaleString();
    if (app.salaryMin != null && app.salaryMax != null)
      return `${cur} ${fmt(app.salaryMin)} - ${fmt(app.salaryMax)}`;
    if (app.salaryMin != null) return `${cur} ${fmt(app.salaryMin)}+`;
    return `Up to ${cur} ${fmt(app.salaryMax!)}`;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-white/5 mb-1">
        <div>
          <div className="section-index text-orange mb-2">03 / Pipeline</div>
          <h1 className="text-2xl font-display text-text-primary">Applications</h1>
          <p className="font-data text-[9px] text-text-muted mt-1 uppercase tracking-widest">
            {items.length} total{filteredItems.length !== items.length ? ` / ${filteredItems.length} matching` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => load(false)}>Refresh</Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? "Cancel" : "+ Add"}
          </Button>
        </div>
      </div>

      {err && <ErrorBanner message={err} onDismiss={() => setErr(null)} />}

      {/* Create form */}
      {showCreateForm && (
        <Card className="animate-fade-in">
          <form onSubmit={onCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Company (required)" value={company} onChange={(e) => setCompany(e.target.value)} required />
              <Input placeholder="Role title (required)" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Job URL (optional)" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} />
              <Input placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Select
                value={resumeIdForCreate}
                onChange={(e) => setResumeIdForCreate(e.target.value)}
                options={resumes.map((r) => ({ value: r.id, label: r.label }))}
                placeholder="Resume..."
              />
              <Select
                value={sourceForCreate}
                onChange={(e) => setSourceForCreate(e.target.value)}
                options={[...SOURCE_OPTIONS]}
                placeholder="Source..."
              />
              <Select
                value={priorityForCreate}
                onChange={(e) => setPriorityForCreate(e.target.value)}
                options={[...PRIORITY_OPTIONS]}
                placeholder="Priority..."
              />
            </div>
            <Button type="submit" variant="primary" loading={creating} disabled={creating}>
              {creating ? "Adding..." : "Add Application"}
            </Button>
          </form>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by company..."
            value={companyQuery}
            onChange={(e) => setCompanyQuery(e.target.value)}
          />
        </div>
        <div className="w-[180px]">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: "ALL", label: "All statuses" }, ...STATUS_OPTIONS]}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-text-muted text-sm animate-pulse">Loading applications...</div>
        </div>
      ) : items.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-lg font-semibold text-text-primary mb-2">No applications yet</p>
          <p className="text-sm text-text-muted">Click &quot;+ Add&quot; to start tracking your job search.</p>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-lg font-semibold text-text-primary mb-2">No matches</p>
          <p className="text-sm text-text-muted">Try a different search or clear the status filter.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleItems.map((a) => {
            const salary = formatSalary(a);
            return (
              <Card
                key={a.id}
                hoverable
                padding="sm"
                onClick={() => openDrawer(a)}
                className={`group ${busyId === a.id ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {/* Left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-text-primary text-sm truncate">{a.company}</span>
                      <span className="text-text-muted text-sm hidden sm:inline">&mdash;</span>
                      <span className="text-text-secondary text-sm truncate hidden sm:inline">{a.roleTitle}</span>
                    </div>
                    {/* Mobile role title */}
                    <div className="text-text-secondary text-sm truncate sm:hidden mb-1">{a.roleTitle}</div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={statusToBadgeVariant(a.status)} dot>{statusLabel(a.status)}</Badge>
                      {a.priority && (
                        <Badge variant={priorityToBadgeVariant(a.priority)}>{priorityLabel(a.priority)}</Badge>
                      )}
                      {a.source && (
                        <Badge variant="default">{sourceLabel(a.source)}</Badge>
                      )}
                      {a.location && (
                        <span className="text-xs text-text-muted">{a.location}</span>
                      )}
                      {salary && (
                        <span className="text-xs text-positive font-mono">{salary}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: meta + quick status */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[11px] text-text-muted font-data tabular-nums">
                      {new Date(a.appliedAt).toLocaleDateString()}
                    </span>
                    <select
                      value={a.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        onStatusChange(a.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      disabled={busyId === a.id}
                      className="bg-surface-2 text-text-secondary text-xs border border-border rounded-md px-2 py-1 focus-ring cursor-pointer appearance-none"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subtitle row */}
                {(a.resume || a.contactName || a.nextFollowUp) && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                    {a.resume && <span>Resume: {a.resume.label}</span>}
                    {a.contactName && <span>Contact: {a.contactName}</span>}
                    {a.nextFollowUp && (
                      <span className={new Date(a.nextFollowUp) < new Date() ? "text-negative" : ""}>
                        Follow-up: {new Date(a.nextFollowUp).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {filteredItems.length > visibleItems.length && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Load more ({filteredItems.length - visibleItems.length} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Detail drawer */}
      <ApplicationDetailDrawer
        app={drawerApp}
        resumes={resumes}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerApp(null);
        }}
        onSaved={() => load(false)}
        onDeleted={() => load(false)}
      />
    </div>
  );
}
