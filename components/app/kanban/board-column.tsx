"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ApplicationCard } from "./application-card";
import type { BoardColumnType, KanbanApplication } from "@/lib/board/types";

interface BoardColumnProps {
  column: BoardColumnType;
  apps: KanbanApplication[];
  allColumns: BoardColumnType[];
  onMoveToColumn: (appId: string, columnId: string) => void;
  onOpenDetail: (app: KanbanApplication) => void;
}

function getColumnAccent(mappedStatus: string | null): string {
  if (mappedStatus === "OFFER") return "bg-[var(--color-survive-soft)]";
  return "";
}

function isTerminal(mappedStatus: string | null): boolean {
  return ["REJECTED", "WITHDRAWN", "GHOSTED"].includes(mappedStatus ?? "");
}

export function BoardColumn({
  column,
  apps,
  allColumns,
  onMoveToColumn,
  onOpenDetail,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { columnId: column.id },
  });

  const itemIds = apps.map((a) => a.id);
  const terminal = isTerminal(column.mappedStatus);

  return (
    <div
      className={`
        flex-shrink-0 w-[270px] flex flex-col rounded-[10px]
        border border-dashed border-[var(--color-line)]
        ${getColumnAccent(column.mappedStatus)}
        ${isOver ? "border-[var(--color-ink-muted)]" : ""}
        ${terminal ? "opacity-70" : ""}
        transition-colors duration-[180ms]
      `}
      style={{ maxHeight: "calc(100vh - 180px)" }}
    >
      {/* Column header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)] truncate">
          {column.name}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-[var(--color-ink-muted)] ml-2 flex-shrink-0">
          {apps.length}
        </span>
      </div>

      {/* Card list */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[60px]"
      >
        <SortableContext
          items={itemIds}
          strategy={verticalListSortingStrategy}
        >
          {apps.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              columns={allColumns}
              onMoveToColumn={onMoveToColumn}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </SortableContext>

        {apps.length === 0 && (
          <div className="flex items-center justify-center h-[60px]">
            <p className="font-mono text-[10px] text-[var(--color-ink-muted)]">
              No applications
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
