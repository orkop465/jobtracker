"use client";

import { useEffect, useState } from "react";

type Resume = {
  id: string;
  label: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  gcsPath: string;
};

const panelStyle: React.CSSProperties = {
  border: "1px solid #333",
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

export default function ResumesPage() {
  const [items, setItems] = useState<Resume[]>([]);
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setErr(null);

    const res = await fetch("/api/resumes", { cache: "no-store" });
    const data = await safeJson(res);

    if (!res.ok) {
      setItems([]);
      setErr(data?.error ?? `Failed to load resumes (${res.status})`);
      if (showSpinner) setLoading(false);
      return;
    }

    setItems(data?.items ?? []);
    if (showSpinner) setLoading(false);
  }

  useEffect(() => {
    load(true);
  }, []);

  async function onUpload(e: React.SyntheticEvent) {
    const MAX_BYTES = 2 * 1024 * 1024;

    e.preventDefault();
    setErr(null);

    if (!label.trim()) {
      setErr("Label is required");
      return;
    }
    if (!file) {
      setErr("PDF file is required");
      return;
    }
    if (file.type !== "application/pdf") {
      setErr("Only PDF files are allowed");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr("PDF must be 2MB or smaller");
      return;
    }

    setBusy(true);

    try {
      const fd = new FormData();
      fd.append("label", label.trim());
      fd.append("file", file);

      const res = await fetch("/api/resumes", { method: "POST", body: fd });
      const data = await safeJson(res);

      if (!res.ok) {
        setErr(data?.error ?? "Upload failed");
        return;
      }

      setLabel("");
      setFile(null);
      await load(false);
    } finally {
      setBusy(false);
    }
  }

  async function onView(resumeId: string) {
    setErr(null);

    const res = await fetch(`/api/resumes/${resumeId}/view`, { cache: "no-store" });
    const data = await safeJson(res);

    if (!res.ok) {
      setErr(data?.error ?? `View failed (${res.status})`);
      return;
    }

    if (!data?.url) {
      setErr("View failed: missing signed URL");
      return;
    }

    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  async function onDelete(resumeId: string) {
    setErr(null);

    const prev = items;
    setItems((cur) => cur.filter((r) => r.id !== resumeId));

    const res = await fetch(`/api/resumes/${resumeId}`, { method: "DELETE" });
    const data = await safeJson(res);

    if (!res.ok) {
      setItems(prev);
      setErr(data?.error ?? `Delete failed (${res.status})`);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Resumes</h1>

      <form onSubmit={onUpload} style={{ ...panelStyle, display: "grid", gap: 8, marginBottom: 20 }}>
        <input
          placeholder="Label (ex: SDE general v3)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={inputStyle}
        />
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={inputStyle}
        />
        <div style={{ fontSize: 13, opacity: 0.78 }}>Upload a PDF up to 2 MB. Keep labels clear so application history stays readable.</div>
        <button type="submit" disabled={busy} style={{ padding: "10px 12px" }}>
          {busy ? "Uploading..." : "Upload PDF"}
        </button>

        {err && <ErrorBanner message={err} />}
      </form>

      {loading ? (
        <div style={panelStyle}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={panelStyle}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>No resumes yet</div>
          <div style={{ opacity: 0.8 }}>
            Upload one PDF to start attaching the right resume version to each application.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((r) => (
            <div
              key={r.id}
              style={{
                ...panelStyle,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{r.label}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {r.filename} - {(r.sizeBytes / 1024).toFixed(1)} KB - {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onView(r.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #444",
                    background: "#111",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  View
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(r.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #552222",
                    background: "#220000",
                    color: "#ffb3b3",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
