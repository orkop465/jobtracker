"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LibraryCard } from "@/components/app/resumes/library-card";
import { DropZone } from "@/components/app/resumes/dropzone";
import { ParseAnimation } from "@/components/app/resumes/parse-animation";
import { PdfPreview } from "@/components/app/resumes/pdf-preview";
import { SentLog } from "@/components/app/resumes/sent-log";
import { DragOverlay } from "@/components/app/resumes/drag-overlay";
import {
  relativeTime,
  type Resume,
} from "@/components/app/resumes/types";

// TEMPORARY stop-gap (Task 3.5). Replaced by persisted-tag filter in Task 3.9.
type LegacyDerivedTag = "swe" | "pm" | "design" | "data" | "ml" | "other";
const LEGACY_TAG_PATTERNS: { tag: LegacyDerivedTag; rx: RegExp }[] = [
  { tag: "ml", rx: /\b(ml|machine\s?learning|ai|llm|nlp|recsys)\b/i },
  { tag: "data", rx: /\b(data|analyst|analytics|scientist)\b/i },
  { tag: "design", rx: /\b(design|ux|ui)\b/i },
  { tag: "pm", rx: /\b(pm|product\s?manager|product)\b/i },
  { tag: "swe", rx: /\b(swe|sde|engineer|frontend|backend|fullstack|full-stack|developer|software)\b/i },
];
function deriveLegacyTag(label: string): LegacyDerivedTag {
  for (const { tag, rx } of LEGACY_TAG_PATTERNS) {
    if (rx.test(label)) return tag;
  }
  return "other";
}

type TagFilter = "all" | LegacyDerivedTag;

const TAG_PILLS: { id: TagFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "swe", label: "SWE" },
  { id: "pm", label: "PM" },
  { id: "design", label: "Design" },
  { id: "data", label: "Data" },
  { id: "ml", label: "ML" },
];

const MAX_BYTES = 2 * 1024 * 1024;

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function defaultLabelFromFilename(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "").trim().slice(0, 120) || "Untitled resume";
}

