"use client";

import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { KanbanApplication } from "@/lib/board/types";
import {
  closedLabel,
  companyColor,
  daysSince,
  descForStatus,
  formatComp,
  formatNext,
  isStalled,
  isTerminalStatus,
  mapSourceToBucket,
  pinRotation,
  sourceBucketLabel,
} from "@/lib/board/stage-meta";
import type { CardStyle, Density } from "./tweaks-panel";

interface ApplicationCardProps {
  app: KanbanApplication;
  columnId: string;
  density: Density;
  cardStyle: CardStyle;
  selected: boolean;
  onSelect: (id: string) => void;
  onPeek: (app: KanbanApplication) => void;
  onContextMenu: (e: React.MouseEvent, app: KanbanApplication) => void;
  isOverlay?: boolean;
  overlaySelectionCount?: number;
}

export function ApplicationCard({
  app,
  columnId,
  density,
  cardStyle,
  selected,
  onSelect,
  onPeek,
  onContextMenu,
  isOverlay,
  overlaySelectionCount,
}: ApplicationCardProps) {
  const sortableData = useMemo(
    () => ({ columnId, type: "card" as const }),
    [columnId],
  );
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: app.id,
    data: sortableData,
    disabled: isOverlay,
  });

  const style: React.CSSProperties = isOverlay
    ? { ["--rotate" as string]: `${pinRotation(app.id)}deg` }
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        ["--rotate" as string]: `${pinRotation(app.id)}deg`,
      };

  const bucket = mapSourceToBucket(app.source);
  const sourceLabel = bucket ? sourceBucketLabel(bucket) : null;

  // Days since the user applied — stable across moves, undos, and edits.
  // Updates lazily on each render; if the user keeps the page open across
  // midnight, the next state change will recompute against the new date.
  const days = daysSince(app.appliedAt);
  const daysClass = days >= 10 ? "warn" : days <= 3 ? "fresh" : "";
  const stalled = isStalled(app.status, app.updatedAt);
  const closed = isTerminalStatus(app.status) ? closedLabel(app.status) : null;
  const compLabel = formatComp(app.salaryMin, app.salaryMax, app.currency);
  const nextLabel = formatNext(app.nextFollowUp);
  const note = app.notes?.trim() ?? "";
  const resumeLabel = app.resume?.label ?? null;

  const cls = [
    "bcard",
    `style-${cardStyle}`,
    selected ? "is-selected" : "",
    !isOverlay && isDragging ? "is-dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      className={cls}
      style={style}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(".bcard-check")) return;
        onPeek(app);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, app);
      }}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
    >
      <div className="bcard-top">
        <button
          type="button"
          className="bcard-check"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(app.id);
          }}
          aria-label="Select"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path
              d="M2 4.5l1.5 1.5L7 2.5"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="bcard-co">
          <span
            className="bcard-co-logo"
            style={{ background: companyColor(app.company) }}
          >
            {app.company.charAt(0).toUpperCase()}
          </span>
          <span className="bcard-co-name">{app.company}</span>
        </div>
        {bucket && (
          <span className={`bcard-source ${bucket}`}>{sourceLabel}</span>
        )}
      </div>

      <div className="bcard-role">{app.roleTitle}</div>

      <div className="bcard-meta">
        <span className={`bcard-days ${daysClass}`}>{days}d</span>
        <span className="sep">·</span>
        <span>{descForStatus(app.status)}</span>
        {stalled && (
          <>
            <span className="sep">·</span>
            <span style={{ color: "oklch(0.55 0.13 38)" }}>stalled</span>
          </>
        )}
        {closed && (
          <>
            <span className="sep">·</span>
            <span>{closed}</span>
          </>
        )}
      </div>

      {resumeLabel && (
        <div className="bcard-resume">
          <svg width="9" height="11" viewBox="0 0 9 11" fill="none" aria-hidden>
            <path
              d="M1 1.5h5l2 2v6a1 1 0 01-1 1H1a1 1 0 01-1-1V2.5a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path d="M5.5 1.5v2.5H8" stroke="currentColor" strokeWidth="1" />
          </svg>
          <span>{resumeLabel}</span>
        </div>
      )}

      {density === "rich" && (
        <>
          <div className="bcard-comp">
            comp · <span className="v">{compLabel}</span>
          </div>
          {note && <div className="bcard-note">&ldquo;{note}&rdquo;</div>}
          {nextLabel && (
            <div className="bcard-next">
              next:
              <span className="bcard-next-pill">{nextLabel}</span>
            </div>
          )}
        </>
      )}

      {isOverlay &&
        overlaySelectionCount !== undefined &&
        overlaySelectionCount > 1 && (
          <div
            style={{
              position: "absolute",
              top: -10,
              right: -10,
              background: "var(--ink)",
              color: "var(--bg)",
              borderRadius: 999,
              padding: "2px 8px",
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.04em",
              boxShadow: "var(--shadow-md)",
            }}
          >
            +{overlaySelectionCount - 1} more
          </div>
        )}
    </div>
  );
}
