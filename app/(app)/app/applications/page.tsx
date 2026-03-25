"use client";

import { useEffect, useState } from "react";

type Resume = {
  id: string;
  label: string;
};

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
};

type StatusEvent = {
  id: string;
  fromStatus: string;
  toStatus: string;
  occurredAt: string;
};

const PAGE_SIZE = 8;

const panelStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  background: "#0f0f0f",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
  padding: "10px 12px",
};

const selectStyle: React.CSSProperties = {
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
  padding: "6px 8px",
};

const STATUS_OPTIONS = [
  { value: "APPLIED", label: "Applied" },
  { value: "RECRUITER_SCREEN", label: "Recruiter Screen" },
  { value: "OA", label: "OA" },
  { value: "INTERVIEW_ROUND_1", label: "Round 1" },
  { value: "INTERVIEW_ROUND_2", label: "Round 2" },
  { value: "INTERVIEW_ROUND_3", label: "Final Round" },
  { value: "OFFER", label: "Offer" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "GHOSTED", label: "Ghosted" },
] as const;

function statusLabel(value: string) {
  const found = STATUS_OPTIONS.find((s) => s.value === value);
  return found?.label ?? value;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        border: "1px solid #6b1d1d",
        background: "#2a0f12",
        color: "#ffb4b4",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      {message}
    </div>
  );
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function ApplicationsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [companyQuery, setCompanyQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [location, setLocation] = useState("");
  const [resumeIdForCreate, setResumeIdForCreate] = useState("");
  const [resumes, setResumes] = useState<Resume[]>([]);

  const [openTimelineId, setOpenTimelineId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Record<string, StatusEvent[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

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

    const res = await fetch("/api/applications", { cache: "no-store" });
    const data = await safeJson(res);

    if (!res.ok) {
      setItems([]);
      setErr(data?.error ?? `Failed to load applications (${res.status})`);
      if (showSpinner) setLoading(false);
      return;
    }

    setItems(data?.items ?? []);
    if (showSpinner) setLoading(false);
  }

  async function loadResumes() {
    const res = await fetch("/api/resumes", { cache: "no-store" });
    const data = await safeJson(res);

    if (!res.ok) {
      setResumes([]);
      setErr(data?.error ?? `Failed to load resumes (${res.status})`);
      return;
    }

    setResumes((data?.items ?? []).map((r: { id: string; label: string }) => ({ id: r.id, label: r.label })));
  }

  async function onDelete(id: string) {
    if (busyId === id) return;
    setErr(null);

    const prev = items;
    setItems((cur) => cur.filter((a) => a.id !== id));
    setBusyId(id);

    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      const data = await safeJson(res);

      if (!res.ok) {
        setItems(prev);
        setErr(data?.error ?? `Delete failed (${res.status})`);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function onStatusChange(id: string, status: string) {
    if (busyId === id) return;
    setErr(null);

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
        setErr(data?.error ?? `Update failed (${res.status})`);
        return;
      }

      if (openTimelineId === id) {
        await loadTimeline(id);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function onCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company,
        roleTitle,
        jobUrl,
        location,
        resumeId: resumeIdForCreate,
      }),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      setErr(data?.error ?? `Request failed (${res.status})`);
      return;
    }

    setCompany("");
    setRoleTitle("");
    setJobUrl("");
    setLocation("");
    setResumeIdForCreate("");
    await load(false);
  }

  async function onResumeChange(id: string, resumeId: string) {
    if (busyId === id) return;
    setErr(null);

    const prev = items;
    const nextResume = resumes.find((r) => r.id === resumeId) ?? null;

    setItems((cur) =>
      cur.map((a) =>
        a.id === id
          ? {
              ...a,
              resumeId: resumeId || null,
              resume: resumeId ? nextResume : null,
            }
          : a
      )
    );

    setBusyId(id);

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setItems(prev);
        setErr(data?.error ?? `Resume update failed (${res.status})`);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function loadTimeline(appId: string) {
    const res = await fetch(`/api/applications/${appId}/status-events`, { cache: "no-store" });
    const data = await safeJson(res);

    if (!res.ok) {
      setErr(data?.error ?? `Failed to load timeline (${res.status})`);
      return;
    }

    setTimeline((cur) => ({ ...cur, [appId]: data?.items ?? [] }));
  }

  async function onToggleTimeline(appId: string) {
    if (openTimelineId === appId) {
      setOpenTimelineId(null);
      return;
    }

    setOpenTimelineId(appId);
    await loadTimeline(appId);
  }

  async function onUndoStatus(appId: string) {
    if (busyId === appId) return;
    setErr(null);
    setBusyId(appId);

    try {
      const res = await fetch(`/api/applications/${appId}/undo-status`, { method: "POST" });
      const data = await safeJson(res);

      if (!res.ok) {
        setErr(data?.error ?? `Undo failed (${res.status})`);
        return;
      }

      setItems((cur) => cur.map((a) => (a.id === appId ? { ...a, status: data.newStatus } : a)));

      if (openTimelineId === appId) {
        await loadTimeline(appId);
      }
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    load(true);
    loadResumes();
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [companyQuery, statusFilter, items.length]);

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Applications</h1>

      <form onSubmit={onCreate} style={{ ...panelStyle, display: "grid", gap: 8, marginBottom: 18 }}>
        <input
          placeholder="Company (required)"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          placeholder="Role title (required)"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          placeholder="Job URL (optional)"
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={inputStyle}
        />
        <label style={{ fontSize: 13, opacity: 0.85 }}>
          Resume{" "}
          <select
            value={resumeIdForCreate}
            onChange={(e) => setResumeIdForCreate(e.target.value)}
            style={{ ...selectStyle, marginLeft: 6 }}
          >
            <option value="">None</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" style={{ padding: "10px 12px" }}>
          Add application
        </button>

        {err && <ErrorBanner message={err} />}
      </form>

      <div style={{ ...panelStyle, display: "grid", gap: 12, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, opacity: 0.82 }}>
            Showing {Math.min(visibleItems.length, filteredItems.length)} of {filteredItems.length} matching
            {filteredItems.length !== items.length ? ` (${items.length} total)` : ""}
          </div>
          <button type="button" onClick={() => load(false)} style={{ padding: "8px 10px" }}>
            Refresh
          </button>
        </div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "2fr 1fr" }}>
          <input
            placeholder="Search by company"
            value={companyQuery}
            onChange={(e) => setCompanyQuery(e.target.value)}
            style={inputStyle}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="ALL">All statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={panelStyle}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={panelStyle}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>No applications yet</div>
          <div style={{ opacity: 0.8 }}>
            Add your first application above to start tracking pipeline status, resumes, and analytics.
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={panelStyle}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>No matches</div>
          <div style={{ opacity: 0.8 }}>Try a different company search or clear the status filter.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {visibleItems.map((a) => (
            <div key={a.id} style={{ ...panelStyle, opacity: busyId === a.id ? 0.8 : 1 }}>
              <div style={{ fontWeight: 700 }}>
                {a.company} - {a.roleTitle}
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ fontSize: 13, opacity: 0.85 }}>
                  Status{" "}
                  <select
                    value={a.status}
                    onChange={(e) => onStatusChange(a.id, e.target.value)}
                    disabled={busyId === a.id}
                    style={{ ...selectStyle, marginLeft: 6 }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <span style={{ fontSize: 13, opacity: 0.8 }}>
                  Applied: {new Date(a.appliedAt).toLocaleString()}
                </span>

                <button
                  onClick={() => onDelete(a.id)}
                  disabled={busyId === a.id}
                  style={{ marginLeft: "auto", padding: "6px 10px" }}
                  type="button"
                >
                  Delete
                </button>

                <button
                  type="button"
                  onClick={() => onToggleTimeline(a.id)}
                  disabled={busyId === a.id}
                  style={{ padding: "6px 10px" }}
                >
                  {openTimelineId === a.id ? "Hide timeline" : "Timeline"}
                </button>

                <button
                  type="button"
                  onClick={() => onUndoStatus(a.id)}
                  disabled={busyId === a.id}
                  style={{ padding: "6px 10px" }}
                >
                  Undo
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 13, opacity: 0.85 }}>
                  Resume{" "}
                  <select
                    value={a.resumeId ?? ""}
                    onChange={(e) => onResumeChange(a.id, e.target.value)}
                    disabled={busyId === a.id}
                    style={{ ...selectStyle, marginLeft: 6 }}
                  >
                    <option value="">None</option>
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>

                {a.resume?.label && (
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>Selected: {a.resume.label}</div>
                )}
              </div>

              {openTimelineId === a.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #222" }}>
                  <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>Status timeline</div>

                  {(timeline[a.id] ?? []).length === 0 ? (
                    <div style={{ fontSize: 13, opacity: 0.7 }}>No status changes yet.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {(timeline[a.id] ?? []).map((ev) => (
                        <div key={ev.id} style={{ fontSize: 13, opacity: 0.9 }}>
                          <span style={{ opacity: 0.75 }}>{new Date(ev.occurredAt).toLocaleString()}:</span>{" "}
                          {statusLabel(ev.fromStatus)} {"->"} {statusLabel(ev.toStatus)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {a.location && <div>Location: {a.location}</div>}
              {a.jobUrl && (
                <div>
                  <a href={a.jobUrl} target="_blank" rel="noreferrer">
                    Job link
                  </a>
                </div>
              )}
            </div>
          ))}

          {filteredItems.length > visibleItems.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              style={{ padding: "10px 12px", justifySelf: "center", minWidth: 160 }}
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
