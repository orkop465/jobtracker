"use client";

import { Fragment, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import type { SortingStrategy } from "@dnd-kit/sortable";
import type { BoardColumnType, KanbanApplication } from "@/lib/board/types";
import { ApplicationCard } from "./application-card";
import { InlineAddForm } from "./inline-add-form";
import {
  daysSince,
  descForStatus,
  isStalled,
  markerColorForColumn,
} from "@/lib/board/stage-meta";
import type { CardStyle, Density } from "./tweaks-panel";

const noopStrategy: SortingStrategy = () => null;

interface BoardColumnProps {
  column: BoardColumnType;
  apps: KanbanApplication[];
  density: Density;
  cardStyle: CardStyle;
  selected: Set<string>;
  addingHere: boolean;
  draggingId: string | null;
  draggingApp: KanbanApplication | null;
  dropPreview: { columnId: string; idx: number } | null;
  onSelect: (id: string) => void;
  onPeek: (app: KanbanApplication) => void;
  onContextMenu: (e: React.MouseEvent, app: KanbanApplication) => void;
  onStartAdd: (columnId: string) => void;
  onAdd: (columnId: string, data: { roleTitle: string; company: string }) => void;
  onCancelAdd: () => void;
}

export function BoardColumn({
  column,
  apps,
  density,
  cardStyle,
  selected,
  addingHere,
  draggingId,
  draggingApp,
  dropPreview,
  onSelect,
  onPeek,
  onContextMenu,
  onStartAdd,
  onAdd,
  onCancelAdd,
}: BoardColumnProps) {
  const droppableData = useMemo(
    () => ({ columnId: column.id, type: "column" as const }),
    [column.id],
  );
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: droppableData,
  });

  // The dragging card stays mounted (dnd-kit needs it registered) but
  // is hidden via CSS (.bcard.is-dragging => display: none) so its slot
  // collapses. The dimmed ghost is inserted into the non-dragging slot
  // sequence at the projected drop index.
  const itemIds = useMemo(() => apps.map((a) => a.id), [apps]);

  const stalledCount = apps.filter((a) => isStalled(a.status, a.updatedAt)).length;
  const avgDays = apps.length
    ? Math.round(
        apps.reduce((sum, a) => sum + daysSince(a.updatedAt ?? a.appliedAt), 0) /
          apps.length,
      )
    : 0;

  const showPreviewHere = dropPreview?.columnId === column.id && !!draggingApp;
  const previewIdx = showPreviewHere ? dropPreview!.idx : -1;

  return (
    <div
      ref={setNodeRef}
      className={`board-col ${isOver ? "is-drag-over" : ""}`}
    >
      <div className="board-col-head">
        <div className="board-col-head-row">
          <div className="board-col-title-wrap">
            <span
              className="board-col-marker"
              style={{ background: markerColorForColumn(column) }}
            />
            <span className="board-col-title">{column.name}</span>
          </div>
          <span className="board-col-count">{apps.length}</span>
        </div>
        <div className="board-col-stat">
          <span>
            {column.mappedStatus ? descForStatus(column.mappedStatus) : "tracking"}
          </span>
          <span className="sep">·</span>
          <span>avg {avgDays}d</span>
          {stalledCount > 0 && (
            <>
              <span className="sep">·</span>
              <span style={{ color: "oklch(0.55 0.13 38)" }}>
                {stalledCount} stalled
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          className="board-col-add"
          onClick={() => onStartAdd(column.id)}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path
              d="M5.5 2v7M2 5.5h7"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          Add a role
        </button>
      </div>

      <div className="board-col-cards">
        {addingHere && (
          <InlineAddForm
            onAdd={(data) => onAdd(column.id, data)}
            onCancel={onCancelAdd}
          />
        )}

        {apps.length === 0 && !addingHere && !showPreviewHere && (
          <div className="board-col-ghost">
            <svg
              className="board-col-ghost-icon"
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
            >
              <rect
                x="3"
                y="3"
                width="16"
                height="16"
                rx="2"
                stroke="currentColor"
                strokeDasharray="2 2"
                strokeWidth="1.3"
              />
              <path
                d="M11 8v6M8 11h6"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            Drag here, or click <em>Add a role</em>.
          </div>
        )}

        <SortableContext items={itemIds} strategy={noopStrategy}>
          {(() => {
            const out: React.ReactNode[] = [];
            let nonDraggingI = 0;
            for (const app of apps) {
              if (app.id !== draggingId) {
                if (showPreviewHere && previewIdx === nonDraggingI && draggingApp) {
                  out.push(
                    <GhostPreview
                      key={`ghost-${nonDraggingI}`}
                      app={draggingApp}
                      density={density}
                      cardStyle={cardStyle}
                    />,
                  );
                }
                nonDraggingI += 1;
              }
              out.push(
                <ApplicationCard
                  key={app.id}
                  app={app}
                  columnId={column.id}
                  density={density}
                  cardStyle={cardStyle}
                  selected={selected.has(app.id)}
                  onSelect={onSelect}
                  onPeek={onPeek}
                  onContextMenu={onContextMenu}
                />,
              );
            }
            if (showPreviewHere && previewIdx === nonDraggingI && draggingApp) {
              out.push(
                <GhostPreview
                  key="ghost-end"
                  app={draggingApp}
                  density={density}
                  cardStyle={cardStyle}
                />,
              );
            }
            return out;
          })()}
        </SortableContext>
      </div>
    </div>
  );
}

function GhostPreview({
  app,
  density,
  cardStyle,
}: {
  app: KanbanApplication;
  density: Density;
  cardStyle: CardStyle;
}) {
  return (
    <div className="bcard-ghost-wrap">
      <ApplicationCard
        app={app}
        columnId=""
        density={density}
        cardStyle={cardStyle}
        selected={false}
        onSelect={() => {}}
        onPeek={() => {}}
        onContextMenu={() => {}}
        isOverlay
      />
    </div>
  );
}
