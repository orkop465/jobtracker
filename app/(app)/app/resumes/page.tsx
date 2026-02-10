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

export default function ResumesPage() {
  const [items, setItems] = useState<Resume[]>([]);
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/resumes", { cache: "no-store" });
    const data = await res.json();
    setItems(data.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onUpload(e: React.SyntheticEvent) {
    const MAX_BYTES = 2 * 1024 * 1024;

    e.preventDefault();
    setErr(null);

    if (!label.trim()) return setErr("Label is required");
    if (!file) return setErr("PDF file is required");
    if (file.type !== "application/pdf") return setErr("Only PDF files are allowed");
    if (file.size > MAX_BYTES) return setErr("PDF must be 2MB or smaller");

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("label", label.trim());
      fd.append("file", file);

      const res = await fetch("/api/resumes", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setErr(data.error ?? "Upload failed");
        return;
      }

      setLabel("");
      setFile(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function onView(resumeId: string) {
    setErr(null);

    const res = await fetch(`/api/resumes/${resumeId}/view`, { cache: "no-store" });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

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
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      setItems(prev);
      setErr(data?.error ?? `Delete failed (${res.status})`);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
        Resumes
      </h1>

      <form
        onSubmit={onUpload}
        style={{ display: "grid", gap: 8, marginBottom: 24 }}
      >
        <input
          placeholder="Label (ex: SDE general v3)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="submit"
          disabled={busy}
          style={{ padding: "10px 12px" }}
        >
          {busy ? "Uploading…" : "Upload PDF"}
        </button>

        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </form>

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((r) => (
          <div
            key={r.id}
            style={{
              border: "1px solid #333",
              borderRadius: 10,
              padding: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {r.label}
              </div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                {r.filename} • {(r.sizeBytes / 1024).toFixed(1)} KB •{" "}
                {new Date(r.createdAt).toLocaleString()}
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
    </div>
  );
}