function ResumesView() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Upload flow state
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadFilename, setUploadFilename] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const newlyCreatedIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/resumes", { cache: "no-store" });
      const data = await safeJson(res);
      if (!res.ok) {
        setResumes([]);
        setListError(data?.error ?? `Failed to load resumes (${res.status})`);
        return;
      }
      const items: Resume[] = data?.items ?? [];
      setResumes(items);
      setActiveId((current) => {
        if (newlyCreatedIdRef.current) {
          const next = newlyCreatedIdRef.current;
          newlyCreatedIdRef.current = null;
          return next;
        }
        if (current && items.some((r) => r.id === current)) return current;
        return items[0]?.id ?? null;
      });
    } catch (e) {
      console.error("[resumes] load failed", e);
      setResumes([]);
      setListError("Failed to load resumes. Check your connection and retry.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  // ?focus= deep link from board card detail panel.
  useEffect(() => {
    if (!focusId) return;
    if (resumes.some((r) => r.id === focusId)) {
      setActiveId(focusId);
    }
  }, [focusId, resumes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resumes.filter((r) => {
      const tag = deriveLegacyTag(r.label);
      if (tagFilter !== "all" && tag !== tagFilter) return false;
      if (!q) return true;
      return (
        r.label.toLowerCase().includes(q) ||
        r.filename.toLowerCase().includes(q) ||
        tag.includes(q)
      );
    });
  }, [resumes, search, tagFilter]);

  const active = useMemo(
    () => resumes.find((r) => r.id === activeId) ?? null,
    [resumes, activeId],
  );

  const validateFile = useCallback((file: File): string | null => {
    if (file.type !== "application/pdf") return "Only PDF files are allowed";
    if (file.size > MAX_BYTES) return "PDF must be 2 MB or smaller";
    if (file.size === 0) return "File is empty";
    return null;
  }, []);

  const startUpload = useCallback(
    async (file: File) => {
      if (uploading) return;
      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        toast(validationError, "error");
        return;
      }
      setUploadError(null);
      setUploadDone(false);
      setUploadFilename(file.name);
      setUploading(true);

      try {
        const fd = new FormData();
        fd.append("label", defaultLabelFromFilename(file.name));
        fd.append("file", file);
        const res = await fetch("/api/resumes", { method: "POST", body: fd });
        const data = await safeJson(res);
        if (!res.ok) {
          const msg = data?.error ?? "Upload failed";
          setUploadError(msg);
          toast(msg, "error");
          setUploading(false);
          return;
        }
        if (data?.item?.id) {
          newlyCreatedIdRef.current = data.item.id;
        }
        setUploadDone(true);
      } catch (e) {
        console.error("[resumes] upload failed", e);
        const msg = e instanceof Error ? e.message : "Upload failed";
        setUploadError(msg);
        toast(msg, "error");
        setUploading(false);
      }
    },
    [toast, uploading, validateFile],
  );

  const onParseDone = useCallback(() => {
    setUploading(false);
    setUploadDone(false);
    toast("Resume uploaded", "success");
    load(false);
  }, [load, toast]);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const requestDelete = (resumeId: string) => setPendingDeleteId(resumeId);

  const performDelete = useCallback(async () => {
    const resumeId = pendingDeleteId;
    if (!resumeId) return;
    setPendingDeleteId(null);

    const target = resumes.find((r) => r.id === resumeId);
    if (!target) return;

    const prev = resumes;
    setResumes((cur) => cur.filter((r) => r.id !== resumeId));
    if (activeId === resumeId) {
      const next = prev.find((r) => r.id !== resumeId) ?? null;
      setActiveId(next?.id ?? null);
    }
    const res = await fetch(`/api/resumes/${resumeId}`, { method: "DELETE" });
    const data = await safeJson(res);
    if (!res.ok) {
      setResumes(prev);
      toast(data?.error ?? "Delete failed", "error");
    } else {
      toast("Resume deleted", "success");
    }
  }, [activeId, pendingDeleteId, resumes, toast]);

  async function onDownload(resumeId: string) {
    const res = await fetch(`/api/resumes/${resumeId}/view?download=1`, {
      cache: "no-store",
    });
    const data = await safeJson(res);
    if (!res.ok || !data?.url) {
      toast(data?.error ?? "Download failed", "error");
      return;
    }
    window.location.href = data.url;
  }

  const triggerUploadPicker = () => fileInputRef.current?.click();

  return (
    <div className="resumes-page">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) startUpload(f);
          e.target.value = "";
        }}
      />

      {/* Toolbar */}
      <div className="res-toolbar">
        <div className="res-toolbar-search">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <circle cx="5.5" cy="5.5" r="3.8" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M11.5 11.5L8.5 8.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Search resumes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="res-toolbar-tags">
          {TAG_PILLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`res-tag-pill ${tagFilter === t.id ? "is-active" : ""}`}
              onClick={() => setTagFilter(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="res-toolbar-spacer" />
        <button
          type="button"
          className="res-toolbar-action primary"
          onClick={triggerUploadPicker}
          disabled={uploading}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Upload
        </button>
      </div>

      {/* Body */}
      <div className="res-body">
        {/* Library */}
        <aside className="res-library">
          <div className="res-library-head">
            <span>
              {loading
                ? "Loading…"
                : `${filtered.length} of ${resumes.length} resume${resumes.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <div className="res-library-list">
            {filtered.map((r) => (
              <LibraryCard
                key={r.id}
                resume={r}
                isActive={r.id === activeId}
                onClick={() => setActiveId(r.id)}
              />
            ))}
            {!loading && resumes.length > 0 && (
              <button
                type="button"
                className="res-card res-card-newvariant"
                onClick={triggerUploadPicker}
                disabled={uploading}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M6 2v8M2 6h8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                New variant
              </button>
            )}
            {listError && (
              <div className="res-sent-empty" style={{ color: "oklch(0.5 0.16 25)" }}>
                {listError}
              </div>
            )}
          </div>
        </aside>

        {/* Preview */}
        <div className="res-preview">
          {active ? (
            <>
              <div className="res-preview-head">
                <div className="res-preview-title-block">
                  <div className="res-preview-eyebrow">
                    Uploaded {relativeTime(active.createdAt)} · {active.filename}
                  </div>
                  <h2 className="res-preview-title">{active.label}</h2>
                </div>
                <div className="res-preview-actions">
                  <button
                    type="button"
                    className="res-toolbar-action"
                    onClick={() => requestDelete(active.id)}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="res-toolbar-action primary"
                    onClick={() => onDownload(active.id)}
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="res-preview-body">
                <div className="res-preview-stack">
                  <PdfPreview key={active.id} resumeId={active.id} />
                  <SentLog key={active.id} resumeId={active.id} />
                </div>
              </div>
            </>
          ) : loading ? (
            <div className="res-preview-empty">
              <div className="res-preview-empty-title">Loading library…</div>
            </div>
          ) : (
            <DropZone onFile={startUpload} error={uploadError} />
          )}
        </div>
      </div>

      <DragOverlay onDrop={startUpload} disabled={uploading} />

      {uploading && (
        <ParseAnimation
          filename={uploadFilename}
          finished={uploadDone}
          onDone={onParseDone}
        />
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this resume?"
        body={(() => {
          const t = resumes.find((r) => r.id === pendingDeleteId);
          return t
            ? `${t.label}. This removes the file from storage and detaches it from any applications.`
            : "";
        })()}
        onConfirm={performDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}

export default function ResumesPage() {
  return (
    <Suspense fallback={null}>
      <ResumesView />
    </Suspense>
  );
}
