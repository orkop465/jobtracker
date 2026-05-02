"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
  loadingLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel, loading]);

  if (!open || typeof document === "undefined") return null;

  const effectiveLoadingLabel = loadingLabel ?? `${confirmLabel}…`;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md shadow-lg p-5 w-[88%] max-w-[420px]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fade-up 160ms ease-out both" }}
      >
        <h3 className="text-[14px] font-semibold text-[var(--color-ink)] mb-1">
          {title}
        </h3>
        <div className="text-[12px] text-[var(--color-ink-muted)] mb-4">{body}</div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-[12px] font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
            className="px-3 py-1.5 text-[12px] font-mono text-white rounded-md bg-[var(--cd-confirm-bg)] hover:bg-[var(--cd-confirm-bg)]/90 transition-colors duration-[140ms] disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            style={
              {
                "--cd-confirm-bg": destructive
                  ? "oklch(0.55 0.13 30)"
                  : "var(--color-ink)",
              } as React.CSSProperties
            }
          >
            {loading && (
              <span
                aria-hidden="true"
                className="inline-block w-3 h-3 rounded-full border-[1.5px] border-white/40 border-t-white animate-spin"
              />
            )}
            {loading ? effectiveLoadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
