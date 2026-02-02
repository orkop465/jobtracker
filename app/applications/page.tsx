"use client";

import { useEffect, useState } from "react";

type Application = {
  id: string;
  company: string;
  roleTitle: string;
  jobUrl: string | null;
  location: string | null;
  status: string;
  appliedAt: string;
};

export default function ApplicationsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [location, setLocation] = useState("");

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setErr(null);

    const res = await fetch("/api/applications", { cache: "no-store" });
    const data = await res.json();

    setItems(data.items ?? []);
    if (showSpinner) setLoading(false);
  }

  async function onDelete(id: string) {
    setErr(null);

    const prev = items;
    setItems((cur) => cur.filter((a) => a.id !== id));

    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setItems(prev);
      setErr(data.error ?? "Delete failed");
      return;
    }
  }

  async function onStatusChange(id: string, status: string) {
    setErr(null);

    const prev = items;
    setItems((cur) => cur.map((a) => (a.id === id ? { ...a, status } : a)));

    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    if (!res.ok) {
      setItems(prev);
      setErr(data.error ?? "Update failed");
      return;
    }
  }


  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, roleTitle, jobUrl, location }),
    });

    const data = await res.json();
    if (!res.ok) {
      setErr(data.error ?? "Request failed");
      return;
    }

    setCompany("");
    setRoleTitle("");
    setJobUrl("");
    setLocation("");
    await load(false);
  }

  useEffect(() => {
    load(true);
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
                    <option value="SCREEN" style={{ background: "#111", color: "#fff" }}>
                      SCREEN
                    </option>
                    <option value="INTERVIEW" style={{ background: "#111", color: "#fff" }}>
                      INTERVIEW
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
                  </select>
                </label>

                <span style={{ fontSize: 13, opacity: 0.8 }}>
                  Applied: {new Date(a.appliedAt).toLocaleString()}
                </span>

                <button
                  onClick={() => onDelete(a.id)}
                  style={{ marginLeft: "auto", padding: "6px 10px" }}
                  type="button"
                >
                  Delete
                </button>
              </div>
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
