"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useToast } from "@/components/ui/toast";
import type { BoardColumnType, KanbanApplication } from "@/lib/board/types";
import {
  isStalled,
  mapSourceToBucket,
  type SourceBucket,
} from "@/lib/board/stage-meta";
import { ApplicationCard } from "./application-card";
import { BoardColumn } from "./board-column";
import { BoardFilters } from "./board-filters";
import { BulkBar } from "./bulk-bar";
import { BoardContextMenu } from "./board-context-menu";
import type { CardStyle, Density } from "./tweaks-panel";
import { AddApplicationModal } from "./add-application-modal";
import { CardDetailPanel } from "./card-detail-panel";
import { ColumnManager } from "./column-manager";

const TWEAKS_KEY = "maakavoda:board:tweaks";

interface DashboardMeta {
  responseRate: number | null;
  inFlight: number | null;
  stalled: number | null;
}

function loadTweaks(): { density: Density; cardStyle: CardStyle } {
  if (typeof window === "undefined") return { density: "rich", cardStyle: "pinned" };
  try {
    const raw = window.localStorage.getItem(TWEAKS_KEY);
    if (!raw) return { density: "rich", cardStyle: "pinned" };
    const parsed = JSON.parse(raw);
    const density: Density = parsed.density === "compact" ? "compact" : "rich";
    const cardStyle: CardStyle =
      parsed.cardStyle === "taped"
        ? "taped"
        : parsed.cardStyle === "plain"
        ? "plain"
        : "pinned";
    return { density, cardStyle };
  } catch {
    return { density: "rich", cardStyle: "pinned" };
  }
}

