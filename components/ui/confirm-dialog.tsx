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
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      onClick={onCancel}
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
            className="px-3 py-1.5 text-[12px] font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 text-[12px] font-mono text-white rounded-md"
            style={{
              background: destructive
                ? "oklch(0.55 0.13 30)"
                : "oklch(0.45 0.04 250)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
