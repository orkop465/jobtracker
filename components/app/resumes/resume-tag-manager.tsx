"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/toast";
import { COLOR_PALETTE } from "@/lib/board/stage-meta";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ResumeTag } from "./types";

interface Props {
  tags: ResumeTag[];
  onClose: () => void;
  onChanged: () => void;
}

export function ResumeTagManager({ tags: initial, onClose, onChanged }: Props) {
  const { toast } = useToast();
  const [tags, setTags] = useState<ResumeTag[]>(initial);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [colorOpenId, setColorOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (colorOpenId) setColorOpenId(null);
        else if (!pendingDelete) onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, colorOpenId, pendingDelete]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (adding || !newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/resume-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error ?? "Failed to add tag", "error");
        return;
      }
      setTags((prev) => [...prev, data.tag]);
      setNewName("");
      onChanged();
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    const res = await fetch(`/api/resume-tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim() }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast(data?.error ?? "Failed to rename tag", "error");
      return;
    }
    setTags((prev) => prev.map((t) => (t.id === id ? data.tag : t)));
    setEditingId(null);
    onChanged();
  }

  async function handleColor(id: string, color: string) {
    setColorOpenId(null);
    const res = await fetch(`/api/resume-tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast(data?.error ?? "Failed to recolor tag", "error");
      return;
    }
    setTags((prev) => prev.map((t) => (t.id === id ? data.tag : t)));
    onChanged();
  }

  async function handleDelete(id: string) {
    setPendingDelete(null);
    const res = await fetch(`/api/resume-tags/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast(data?.error ?? "Failed to delete tag", "error");
      return;
    }
    setTags((prev) => prev.filter((t) => t.id !== id));
    onChanged();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        ref={backdropRef}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40"
        onClick={(e) => {
          if (e.target === backdropRef.current) onClose();
        }}
      >
        <div
          className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md shadow-lg p-5 w-[88%] max-w-[480px]"
          style={{ animation: "fade-up 160ms ease-out both" }}
        >
          <h3 className="text-[14px] font-semibold text-[var(--color-ink)] mb-3">
            Manage resume tags
          </h3>

          <ul className="flex flex-col gap-1 mb-4">
            {tags.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 py-1.5 border-b border-[var(--color-line)] last:border-0 relative"
              >
                <button
                  type="button"
                  onClick={() => setColorOpenId(colorOpenId === t.id ? null : t.id)}
                  aria-label="Change color"
                  className="w-3.5 h-3.5 rounded-full border border-[var(--color-line)]"
                  style={{ background: t.color ?? "transparent" }}
                />
                {editingId === t.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(t.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onBlur={() => handleRename(t.id)}
                    className="flex-1 px-2 py-1 bg-transparent border border-[var(--color-line)] rounded text-[12px]"
                  />
                ) : (
                  <button
                    type="button"
                    className="flex-1 text-left text-[13px]"
                    onClick={() => {
                      setEditingId(t.id);
                      setEditingName(t.name);
                    }}
                  >
                    {t.name}
                  </button>
                )}
                <button
                  type="button"
                  className="text-[11px] font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  onClick={() => setPendingDelete(t.id)}
                >
                  Delete
                </button>
                {colorOpenId === t.id && (
                  <div className="absolute top-full left-0 mt-1 z-[110] flex flex-wrap gap-1 p-2 bg-[var(--color-surface)] border border-[var(--color-line)] rounded shadow-md">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        title={c.label}
                        onClick={() => handleColor(t.id, c.value)}
                        className="w-4 h-4 rounded-full border border-[var(--color-line)]"
                        style={{ background: c.value }}
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="New tag name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-2 py-1.5 bg-transparent border border-[var(--color-line)] rounded text-[12px]"
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="px-3 py-1.5 text-[12px] font-mono border border-[var(--color-line)] rounded"
            >
              Add
            </button>
          </form>

          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[12px] font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this tag?"
        body="This removes the tag from every resume it's assigned to. This cannot be undone."
        onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </>,
    document.body,
  );
}