export function KanbanBoard() {
  const { toast } = useToast();

  const [columns, setColumns] = useState<BoardColumnType[]>([]);
  const [apps, setApps] = useState<KanbanApplication[]>([]);
  const [resumes, setResumes] = useState<{ id: string; label: string }[]>([]);
  const [meta, setMeta] = useState<DashboardMeta>({
    responseRate: null,
    inFlight: null,
    stalled: null,
  });
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceBucket>("all");

  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [detailApp, setDetailApp] = useState<KanbanApplication | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    card: KanbanApplication;
  } | null>(null);

  const [tweaks, setTweaks] = useState<{ density: Density; cardStyle: CardStyle }>(
    () => loadTweaks(),
  );

  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Snapshot of the dragging card's pre-drag state, for restoring if the
  // drag is canceled (released over nothing). Live mutation in handleDragOver
  // walks the card around target columns/positions during the drag.
  const dragOriginalRef = useRef<KanbanApplication | null>(null);
  // Last (column, over-card, side) combination we mutated for. Guards
  // against dnd-kit re-firing dragOver after our state mutation moves the
  // active card — without this guard, each remutation triggers another
  // dragOver, which mutates again, exhausting React's update budget.
  const lastDropRef = useRef<string | null>(null);

  const initialFetchRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  // ── Persist tweaks ─────────────────────────────────────────
  useEffect(() => {
    try {
      window.localStorage.setItem(TWEAKS_KEY, JSON.stringify(tweaks));
    } catch {
      // ignore
    }
  }, [tweaks]);

  // ── Data fetching ──────────────────────────────────────────
  const loadBoard = useCallback(async () => {
    if (!initialFetchRef.current) setLoading(true);
    try {
      const [colRes, appRes, resRes] = await Promise.all([
        fetch("/api/board-columns"),
        fetch("/api/applications"),
        fetch("/api/resumes"),
      ]);
      const colData = await colRes.json();
      const appData = await appRes.json();
      const resData = await resRes.json();

      setColumns(colData.columns ?? []);
      setApps(appData.items ?? []);
      setResumes(
        (resData.items ?? []).map((r: { id: string; label: string }) => ({
          id: r.id,
          label: r.label,
        })),
      );
    } catch {
      toast("Failed to load board", "error");
    } finally {
      setLoading(false);
      initialFetchRef.current = true;
    }
  }, [toast]);

  const loadMeta = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) return;
      const data = await res.json();
      setMeta({
        responseRate: data?.stats?.responseRate ?? null,
        inFlight: data?.stats?.inFlight ?? null,
        stalled: Array.isArray(data?.stalledApps) ? data.stalledApps.length : null,
      });
    } catch {
      // best-effort; meta strip falls back to "synced just now"
    }
  }, []);

  useEffect(() => {
    loadBoard();
    loadMeta();
  }, [loadBoard, loadMeta]);

  // ── Detail panel sync with apps ────────────────────────────
  // Sync only when the current detailApp's data actually changed —
  // avoids feeding the panel a new object reference every loadBoard
  // (which would reset the form on every keystroke).
  const detailAppId = detailApp?.id ?? null;
  useEffect(() => {
    if (!detailAppId) return;
    const updated = apps.find((a) => a.id === detailAppId);
    if (!updated) return;
    setDetailApp((prev) => {
      if (!prev) return prev;
      return prev === updated ? prev : updated;
    });
  }, [apps, detailAppId]);

  // ── Filtering ──────────────────────────────────────────────
  const visibleApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      if (sourceFilter !== "all" && mapSourceToBucket(a.source) !== sourceFilter) {
        return false;
      }
      if (q) {
        if (
          !a.company.toLowerCase().includes(q) &&
          !a.roleTitle.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [apps, search, sourceFilter]);

  const sourceCounts = useMemo(() => {
    const out: Record<SourceBucket, number> = {
      all: apps.length,
      referral: 0,
      board: 0,
      recruit: 0,
      direct: 0,
    };
    for (const a of apps) {
      const b = mapSourceToBucket(a.source);
      if (b) out[b] += 1;
    }
    return out;
  }, [apps]);

  function getColumnApps(columnId: string): KanbanApplication[] {
    const col = columns.find((c) => c.id === columnId);
    const filtered = visibleApps.filter((a) => {
      if (a.boardColumnId) return a.boardColumnId === columnId;
      return col?.mappedStatus === a.status;
    });
    // Stable sort: position asc, then appliedAt asc as tiebreaker for cards
    // that share a position (e.g. before any reorder happens).
    return filtered.slice().sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
    });
  }

  // ── Selection ──────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // ── Mutations ──────────────────────────────────────────────
  async function patchApp(
    id: string,
    body: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function snoozeApp(id: string) {
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, nextFollowUp: dueDate } : a)),
    );
    const ok = await patchApp(id, { nextFollowUp: dueDate });
    if (!ok) {
      toast("Failed to snooze", "error");
      loadBoard();
    }
  }

  async function archiveApp(id: string) {
    const target =
      columns.find((c) => c.mappedStatus === "WITHDRAWN") ??
      columns.find((c) => c.mappedStatus === "REJECTED") ??
      null;
    setApps((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "WITHDRAWN",
              boardColumnId: target?.id ?? a.boardColumnId,
            }
          : a,
      ),
    );
    const body: Record<string, unknown> = { status: "WITHDRAWN" };
    if (target) body.boardColumnId = target.id;
    const ok = await patchApp(id, body);
    if (!ok) {
      toast("Failed to archive", "error");
      loadBoard();
    } else {
      loadMeta();
    }
  }

  async function duplicateApp(id: string) {
    const orig = apps.find((a) => a.id === id);
    if (!orig) return;
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: orig.company,
          roleTitle: orig.roleTitle,
          status: orig.status,
          location: orig.location ?? "",
          jobUrl: orig.jobUrl ?? "",
          notes: orig.notes ?? "",
          jobDescription: orig.jobDescription ?? "",
          source: orig.source ?? undefined,
          priority: orig.priority ?? undefined,
          salaryMin: orig.salaryMin ?? undefined,
          salaryMax: orig.salaryMax ?? undefined,
          currency: orig.currency ?? undefined,
          resumeId: orig.resumeId ?? "",
        }),
      });
      if (!res.ok) {
        toast("Failed to duplicate", "error");
        return;
      }
      loadBoard();
      loadMeta();
    } catch {
      toast("Failed to duplicate", "error");
    }
  }

  async function addInline(columnId: string, data: { roleTitle: string; company: string }) {
    const col = columns.find((c) => c.id === columnId);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: data.company,
          roleTitle: data.roleTitle,
          status: col?.mappedStatus ?? "APPLIED",
        }),
      });
      if (!res.ok) {
        toast("Failed to add role", "error");
        return;
      }
      setAddingTo(null);
      loadBoard();
      loadMeta();
    } catch {
      toast("Failed to add role", "error");
    }
  }

  // ── Bulk handlers ──────────────────────────────────────────
  function bulkMove(columnId: string) {
    if (selected.size === 0) return;
    moveCardsToColumnBottom([...selected], columnId);
    clearSelection();
  }

  async function bulkSnooze() {
    const ids = [...selected];
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setApps((prev) =>
      prev.map((a) => (selected.has(a.id) ? { ...a, nextFollowUp: dueDate } : a)),
    );
    const results = await Promise.all(
      ids.map((id) => patchApp(id, { nextFollowUp: dueDate })),
    );
    clearSelection();
    if (results.some((r) => !r)) {
      toast("Some snoozes failed — refreshing", "error");
      loadBoard();
    }
  }

  async function bulkArchive() {
    const ids = [...selected];
    const target =
      columns.find((c) => c.mappedStatus === "WITHDRAWN") ??
      columns.find((c) => c.mappedStatus === "REJECTED") ??
      null;
    setApps((prev) =>
      prev.map((a) =>
        selected.has(a.id)
          ? {
              ...a,
              status: "WITHDRAWN",
              boardColumnId: target?.id ?? a.boardColumnId,
            }
          : a,
      ),
    );
    const body: Record<string, unknown> = { status: "WITHDRAWN" };
    if (target) body.boardColumnId = target.id;
    const results = await Promise.all(ids.map((id) => patchApp(id, body)));
    clearSelection();
    if (results.some((r) => !r)) {
      toast("Some archives failed — refreshing", "error");
      loadBoard();
    } else {
      loadMeta();
    }
  }

  // ── DnD ────────────────────────────────────────────────────
  const overlayCard = draggingId ? apps.find((a) => a.id === draggingId) ?? null : null;
  const overlayCount = overlayCard && selected.has(overlayCard.id) ? selected.size : 1;

  // Cards in `targetColumnId` (excluding any in `excludeIds`) sorted by
  // position then appliedAt. Used both for live preview during drag and
  // for the final persist on drop.
  function cardsInColumn(
    targetColumnId: string,
    excludeIds: Set<string> = new Set(),
  ): KanbanApplication[] {
    const targetCol = columns.find((c) => c.id === targetColumnId);
    return apps
      .filter(
        (a) =>
          !excludeIds.has(a.id) &&
          (a.boardColumnId === targetColumnId ||
            (!a.boardColumnId && targetCol?.mappedStatus === a.status)),
      )
      .slice()
      .sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
      });
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setDraggingId(id);
    lastDropRef.current = null;
    const original = apps.find((a) => a.id === id);
    dragOriginalRef.current = original ? { ...original } : null;
  }

  // Live mutation: as the cursor moves, the dragging card's column and
  // position are updated in `apps` so the in-place ghost slot tracks the
  // cursor. verticalListSortingStrategy animates surrounding shifts.
  // Mutation is keyed on (targetColumnId, overCardId, side) so dnd-kit's
  // post-mutation re-firing of dragOver is a no-op when nothing changed.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const overData = over.data.current as
      | { columnId?: string; type?: string }
      | undefined;
    let targetColumnId: string | null = null;
    let overCardId: string | null = null;
    if (overData?.type === "card") {
      targetColumnId = overData.columnId ?? null;
      overCardId = overId === activeId ? null : overId;
    } else if (overData?.type === "column") {
      targetColumnId = overData.columnId ?? overId;
    } else if (columns.some((c) => c.id === overId)) {
      targetColumnId = overId;
    }
    if (!targetColumnId) return;

    const targetCol = columns.find((c) => c.id === targetColumnId);
    if (!targetCol) return;

    // Side from cursor position (activator clientY + drag delta). More
    // accurate than active.rect midpoint when the user grabs the card
    // near its edge.
    let side: "above" | "below" = "below";
    if (overCardId) {
      const activator = event.activatorEvent as
        | { clientY?: number }
        | null;
      const overRect = over.rect;
      if (activator && typeof activator.clientY === "number" && overRect) {
        const cursorY = activator.clientY + event.delta.y;
        const overMid = overRect.top + overRect.height / 2;
        side = cursorY < overMid ? "above" : "below";
      } else {
        side = "above";
      }
    }

    const dropKey = `${targetColumnId}|${overCardId ?? "end"}|${side}`;
    if (lastDropRef.current === dropKey) return;
    lastDropRef.current = dropKey;

    setApps((prev) => {
      const activeApp = prev.find((a) => a.id === activeId);
      if (!activeApp) return prev;

      const targetCards = prev
        .filter(
          (a) =>
            a.id !== activeId &&
            (a.boardColumnId === targetColumnId ||
              (!a.boardColumnId && targetCol.mappedStatus === a.status)),
        )
        .slice()
        .sort((a, b) => {
          if (a.position !== b.position) return a.position - b.position;
          return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
        });

      let insertIdx = targetCards.length;
      if (overCardId) {
        const overIdx = targetCards.findIndex((c) => c.id === overCardId);
        if (overIdx !== -1) {
          insertIdx = side === "below" ? overIdx + 1 : overIdx;
        }
      }

      const before = targetCards[insertIdx - 1];
      const after = targetCards[insertIdx];
      let newPos: number;
      if (!before && after) newPos = after.position - 1;
      else if (before && !after) newPos = before.position + 1;
      else if (before && after) {
        const gap = after.position - before.position;
        newPos = gap > 0 ? before.position + gap / 2 : before.position + 0.5;
      } else newPos = 1;

      if (
        activeApp.boardColumnId === targetColumnId &&
        Math.abs(activeApp.position - newPos) < 1e-6
      ) {
        return prev;
      }

      return prev.map((a) =>
        a.id === activeId
          ? {
              ...a,
              boardColumnId: targetColumnId,
              status: targetCol.mappedStatus ?? a.status,
              position: newPos,
            }
          : a,
      );
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingId(null);
    lastDropRef.current = null;

    const activeId = String(active.id);
    const original = dragOriginalRef.current;
    dragOriginalRef.current = null;

    // Released over nothing → restore the dragging card to its pre-drag state.
    if (!over) {
      if (original) {
        setApps((prev) => prev.map((a) => (a.id === activeId ? original : a)));
      }
      return;
    }

    const finalApp = apps.find((a) => a.id === activeId);
    if (!finalApp) return;

    // No real change vs. the pre-drag state → skip persistence.
    if (
      original &&
      original.boardColumnId === finalApp.boardColumnId &&
      Math.abs(original.position - finalApp.position) < 1e-6 &&
      original.status === finalApp.status
    ) {
      return;
    }

    const targetColumnId = finalApp.boardColumnId;
    if (!targetColumnId) return;
    const targetCol = columns.find((c) => c.id === targetColumnId);
    if (!targetCol) return;

    const finalPosition = finalApp.position;

    // Multi-select: pack the rest of the selection in positions just after
    // the active card.
    const others =
      selected.has(activeId) && selected.size > 1
        ? [...selected].filter((id) => id !== activeId)
        : [];

    let extraPatches: Array<{ id: string; position: number }> = [];
    if (others.length > 0) {
      const targetCards = cardsInColumn(
        targetColumnId,
        new Set([activeId, ...others]),
      );
      const idx = targetCards.findIndex((c) => c.position > finalPosition);
      const after = idx !== -1 ? targetCards[idx] : null;
      const span = others.length;
      const positions: number[] = [];
      if (!after) {
        for (let i = 0; i < span; i++) positions.push(finalPosition + (i + 1));
      } else {
        const gap = after.position - finalPosition;
        const step = gap > 0 ? gap / (span + 1) : 0.5;
        for (let i = 0; i < span; i++) positions.push(finalPosition + step * (i + 1));
      }
      extraPatches = others.map((id, i) => ({ id, position: positions[i] }));

      setApps((prev) =>
        prev.map((a) => {
          const ep = extraPatches.find((p) => p.id === a.id);
          if (!ep) return a;
          return {
            ...a,
            boardColumnId: targetColumnId,
            status: targetCol.mappedStatus ?? a.status,
            position: ep.position,
          };
        }),
      );
    }

    const allPatches: Array<{ id: string; position: number }> = [
      { id: activeId, position: finalPosition },
      ...extraPatches,
    ];

    const results = await Promise.all(
      allPatches.map(({ id, position }) => {
        const body: Record<string, unknown> = {
          boardColumnId: targetColumnId,
          position,
        };
        if (targetCol.mappedStatus) body.status = targetCol.mappedStatus;
        return patchApp(id, body);
      }),
    );

    if (selected.size > 1) clearSelection();

    if (results.some((r) => !r)) {
      toast("Some moves failed — refreshing", "error");
      loadBoard();
    } else {
      loadMeta();
    }
  }

  // Used by bulk-bar Move-to and ctx-menu Move-to (no source position info,
  // just append cards to the bottom of the target column).
  async function moveCardsToColumnBottom(ids: string[], targetColumnId: string) {
    const targetCol = columns.find((c) => c.id === targetColumnId);
    if (!targetCol) return;

    const movingSet = new Set(ids);
    const colCards = cardsInColumn(targetColumnId, movingSet);
    const last = colCards[colCards.length - 1];
    const startPos = last ? last.position + 1 : 1;
    const positions = ids.map((_, i) => startPos + i);

    setApps((prev) =>
      prev.map((a) => {
        const i = ids.indexOf(a.id);
        if (i === -1) return a;
        return {
          ...a,
          boardColumnId: targetColumnId,
          status: targetCol.mappedStatus ?? a.status,
          position: positions[i],
        };
      }),
    );

    const results = await Promise.all(
      ids.map((id, i) => {
        const body: Record<string, unknown> = {
          boardColumnId: targetColumnId,
          position: positions[i],
        };
        if (targetCol.mappedStatus) body.status = targetCol.mappedStatus;
        return patchApp(id, body);
      }),
    );
    if (results.some((r) => !r)) {
      toast("Some moves failed — refreshing", "error");
      loadBoard();
    } else {
      loadMeta();
    }
  }

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isTyping) return;

      if (e.key === "Escape") {
        if (ctxMenu) setCtxMenu(null);
        else if (addingTo) setAddingTo(null);
        else if (selected.size > 0) clearSelection();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctxMenu, addingTo, selected, clearSelection]);

  const stalledTotal = useMemo(
    () => apps.filter((a) => isStalled(a.status, a.updatedAt)).length,
    [apps],
  );

  const metaForFilters: DashboardMeta = {
    responseRate: meta.responseRate,
    inFlight: meta.inFlight,
    stalled: meta.stalled ?? stalledTotal,
  };

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 16 }}>
        <div className="page-head-left">
          <div className="page-eyebrow" data-index="00">
            Pipeline <span className="page-eyebrow-sep">·</span>{" "}
            {apps.length} {apps.length === 1 ? "role" : "roles"} tracked
          </div>
          <h1 className="page-title">
            Your <em>board</em>.
          </h1>
          <p className="page-sub">
            Drag cards across stages. Right-click for shortcuts. Stalled apps glow amber.
          </p>
        </div>
        <div className="page-head-right" style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="board-pill"
            onClick={() => setShowColumnManager(true)}
          >
            Manage columns
          </button>
          <button
            type="button"
            className="board-pill is-active"
            onClick={() => setShowAddModal(true)}
          >
            + New role
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "80px 40px", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              color: "var(--ink-3)",
              opacity: 0.7,
            }}
          >
            Loading board…
          </p>
        </div>
      ) : (
        <div className={`board-page density-${tweaks.density}`}>
          <BoardFilters
            search={search}
            onSearchChange={setSearch}
            sourceFilter={sourceFilter}
            onSourceChange={setSourceFilter}
            sourceCounts={sourceCounts}
            density={tweaks.density}
            onDensityChange={(d) => setTweaks((t) => ({ ...t, density: d }))}
            cardStyle={tweaks.cardStyle}
            onCardStyleChange={(s) => setTweaks((t) => ({ ...t, cardStyle: s }))}
            meta={metaForFilters}
          />

          <BulkBar
            open={selected.size > 0}
            count={selected.size}
            columns={columns}
            onMove={bulkMove}
            onSnooze={bulkSnooze}
            onArchive={bulkArchive}
            onClear={clearSelection}
          />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="board-scroll">
              <div className="board-cols">
                {columns.map((col) => (
                  <BoardColumn
                    key={col.id}
                    column={col}
                    apps={getColumnApps(col.id)}
                    density={tweaks.density}
                    cardStyle={tweaks.cardStyle}
                    selected={selected}
                    addingHere={addingTo === col.id}
                    onSelect={toggleSelect}
                    onPeek={(a) => setDetailApp(a)}
                    onContextMenu={(e, card) =>
                      setCtxMenu({ x: e.clientX, y: e.clientY, card })
                    }
                    onStartAdd={(id) => setAddingTo(id)}
                    onAdd={addInline}
                    onCancelAdd={() => setAddingTo(null)}
                  />
                ))}
              </div>
            </div>

            <DragOverlay>
              {overlayCard ? (
                <ApplicationCard
                  app={overlayCard}
                  columnId={overlayCard.boardColumnId ?? ""}
                  density={tweaks.density}
                  cardStyle={tweaks.cardStyle}
                  selected={selected.has(overlayCard.id)}
                  onSelect={() => {}}
                  onPeek={() => {}}
                  onContextMenu={() => {}}
                  isOverlay
                  overlaySelectionCount={overlayCount}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {ctxMenu && (
        <BoardContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          card={ctxMenu.card}
          columns={columns}
          onClose={() => setCtxMenu(null)}
          onMove={(columnId) => {
            moveCardsToColumnBottom([ctxMenu.card.id], columnId);
            setCtxMenu(null);
          }}
          onSnooze={() => {
            snoozeApp(ctxMenu.card.id);
            setCtxMenu(null);
          }}
          onDuplicate={() => {
            duplicateApp(ctxMenu.card.id);
            setCtxMenu(null);
          }}
          onArchive={() => {
            archiveApp(ctxMenu.card.id);
            setCtxMenu(null);
          }}
        />
      )}

      {showAddModal && (
        <AddApplicationModal
          resumes={resumes}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            loadBoard();
            loadMeta();
          }}
        />
      )}

      {detailApp && (
        <CardDetailPanel
          app={detailApp}
          resumes={resumes}
          onClose={() => setDetailApp(null)}
          onSaved={() => {
            loadBoard();
            loadMeta();
          }}
          onDeleted={() => {
            setDetailApp(null);
            loadBoard();
            loadMeta();
          }}
        />
      )}

      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onClose={() => setShowColumnManager(false)}
          onChanged={() => loadBoard()}
        />
      )}
    </>
  );
}
