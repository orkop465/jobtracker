"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBanner } from "@/components/ui/error-banner";
import { useToast } from "@/components/ui/toast";

type Resume = {
  id: string;
  label: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  gcsPath: string;
};

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}

export default function ResumesPage() {
  const { toast } = useToast();
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
    } else {
      setItems(data?.items ?? []);
    }
    if (showSpinner) setLoading(false);
  }

  useEffect(() => { load(true); }, []);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!label.trim()) { setErr("Label is required"); return; }
    if (!file) { setErr("PDF file is required"); return; }
    if (file.type !== "application/pdf") { setErr("Only PDF files are allowed"); return; }
    if (file.size > 2 * 1024 * 1024) { setErr("PDF must be 2MB or smaller"); return; }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("label", label.trim());
      fd.append("file", file);
      const res = await fetch("/api/resumes", { method: "POST", body: fd });
      const data = await safeJson(res);
      if (!res.ok) { setErr(data?.error ?? "Upload failed"); return; }
      toast("Resume uploaded", "success");
      setLabel("");
      setFile(null);
      // Reset the file input
      const fileInput = document.getElementById("resume-file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      await load(false);
    } finally {
      setBusy(false);
    }
  }

  async function onView(resumeId: string) {
    setErr(null);
    const res = await fetch(`/api/resumes/${resumeId}/view`, { cache: "no-store" });
    const data = await safeJson(res);
    if (!res.ok) { toast(data?.error ?? "View failed", "error"); return; }
    if (!data?.url) { toast("View failed: missing signed URL", "error"); return; }
    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  async function onDelete(resumeId: string) {
    const prev = items;
    setItems((cur) => cur.filter((r) => r.id !== resumeId));
    const res = await fetch(`/api/resumes/${resumeId}`, { method: "DELETE" });
    const data = await safeJson(res);
    if (!res.ok) {
      setItems(prev);
      toast(data?.error ?? "Delete failed", "error");
    } else {
      toast("Resume deleted", "success");
    }
  }

  return (
    <div className="space-y-4">
      <div className="pb-5 border-b border-white/5">
        <div className="section-index text-purple mb-2">04 / Documents</div>
        <h1 className="text-2xl font-display text-text-primary">Resumes</h1>
        <p className="font-data text-[9px] text-text-muted mt-1 uppercase tracking-widest">{items.length} resume{items.length !== 1 ? "s" : ""} uploaded</p>
      </div>

      {/* Upload form */}
      <Card>
        <form onSubmit={onUpload} className="space-y-3">
          <Input
            label="Label"
            placeholder="e.g. SDE General v3"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium text-text-muted tracking-[0.1em] uppercase font-data">PDF File</label>
            <input
              id="resume-file-input"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-border file:text-sm file:font-medium file:bg-surface-2 file:text-text-primary hover:file:bg-surface-3 file:cursor-pointer file:transition-colors"
            />
            <p className="text-xs text-text-muted">PDF only, max 2 MB</p>
          </div>
          <Button type="submit" variant="primary" loading={busy}>
            Upload Resume
          </Button>
          {err && <ErrorBanner message={err} onDismiss={() => setErr(null)} />}
        </form>
      </Card>

      {/* Resume list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-text-muted text-sm animate-pulse">Loading resumes...</div>
        </div>
      ) : items.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-lg font-semibold text-text-primary mb-2">No resumes yet</p>
          <p className="text-sm text-text-muted">Upload a PDF to start attaching resume versions to applications.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <Card key={r.id} padding="sm" className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-text-primary text-sm truncate">{r.label}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {r.filename} &middot; {(r.sizeBytes / 1024).toFixed(0)} KB &middot; {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => onView(r.id)}>View</Button>
                <Button variant="danger" size="sm" onClick={() => onDelete(r.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
