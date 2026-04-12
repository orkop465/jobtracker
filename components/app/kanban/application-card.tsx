"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardColumnType, KanbanApplication } from "@/lib/board/types";

interface ApplicationCardProps {
  app: KanbanApplication;
  columns: BoardColumnType[];
  onMoveToColumn: (appId: string, columnId: string) => void;
  onOpenDetail: (app: KanbanApplication) => void;
  isDragOverlay?: boolean;
}

export function ApplicationCard({
  app,
  columns,
  onMoveToColumn,
  onOpenDetail,
  isDragOverlay,
}: ApplicationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: app.id,
    data: { columnId: app.boardColumnId },
  });

  const style = isDragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      className={`
        bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[5px]
        p-3 cursor-pointer group relative
        hover:border-[var(--color-ink-muted)]/40
        transition-colors duration-[180ms]
        ${isDragging ? "opacity-40" : ""}
        ${isDragOverlay ? "shadow-lg rotate-[2deg]" : ""}
      `}
      onClick={() => {
        if (!menuOpen) onOpenDetail(app);
      }}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
    >
      {/* Card content */}
      <p className="text-[13px] font-semibold text-[var(--color-ink)] truncate leading-tight">
        {app.company}
      </p>
      <p className="text-[12px] text-[var(--color-ink-muted)] truncate mt-0.5">
        {app.roleTitle}
      </p>
      <p className="font-mono text-[10px] tabular-nums text-[var(--color-ink-muted)] mt-1.5">
        {new Date(app.appliedAt).toLocaleDateString()}
      </p>

      {/* Move-to-column menu trigger */}
      <div ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="absolute top-2 right-2 p-1 rounded text-[var(--color-ink-muted)] opacity-0 group-hover:opacity-100 hover:bg-[var(--color-canvas)] transition-all duration-[180ms]"
          aria-label="Move to column"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <circle cx="6" cy="2" r="1" />
            <circle cx="6" cy="6" r="1" />
            <circle cx="6" cy="10" r="1" />
          </svg>
        </button>

        {/* Column dropdown */}
        {menuOpen && (
          <div className="absolute top-8 right-2 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md shadow-sm z-20 min-w-[160px] py-1">
            <p className="px-3 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
              Move to
            </p>
            {columns.map((col) => (
              <button
                key={col.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveToColumn(app.id, col.id);
                  setMenuOpen(false);
                }}
                className={`
                  w-full text-left px-3 py-1.5 text-[12px] text-[var(--color-ink)]
                  hover:bg-[var(--color-canvas)] transition-colors duration-[180ms]
                  ${col.id === app.boardColumnId ? "font-medium" : ""}
                `}
              >
                {col.name}
                {col.id === app.boardColumnId && (
                  <span className="text-[var(--color-ink-muted)] ml-1">•</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
