"use client";

import { useEffect, useRef, useState } from "react";
import type { BoardColumnType } from "@/lib/board/types";
import { markerColorForColumn } from "@/lib/board/stage-meta";

interface BulkBarProps {
  open: boolean;
  count: number;
  columns: BoardColumnType[];
  onMove: (columnId: string) => void;
  onSnooze: () => void;
  onArchive: () => void;
  onClear: () => void;
}

export function BulkBar({
  open,
  count,
  columns,
  onMove,
  onSnooze,
  onArchive,
  onClear,
}: BulkBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const showPicker = open && pickerOpen;

  useEffect(() => {
    if (!showPicker) return;
    const onMouse = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    const t = window.setTimeout(() => document.addEventListener("mousedown", onMouse), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [showPicker]);

  return (
    <div className={`board-bulk ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <span className="board-bulk-count">{count} selected</span>
      <div style={{ position: "relative" }} ref={pickerRef}>
        <button
          type="button"
          className="board-bulk-action"
          onClick={() => setPickerOpen((p) => !p)}
        >
          Move to <span style={{ fontSize: 9, marginLeft: 2 }}>▾</span>
        </button>
        <div
          className={`ctx-menu bulk-popover ${showPicker ? "is-open" : ""}`}
          style={{ top: 36, left: 0 }}
        >
          <div className="ctx-section">Move to</div>
          <div className="ctx-stages">
            {columns.map((c) => (
              <button
                key={c.id}
                type="button"
                className="ctx-stage-btn"
                onClick={() => {
                  onMove(c.id);
                  setPickerOpen(false);
                }}
              >
                <span
                  className="marker"
                  style={{ background: markerColorForColumn(c) }}
                />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button type="button" className="board-bulk-action" onClick={onSnooze}>
        Snooze
      </button>
      <button
        type="button"
        className="board-bulk-action danger"
        onClick={onArchive}
      >
        Archive
      </button>
      <button
        type="button"
        className="board-bulk-close"
        onClick={onClear}
        aria-label="Clear selection"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 3l8 8M11 3l-8 8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
