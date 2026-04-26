"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import type { BoardColumnType } from "@/lib/board/types";

const inputCls =
  "w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10 transition-colors duration-[180ms]";

interface Props {
  columns: BoardColumnType[];
  onClose: () => void;
  onChanged: () => void;
}

export function ColumnManager({ columns: initialColumns, onClose, onChanged }: Props) {
  const { toast } = useToast();
  const [cols, setCols] = useState<BoardColumnType[]>(initialColumns);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (adding || !newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/board-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error ?? "Failed to add column", "error");
        return;
      }
      const data = await res.json();
      setCols((prev) => [...prev, data.column]);
      setNewName("");
      onChanged();
    } catch {
      toast("Failed to add column", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    try {
      const res = await fetch(`/api/board-columns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      if (!res.ok) {
        toast("Failed to rename column", "error");
        return;
      }
      setCols((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: editingName.trim() } : c))
      );
      setEditingId(null);
      onChanged();
    } catch {
      toast("Failed to rename column", "error");
    }
  }

  async function handleDelete(id: string) {
    const col = cols.find((c) => c.id === id);
    if (
      !confirm(
        `Delete "${col?.name}"? Applications will be moved to the first column.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/board-columns/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error ?? "Failed to delete", "error");
        return;
      }
      setCols((prev) => prev.filter((c) => c.id !== id));
      onChanged();
    } catch {
      toast("Failed to delete column", "error");
    }
  }

  async function handleMove(id: string, direction: -1 | 1) {
    const idx = cols.findIndex((c) => c.id === id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= cols.length) return;

    const reordered = [...cols];
    [reordered[idx], reordered[targetIdx]] = [
      reordered[targetIdx],
      reordered[idx],
    ];
    setCols(reordered);

    try {
      const res = await fetch("/api/board-columns/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnIds: reordered.map((c) => c.id) }),
      });
      if (!res.ok) toast("Failed to reorder", "error");
      else onChanged();
    } catch {
      toast("Failed to reorder", "error");
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[10px] shadow-lg w-full max-w-[480px] mx-4 max-h-[80vh] flex flex-col"
        style={{ animation: "fade-up 280ms var(--ease-out-quart) both" }}
      >
        <div className="px-6 pt-5 pb-4 border-b border-[var(--color-line)] flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[var(--color-ink)]">
            Manage Columns
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {cols.map((col, i) => (
            <div
              key={col.id}
              className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-[var(--color-canvas)] group"
            >
              {/* Reorder arrows */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMove(col.id, -1)}
                  disabled={i === 0}
                  className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-20 transition-colors"
                  aria-label="Move up"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="currentColor"
                  >
                    <path d="M5 2L9 7H1z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleMove(col.id, 1)}
                  disabled={i === cols.length - 1}
                  className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-20 transition-colors"
                  aria-label="Move down"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="currentColor"
                  >
                    <path d="M5 8L1 3h8z" />
                  </svg>
                </button>
              </div>

              {/* Name (editable) */}
              {editingId === col.id ? (
                <input
                  autoFocus
                  className={`flex-1 ${inputCls}`}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleRename(col.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(col.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <span
                  className="flex-1 text-[13px] text-[var(--color-ink)] cursor-pointer hover:underline"
                  onClick={() => {
                    setEditingId(col.id);
                    setEditingName(col.name);
                  }}
                >
                  {col.name}
                  {col.mappedStatus && (
                    <span className="font-mono text-[9px] text-[var(--color-ink-muted)] ml-2">
                      ({col.mappedStatus.toLowerCase().replace(/_/g, " ")})
                    </span>
                  )}
                </span>
              )}

              {/* Count */}
              <span className="font-mono text-[10px] tabular-nums text-[var(--color-ink-muted)]">
                {col.applicationCount}
              </span>

              {/* Delete */}
              <button
                onClick={() => handleDelete(col.id)}
                className="p-1 text-[var(--color-ink-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-sink)] transition-all"
                aria-label={`Delete ${col.name}`}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M3 3l6 6M9 3l-6 6" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Add column */}
        <div className="px-6 py-4 border-t border-[var(--color-line)]">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New column name..."
              maxLength={60}
              className={`flex-1 ${inputCls}`}
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="px-4 py-2 text-[12px] font-mono tracking-wide text-[var(--color-surface)] bg-[var(--color-ink)] rounded-md hover:bg-[var(--color-ink)]/90 transition-colors duration-[180ms] disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
