"use client";

import { useEffect, useRef } from "react";
import type { BoardColumnType, KanbanApplication } from "@/lib/board/types";
import { markerColorForColumn } from "@/lib/board/stage-meta";

interface BoardContextMenuProps {
  x: number;
  y: number;
  card: KanbanApplication;
  columns: BoardColumnType[];
  onClose: () => void;
  onMove: (columnId: string) => void;
  onSnooze: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
}

export function BoardContextMenu({
  x,
  y,
  card,
  columns,
  onClose,
  onMove,
  onSnooze,
  onDuplicate,
  onArchive,
}: BoardContextMenuProps) {
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

  const W = 220;
  const H = 380;
  const left = Math.min(x, window.innerWidth - W - 8);
  const top = Math.min(y, window.innerHeight - H - 8);

  const moveTargets = columns.filter((c) => c.id !== card.boardColumnId);

  return (
    <div ref={ref} className="ctx-menu" style={{ left, top }}>
      <div className="ctx-section">Move to</div>
      <div className="ctx-stages">
        {moveTargets.map((c) => (
          <button
            key={c.id}
            className="ctx-stage-btn"
            onClick={() => onMove(c.id)}
          >
            <span
              className="marker"
              style={{ background: markerColorForColumn(c) }}
            />
            {c.name}
          </button>
        ))}
      </div>
      <div className="ctx-divider" />
      <button className="ctx-item" onClick={onSnooze}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="6.5" cy="7" r="4.3" stroke="currentColor" strokeWidth="1.3" />
          <path d="M6.5 5v2L8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        Snooze 1 week
        <span className="ctx-shortcut">S</span>
      </button>
      <button className="ctx-item" onClick={onDuplicate}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        Duplicate
        <span className="ctx-shortcut">⌘D</span>
      </button>
      <div className="ctx-divider" />
      <button className="ctx-item is-danger" onClick={onArchive}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <rect x="2" y="3" width="9" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M3 6v4a1 1 0 001 1h5a1 1 0 001-1V6M5 8h3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
        Archive
        <span className="ctx-shortcut">⌫</span>
      </button>
    </div>
  );
}
