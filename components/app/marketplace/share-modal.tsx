"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PrivateResumeOption {
  id: string;
  label: string;
  filename: string;
}

interface Props {
  privateResumes: PrivateResumeOption[];
  onClose: () => void;
  onToast: (msg: string) => void;
}

type Step = "chooser" | "uploading";

export function ShareModal({ privateResumes, onClose, onToast }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("chooser");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function uploadFile(file: File) {
    setStep("uploading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/marketplace/staging?mode=upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Upload failed");
        setStep("chooser");
        return;
      }
      onToast("Uploaded — redact it next");
      router.push(`/app/marketplace/submit?source=${encodeURIComponent(data.stagingKey)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStep("chooser");
    }
  }

  async function shareExisting(resumeId: string) {
    setStep("uploading");
    setError(null);
    try {
      const res = await fetch(
        `/api/marketplace/staging?mode=existing&resumeId=${encodeURIComponent(resumeId)}`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not stage resume");
        setStep("chooser");
        return;
      }
      const params = new URLSearchParams({ source: data.stagingKey });
      if (data.prefill?.roleCategory) params.set("role", data.prefill.roleCategory);
      if (data.prefill?.seniority) params.set("seniority", data.prefill.seniority);
      onToast("Loaded — redact it next");
      router.push(`/app/marketplace/submit?${params.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not stage resume");
      setStep("chooser");
    }
  }

  return (
    <div className="market-modal-overlay" onClick={onClose}>
      <div
        className="market-modal"
        style={{ gridTemplateColumns: "1fr", maxWidth: 540 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="market-modal-head">
          <div className="market-modal-eyebrow">Share your resume — anonymously</div>
          <h2 className="market-modal-title">
            {step === "uploading" ? "Staging…" : "Pick a resume to share"}
          </h2>
          <button className="market-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="market-modal-body" style={{ padding: "20px 24px 24px" }}>
          {step === "chooser" && (
            <>
              <p className="market-modal-bio">
                Pick a fresh PDF to upload, or share one from your library. You&apos;ll redact PII
                with a black-rectangle tool, then an admin reviews before anything goes public.
              </p>

              <div
                onClick={() => inputRef.current?.click()}
                style={{
                  border: "2px dashed var(--line-2)",
                  borderRadius: 6,
                  padding: "32px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "var(--bg-2)",
                  fontFamily: "var(--sans)",
                  color: "var(--ink-2)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--display)",
                    fontSize: 17,
                    color: "var(--ink)",
                    marginBottom: 4,
                  }}
                >
                  Drop a resume or click to choose
                </div>
                <div style={{ fontSize: 12 }}>PDF only, up to 2 MB</div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile(f);
                  }}
                />
              </div>

              {privateResumes.length > 0 && (
                <>
                  <div
                    style={{
                      marginTop: 18,
                      marginBottom: 10,
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--ink-3)",
                    }}
                  >
                    Or share from your library
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {privateResumes.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => shareExisting(r.id)}
                        style={{
                          textAlign: "left",
                          padding: "10px 14px",
                          background: "var(--bg)",
                          border: "1px solid var(--line)",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontFamily: "var(--sans)",
                          fontSize: 13,
                          color: "var(--ink)",
                        }}
                      >
                        <div style={{ fontWeight: 500 }}>{r.label}</div>
                        <div
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: 10,
                            color: "var(--ink-3)",
                            marginTop: 2,
                          }}
                        >
                          {r.filename}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {error && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "8px 12px",
                    border: "1px solid oklch(0.55 0.15 30)",
                    borderRadius: 4,
                    fontFamily: "var(--sans)",
                    fontSize: 12,
                    color: "oklch(0.45 0.15 30)",
                    background: "oklch(0.96 0.04 30 / 0.5)",
                  }}
                >
                  {error}
                </div>
              )}
            </>
          )}

          {step === "uploading" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--accent-ink)",
                  marginBottom: 8,
                }}
              >
                Staging your file…
              </div>
              <div
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 13,
                  color: "var(--ink-2)",
                }}
              >
                Hold tight — opening the redaction tool.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
