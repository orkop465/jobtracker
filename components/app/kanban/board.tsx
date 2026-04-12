"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { BoardHeader } from "./board-header";
import { BoardColumn } from "./board-column";
import { ApplicationCard } from "./application-card";
import { AddApplicationModal } from "./add-application-modal";
import { CardDetailPanel } from "./card-detail-panel";
import { ColumnManager } from "./column-manager";
import { useToast } from "@/components/ui/toast";
import type { BoardColumnType, KanbanApplication } from "@/lib/board/types";

export function KanbanBoard() {
  const { toast } = useToast();

  const [columns, setColumns] = useState<BoardColumnType[]>([]);
  const [apps, setApps] = useState<KanbanApplication[]>([]);
  const [resumes, setResumes] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // DnD
  const [activeApp, setActiveApp] = useState<KanbanApplication | null>(null);

  // Modals / panels
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailApp, setDetailApp] = useState<KanbanApplication | null>(null);
  const [showColumnManager, setShowColumnManager] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // ── Data fetching ──────────────────────────────────────────

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch columns first (triggers seeding), then apps
      const colRes = await fetch("/api/board-columns");
      const colData = await colRes.json();
      setColumns(colData.columns ?? []);

      const appRes = await fetch("/api/applications");
      const appData = await appRes.json();
      setApps(appData.items ?? []);

      // Resumes for add/edit forms
      const resRes = await fetch("/api/resumes");
      const resData = await resRes.json();
      setResumes(
        (resData.items ?? []).map((r: any) => ({ id: r.id, label: r.label }))
      );
    } catch {
      toast("Failed to load board", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // ── Column helpers ─────────────────────────────────────────

  function getColumnApps(columnId: string): KanbanApplication[] {
    const col = columns.find((c) => c.id === columnId);
    let filtered = apps.filter((a) => {
      if (a.boardColumnId) return a.boardColumnId === columnId;
      return col?.mappedStatus === a.status;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.roleTitle.toLowerCase().includes(q)
      );
    }

    return filtered;
  }

  // ── Move card (shared by DnD and dropdown) ─────────────────

  async function moveCard(appId: string, targetColumnId: string) {
    const targetCol = columns.find((c) => c.id === targetColumnId);
    if (!targetCol) return;

    // Optimistic update
    setApps((prev) =>
      prev.map((a) =>
        a.id === appId
          ? {
              ...a,
              boardColumnId: targetColumnId,
              status: targetCol.mappedStatus ?? a.status,
            }
          : a
      )
    );

    const body: Record<string, unknown> = { boardColumnId: targetColumnId };
    if (targetCol.mappedStatus) body.status = targetCol.mappedStatus;

    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast("Failed to move application", "error");
        loadBoard();
      }
    } catch {
      toast("Failed to move application", "error");
      loadBoard();
    }
  }

  // ── DnD handlers ───────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const app = apps.find((a) => a.id === event.active.id);
    setActiveApp(app ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeAppItem = apps.find((a) => a.id === active.id);
    if (!activeAppItem) return;

    // Determine the column we're over
    const overColumnId =
      (over.data.current as any)?.columnId ?? (over.id as string);

    // Check if this is actually a column ID
    const isColumn = columns.some((c) => c.id === overColumnId);
    if (!isColumn) return;

    const currentColumnId = activeAppItem.boardColumnId;
    if (overColumnId === currentColumnId) return;

    // Optimistic: move card to the new column
    setApps((prev) =>
      prev.map((a) =>
        a.id === active.id ? { ...a, boardColumnId: overColumnId } : a
      )
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveApp(null);

    if (!over) return;

    const overColumnId =
      (over.data.current as any)?.columnId ?? (over.id as string);
    const isColumn = columns.some((c) => c.id === overColumnId);
    if (!isColumn) return;

    // Persist the move
    await moveCard(active.id as string, overColumnId);
  }

  // ── Detail panel sync ──────────────────────────────────────

  useEffect(() => {
    if (detailApp) {
      const updated = apps.find((a) => a.id === detailApp.id);
      if (updated) setDetailApp(updated);
    }
  }, [apps]);

  // ── Render ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="font-mono text-[12px] text-[var(--color-ink-muted)] animate-pulse">
          Loading board...
        </p>
      </div>
    );
  }

  return (
    <div>
      <BoardHeader
        totalApps={apps.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => setShowAddModal(true)}
        onManageClick={() => setShowColumnManager(true)}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          style={{ minHeight: "calc(100vh - 220px)" }}
        >
          {columns.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              apps={getColumnApps(col.id)}
              allColumns={columns}
              onMoveToColumn={moveCard}
              onOpenDetail={setDetailApp}
            />
          ))}
        </div>

        <DragOverlay>
          {activeApp ? (
            <ApplicationCard
              app={activeApp}
              columns={columns}
              onMoveToColumn={() => {}}
              onOpenDetail={() => {}}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Application Modal */}
      {showAddModal && (
        <AddApplicationModal
          resumes={resumes}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            loadBoard();
          }}
        />
      )}

      {/* Card Detail Panel */}
      {detailApp && (
        <CardDetailPanel
          app={detailApp}
          columns={columns}
          resumes={resumes}
          onClose={() => setDetailApp(null)}
          onSaved={() => loadBoard()}
          onDeleted={() => {
            setDetailApp(null);
            loadBoard();
          }}
        />
      )}

      {/* Column Manager */}
      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onClose={() => setShowColumnManager(false)}
          onChanged={() => loadBoard()}
        />
      )}
    </div>
  );
}
