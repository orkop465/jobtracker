"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { BoardColumnType, KanbanApplication } from "@/lib/board/types";
import { ApplicationCard } from "./application-card";
import { InlineAddForm } from "./inline-add-form";
import { DropIndicator } from "./drop-indicator";
import {
  daysSince,
  descForStatus,
  isStalled,
  markerColorForColumn,
} from "@/lib/board/stage-meta";
import type { CardStyle, Density } from "./tweaks-panel";

interface BoardColumnProps {
  column: BoardColumnType;
  apps: KanbanApplication[];
  density: Density;
  cardStyle: CardStyle;
  selected: Set<string>;
  addingHere: boolean;
  draggingId: string | null;
  overInfo: { id: string; side: "above" | "below" } | null;
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
  overInfo,
  onSelect,
  onPeek,
  onContextMenu,
  onStartAdd,
  onAdd,
  onCancelAdd,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { columnId: column.id, type: "column" },
  });

  const itemIds = apps.map((a) => a.id);
  const stalledCount = apps.filter((a) => isStalled(a.status, a.updatedAt)).length;
  const avgDays = apps.length
    ? Math.round(
        apps.reduce((sum, a) => sum + daysSince(a.updatedAt ?? a.appliedAt), 0) /
          apps.length,
      )
    : 0;

  const draggingFromAnotherColumn =
    draggingId != null &&
    apps.every((a) => a.id !== draggingId) &&
    isOver;

  const overIndex = overInfo
    ? apps.findIndex((a) => a.id === overInfo.id)
    : -1;
  const overSide = overInfo?.side ?? "above";

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

        {apps.length === 0 && !addingHere && (
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

        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {apps.map((app, i) => {
            const showAbove =
              overIndex === i && overSide === "above" && draggingId !== app.id;
            const showBelow =
              overIndex === i && overSide === "below" && draggingId !== app.id;
            return (
              <div key={app.id}>
                {showAbove && <DropIndicator />}
                <ApplicationCard
                  app={app}
                  columnId={column.id}
                  density={density}
                  cardStyle={cardStyle}
                  selected={selected.has(app.id)}
                  onSelect={onSelect}
                  onPeek={onPeek}
                  onContextMenu={onContextMenu}
                />
                {showBelow && <DropIndicator />}
              </div>
            );
          })}
          {(draggingFromAnotherColumn ||
            (overIndex === -1 && isOver && apps.length > 0)) && <DropIndicator />}
        </SortableContext>
      </div>
    </div>
  );
}
