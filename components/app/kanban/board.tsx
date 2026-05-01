"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  useSensor,
  useSensors,
  type CollisionDetection,
  type UniqueIdentifier,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  MeasuringStrategy,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useToast } from "@/components/ui/toast";
import type { BoardColumnType, KanbanApplication } from "@/lib/board/types";
import {
  computeDropPosition,
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

// Measure droppables once at drag-start instead of continuously during
// the drag. Default ("WhileDragging") tries to re-measure on every
// collision check, which combined with our dropPreview state updates
// caused dnd-kit's internal useScrollOffsets effect to fire setState
// repeatedly → "Maximum update depth exceeded".
const MEASURING_CONFIG = {
  droppable: { strategy: MeasuringStrategy.BeforeDragging },
};

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
  // Pre-drag snapshot — used to restore state on cancel and to detect
  // no-op drops (released at original position).
  const dragOriginalRef = useRef<KanbanApplication | null>(null);

  const initialFetchRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const lastOverId = useRef<UniqueIdentifier | null>(null);
  // After a cross-column move, items list churn can cause `over` to
  // briefly resolve to nothing on the next collision pass. Without this
  // pin, dnd-kit treats the absence as `over=null` and dragEnd may bail
  // before persisting the move (snap-back to source column).
  const recentlyMovedToNewColumn = useRef(false);

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

  // Memoize per-column app lists. Without this, getColumnApps returns a
  // fresh array each render → BoardColumn sees a new `apps` prop ref each
  // time → SortableContext.items changes ref → dnd-kit's measure cycle
  // re-fires onDragOver, which triggers another re-render, which is the
  // "Maximum update depth" loop. Memoizing on (columns, visibleApps)
  // gives a stable reference per column when nothing has actually moved.
  const colAppsByCol = useMemo(() => {
    const map = new Map<string, KanbanApplication[]>();
    for (const col of columns) {
      const filtered = visibleApps.filter((a) => {
        if (a.boardColumnId) return a.boardColumnId === col.id;
        return col.mappedStatus === a.status;
      });
      filtered.sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
      });
      map.set(col.id, filtered);
    }
    return map;
  }, [columns, visibleApps]);

  function getColumnApps(columnId: string): KanbanApplication[] {
    return colAppsByCol.get(columnId) ?? [];
  }

  // Canonical multi-container collision strategy (from dnd-kit's kanban
  // example). pointerWithin gives the most-stable resolution when the
  // cursor is inside a card; rectIntersection is the fallback for empty
  // column areas. Resolves over=column to the nearest card inside that
  // column, so visual shift always anchors to a card slot. Prevents
  // `over` flipping rapidly between adjacent cards or column body —
  // that flipping caused visual oscillation during same-column drags.
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      // Pointer-based hit test only. If the cursor isn't inside ANY
      // droppable (e.g., in the gap between two columns), pin `over`
      // to the active card itself — handleDragOver short-circuits when
      // active === over, so state freezes at the last in-column slot
      // and the in-place ghost stays consistent with the eventual
      // drop. Falling back to rectIntersection or `lastOverId` here
      // would let dragOver keep mutating state with stale `over` while
      // the cursor sits in the gap, causing the "ghost in one spot,
      // card lands in another" desync at release.
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length === 0) {
        return args.active ? [{ id: args.active.id }] : [];
      }

      let overId = getFirstCollision(pointerCollisions, "id");
      if (overId == null) {
        return args.active ? [{ id: args.active.id }] : [];
      }

      // Resolve a column hit to the closest card inside that column,
      // so the visual gap from verticalListSortingStrategy always
      // anchors to a card slot.
      const overIsColumn = columns.some((c) => c.id === overId);
      if (overIsColumn) {
        const colCards = colAppsByCol.get(String(overId)) ?? [];
        const cardIds = colCards.map((c) => c.id);
        if (cardIds.length > 0) {
          const closest = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter(
              (container) =>
                container.id !== overId &&
                cardIds.includes(String(container.id)),
            ),
          });
          const cardOver = getFirstCollision(closest, "id");
          if (cardOver != null) overId = cardOver;
        }
      }
      lastOverId.current = overId;
      return [{ id: overId }];
    },
    [columns, colAppsByCol],
  );

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
  // for the final persist on drop. Reads from appsRef.current so it
  // sees mutations made within the same event tick (handleDragOver
  // setApps + handleDragEnd both fire from dnd-kit dispatches; the
  // closure-captured `apps` may be one render behind).
  const appsRef = useRef(apps);
  appsRef.current = apps;
  function cardsInColumn(
    targetColumnId: string,
    excludeIds: Set<string> = new Set(),
  ): KanbanApplication[] {
    const targetCol = columns.find((c) => c.id === targetColumnId);
    return appsRef.current
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
    const original = apps.find((a) => a.id === id);
    dragOriginalRef.current = original ? { ...original } : null;
    lastOverId.current = null;
    recentlyMovedToNewColumn.current = false;
  }

  useEffect(() => {
    if (!recentlyMovedToNewColumn.current) return;
    const handle = requestAnimationFrame(() => {
      recentlyMovedToNewColumn.current = false;
    });
    return () => cancelAnimationFrame(handle);
  }, [apps]);

  // ────────────────────────────────────────────────────────────
  // Drag-and-drop — canonical kanban pattern (rewritten clean).
  //
  // Cross-column move: dragOver inserts active into the target column
  // at over+isBelow on every event so the in-place ghost (and the
  // strategy's gap) tracks the cursor continuously. dragEnd persists
  // whatever's in state.
  //
  // Same-column reorder: dragOver does nothing (mutating same-column
  // here oscillates because indices flip after each mutation, so each
  // event recomputes the OPPOSITE move of the previous). The strategy
  // shifts neighbors visually based on `over.id` flips, and dragEnd
  // does arrayMove(activeIdx, overIdx) — that produces the swap the
  // user saw via the gap.
  //
  // "Was originally same column" is decided from dragOriginalRef, NOT
  // from active's current column (which gets mutated mid-drag for
  // cross-column moves). This lets cross-column drops keep
  // repositioning continuously inside the target column even after
  // active has been moved into it.
  // ────────────────────────────────────────────────────────────

  function resolveTarget(
    over: NonNullable<DragOverEvent["over"] | DragEndEvent["over"]>,
  ): {
    targetColumnId: string | null;
    overCardId: string | null;
  } {
    const overId = String(over.id);
    const overData = over.data.current as
      | { columnId?: string; type?: string }
      | undefined;
    if (overData?.type === "card") {
      return { targetColumnId: overData.columnId ?? null, overCardId: overId };
    }
    if (overData?.type === "column") {
      return { targetColumnId: overData.columnId ?? overId, overCardId: null };
    }
    if (columns.some((c) => c.id === overId)) {
      return { targetColumnId: overId, overCardId: null };
    }
    return { targetColumnId: null, overCardId: null };
  }

  function isBelowOverItem(event: DragOverEvent | DragEndEvent): boolean {
    const ar = event.active.rect.current.translated;
    const or = event.over?.rect;
    if (!ar || !or) return false;
    return ar.top + ar.height / 2 > or.top + or.height / 2;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    if (activeId === String(over.id)) return;

    const { targetColumnId, overCardId } = resolveTarget(over);
    if (!targetColumnId) return;
    const targetCol = columns.find((c) => c.id === targetColumnId);
    if (!targetCol) return;

    const original = dragOriginalRef.current;
    const wasOriginallySameColumn =
      !!original && original.boardColumnId === targetColumnId;

    setApps((prev) => {
      const activeApp = prev.find((a) => a.id === activeId);
      if (!activeApp) return prev;

      // Same-column reorder is handled in dragEnd via arrayMove — no
      // mutation here.
      if (wasOriginallySameColumn) return prev;

      // Cross-column: insert active into target column at the over+
      // isBelow slot. Recomputed every event so the slot tracks the
      // cursor as the user moves it around inside the target column.
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
          return (
            new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
          );
        });

      let insertIdx: number;
      if (overCardId) {
        const overIdx = targetCards.findIndex((c) => c.id === overCardId);
        insertIdx =
          overIdx === -1
            ? targetCards.length
            : overIdx + (isBelowOverItem(event) ? 1 : 0);
      } else {
        insertIdx = targetCards.length;
      }
      const newPos = computeDropPosition(targetCards, insertIdx);

      // Skip when no actual change — bounds the dragOver loop to one
      // mutation per distinct cursor region.
      if (
        activeApp.boardColumnId === targetColumnId &&
        Math.abs(activeApp.position - newPos) < 1e-6
      ) {
        return prev;
      }

      const next = prev.map((a) =>
        a.id === activeId
          ? {
              ...a,
              boardColumnId: targetColumnId,
              status: targetCol.mappedStatus ?? a.status,
              position: newPos,
            }
          : a,
      );
      appsRef.current = next;
      recentlyMovedToNewColumn.current = true;
      return next;
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingId(null);

    const activeId = String(active.id);
    const original = dragOriginalRef.current;
    dragOriginalRef.current = null;

    if (!over) return;

    // Released in the inter-column gap (cursor outside any droppable).
    // collisionDetection pins over=active.id in that case. Treat as
    // "cancel" — revert state to the original snapshot and skip PATCH,
    // matching standard kanban UX (Trello/Linear). Without this, any
    // mid-drag mutations dragOver applied (e.g., active inserted into
    // a column the user briefly hovered) would persist on release.
    if (String(over.id) === activeId) {
      if (original) {
        const snapshot = original;
        setApps((prev) =>
          prev.map((a) => (a.id === activeId ? { ...snapshot } : a)),
        );
      }
      return;
    }

    const { targetColumnId: resolvedColumnId, overCardId } = resolveTarget(over);
    const targetColumnId =
      resolvedColumnId ?? original?.boardColumnId ?? null;
    if (!targetColumnId) return;
    const targetCol = columns.find((c) => c.id === targetColumnId);
    if (!targetCol) return;

    const wasOriginallySameColumn =
      !!original && original.boardColumnId === targetColumnId;

    let finalPosition: number;

    if (wasOriginallySameColumn && overCardId) {
      // Same-column reorder: arrayMove on the column's current items
      // (active still at its source slot since dragOver was no-op).
      // Compute new fractional position from the moved active's
      // neighbors in the reordered list.
      const colCards = appsRef.current
        .filter(
          (a) =>
            a.boardColumnId === targetColumnId ||
            (!a.boardColumnId && targetCol.mappedStatus === a.status),
        )
        .slice()
        .sort((a, b) => {
          if (a.position !== b.position) return a.position - b.position;
          return (
            new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
          );
        });
      const oldIdx = colCards.findIndex((c) => c.id === activeId);
      const newIdx = colCards.findIndex((c) => c.id === overCardId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const reordered = arrayMove(colCards, oldIdx, newIdx);
      const at = reordered.findIndex((c) => c.id === activeId);
      const before = reordered[at - 1];
      const after = reordered[at + 1];
      if (!before && after) finalPosition = after.position - 1;
      else if (before && !after) finalPosition = before.position + 1;
      else if (before && after) {
        const gap = after.position - before.position;
        finalPosition =
          gap > 0 ? before.position + gap / 2 : before.position + 0.5;
      } else finalPosition = 1;
    } else {
      // Cross-column drop OR same-column drop on column body.
      // dragOver placed active at the right slot (cross-column) or
      // didn't touch state (same-column body) — trust appsRef.
      const finalApp = appsRef.current.find((a) => a.id === activeId);
      if (!finalApp) return;
      finalPosition = finalApp.position;
    }

    // No real change vs. original snapshot → skip the PATCH.
    const finalStatus = targetCol.mappedStatus ?? original?.status ?? "";
    if (
      original &&
      original.boardColumnId === targetColumnId &&
      Math.abs(original.position - finalPosition) < 1e-6 &&
      original.status === finalStatus
    ) {
      return;
    }

    setApps((prev) =>
      prev.map((a) =>
        a.id === activeId
          ? {
              ...a,
              boardColumnId: targetColumnId,
              status: targetCol.mappedStatus ?? a.status,
              position: finalPosition,
            }
          : a,
      ),
    );

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
            collisionDetection={collisionDetection}
            measuring={MEASURING_CONFIG}
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

            <DragOverlay
              dropAnimation={{
                duration: 320,
                easing: "cubic-bezier(0.25, 1, 0.5, 1)",
              }}
            >
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
