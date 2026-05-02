"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ResumeTag } from "./types";

interface Props {
  x: number;
  y: number;
  assignedTagIds: Set<string>;
  allTags: ResumeTag[];
  onToggleTag: (tagId: string) => void;
  onManageTags: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ResumeContextMenu({
  x,
  y,
  assignedTagIds,
  allTags,
  onToggleTag,
  onManageTags,
  onDelete,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const W = 240;
  const H = 8 + 22 + allTags.length * 26 + 8 + 26 + 8 + 26 + 8;
  const left = Math.min(x, window.innerWidth - W - 8);
  const top = Math.min(y, window.innerHeight - H - 8);

  return createPortal(
    <div ref={ref} className="ctx-menu" style={{ left, top, width: W }}>
      <div className="ctx-section">Tags</div>
      <div className="ctx-stages">
        {allTags.length === 0 ? (
          <div className="ctx-empty mono">No tags yet</div>
        ) : (
          allTags.map((t) => {
            const on = assignedTagIds.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className="ctx-stage-btn"
                onClick={() => onToggleTag(t.id)}
              >
                <span
                  className="marker"
                  style={{
                    background: t.color ?? "transparent",
                    border: t.color ? "none" : "1px solid var(--color-line)",
                  }}
                />
                <span style={{ flex: 1, textAlign: "left" }}>{t.name}</span>
                <span className="ctx-shortcut">{on ? "✓" : ""}</span>
              </button>
            );
          })
        )}
      </div>
      <div className="ctx-divider" />
      <button type="button" className="ctx-item" onClick={onManageTags}>
        Manage tags…
      </button>
      <div className="ctx-divider" />
      <button type="button" className="ctx-item is-danger" onClick={onDelete}>
        Delete resume
      </button>
    </div>,
    document.body,
  );
}
