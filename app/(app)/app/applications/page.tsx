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

  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [location, setLocation] = useState("");
  const [resumeIdForCreate, setResumeIdForCreate] = useState("");
  const [resumes, setResumes] = useState<Resume[]>([]);

  const [openTimelineId, setOpenTimelineId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Record<string, StatusEvent[]>>({});

  // Prevent double-submits on the same row
  const [busyId, setBusyId] = useState<string | null>(null);

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

    setResumes((data?.items ?? []).map((r: any) => ({ id: r.id, label: r.label })));
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
        return;
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
            resumeId: resumeId ? resumeId : null,
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
        return;
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

      // Update the application status in the list immediately
      setItems((cur) =>
        cur.map((a) => (a.id === appId ? { ...a, status: data.newStatus } : a))
      );

      // Refresh timeline UI if it's open
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

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
        Applications
      </h1>

      <form onSubmit={onCreate} style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <input
          placeholder="Company (required)"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
        />
        <input
          placeholder="Role title (required)"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          required
        />
        <input
          placeholder="Job URL (optional)"
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
        />
        <input
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <label style={{ fontSize: 13, opacity: 0.85 }}>
          Resume (optional){" "}
          <select
            value={resumeIdForCreate}
            onChange={(e) => setResumeIdForCreate(e.target.value)}
            style={{
              marginLeft: 6,
              background: "#111",
              color: "#fff",
              border: "1px solid #333",
              borderRadius: 8,
              padding: "6px 8px",
            }}
          >
            <option value="" style={{ background: "#111", color: "#fff" }}>
              None
            </option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id} style={{ background: "#111", color: "#fff" }}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" style={{ padding: "10px 12px" }}>
          Add application
        </button>

        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </form>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((a) => (
            <div
              key={a.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: 12,
                opacity: busyId === a.id ? 0.8 : 1,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {a.company} — {a.roleTitle}
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ fontSize: 13, opacity: 0.85 }}>
                  Status{" "}
                  <select
                    value={a.status}
                    onChange={(e) => onStatusChange(a.id, e.target.value)}
                    disabled={busyId === a.id}
                    style={{
                      marginLeft: 6,
                      background: "#111",
                      color: "#fff",
                      border: "1px solid #333",
                      borderRadius: 8,
                      padding: "6px 8px",
                    }}
                  >
                    <option value="APPLIED" style={{ background: "#111", color: "#fff" }}>
                      APPLIED
                    </option>
                    <option value="RECRUITER_SCREEN" style={{ background: "#111", color: "#fff" }}>
                      RECRUITER_SCREEN
                    </option>
                    <option value="OA" style={{ background: "#111", color: "#fff" }}>
                      OA
                    </option>
                    <option value="INTERVIEW_ROUND_1" style={{ background: "#111", color: "#fff" }}>
                      INTERVIEW_ROUND_1
                    </option>
                    <option value="INTERVIEW_ROUND_2" style={{ background: "#111", color: "#fff" }}>
                      INTERVIEW_ROUND_2
                    </option>
                    <option value="INTERVIEW_ROUND_3" style={{ background: "#111", color: "#fff" }}>
                      INTERVIEW_ROUND_3
                    </option>
                    <option value="OFFER" style={{ background: "#111", color: "#fff" }}>
                      OFFER
                    </option>
                    <option value="REJECTED" style={{ background: "#111", color: "#fff" }}>
                      REJECTED
                    </option>
                    <option value="WITHDRAWN" style={{ background: "#111", color: "#fff" }}>
                      WITHDRAWN
                    </option>
                    <option value="GHOSTED" style={{ background: "#111", color: "#fff" }}>
                      GHOSTED
                    </option>
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
                    style={{
                      marginLeft: 6,
                      background: "#111",
                      color: "#fff",
                      border: "1px solid #333",
                      borderRadius: 8,
                      padding: "6px 8px",
                    }}
                  >
                    <option value="" style={{ background: "#111", color: "#fff" }}>
                      None
                    </option>
                    {resumes.map((r) => (
                      <option
                        key={r.id}
                        value={r.id}
                        style={{ background: "#111", color: "#fff" }}
                      >
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>

                {a.resume?.label && (
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
                    Selected: {a.resume.label}
                  </div>
                )}
              </div>

              {openTimelineId === a.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #222" }}>
                  <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>
                    Status timeline
                  </div>

                  {(timeline[a.id] ?? []).length === 0 ? (
                    <div style={{ fontSize: 13, opacity: 0.7 }}>No status changes yet.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {(timeline[a.id] ?? []).map((ev) => (
                        <div key={ev.id} style={{ fontSize: 13, opacity: 0.9 }}>
                          <span style={{ opacity: 0.75 }}>
                            {new Date(ev.occurredAt).toLocaleString()}:
                          </span>{" "}
                          {ev.fromStatus} → {ev.toStatus}
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
        </div>
      )}
    </div>
  );
}
