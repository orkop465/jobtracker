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

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!label.trim()) return setErr("Label is required");
    if (!file) return setErr("PDF file is required");
    if (file.type !== "application/pdf") return setErr("Only PDF files are allowed");

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

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
        Resumes
      </h1>

      <form onSubmit={onUpload} style={{ display: "grid", gap: 8, marginBottom: 24 }}>
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
        <button type="submit" disabled={busy} style={{ padding: "10px 12px" }}>
          {busy ? "Uploading…" : "Upload PDF"}
        </button>

        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </form>

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((r) => (
          <div
            key={r.id}
            style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}
          >
            <div style={{ fontWeight: 700 }}>{r.label}</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              {r.filename} • {(r.sizeBytes / 1024).toFixed(1)} KB •{" "}
              {new Date(r.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
