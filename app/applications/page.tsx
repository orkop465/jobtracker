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

  async function load() {
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/applications", { cache: "no-store" });
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
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
    await load();
  }

  useEffect(() => {
    load();
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
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                Status: {a.status} • Applied: {new Date(a.appliedAt).toLocaleString()}
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
