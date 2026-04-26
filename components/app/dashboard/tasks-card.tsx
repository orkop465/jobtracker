"use client";

import { useState } from "react";
import { CompanyLogo } from "./company-logo";
import type { FollowUpItem } from "./types";

interface TasksCardProps {
  followUps: FollowUpItem[];
  onRefresh: () => void;
}

export function TasksCard({ followUps, onRefresh }: TasksCardProps) {
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const tasks = followUps.map((f) => ({
    ...f,
    done: optimistic[f.id] !== undefined ? optimistic[f.id] : f.done,
  }));

  const doneCount = tasks.filter((t) => t.done).length;

  async function toggleTask(id: string, currentDone: boolean) {
    setOptimistic((o) => ({ ...o, [id]: !currentDone }));
    try {
      const res = await fetch(`/api/follow-ups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !currentDone }),
      });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch {
      setOptimistic((o) => ({ ...o, [id]: currentDone }));
    }
  }

  async function snoozeTask(id: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    try {
      await fetch(`/api/follow-ups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snoozedTo: tomorrow.toISOString() }),
      });
      onRefresh();
    } catch {
      // silent
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <span className="card-index">[01]</span>
          <span className="card-title">Today&apos;s follow-ups</span>
          <span className="card-sub">&middot; {tasks.length - doneCount} left</span>
        </div>
        <button className="card-action">View all &rarr;</button>
      </div>

      {tasks.length === 0 ? (
        <div style={{ padding: "16px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
          No follow-ups scheduled. Nice work!
        </div>
      ) : (
        <div className="tasks-list">
          {tasks.map((t) => (
            <div key={t.id} className={`task ${t.done ? "is-done" : ""}`}>
              <button
                className="task-check"
                onClick={() => toggleTask(t.id, t.done)}
                aria-label={t.done ? "Mark incomplete" : "Mark complete"}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="task-body">
                <div className="task-top">
                  <span className={`task-pill ${t.urgency}`}>
                    {t.urgency === "overdue" ? `Overdue` : t.urgency === "today" ? "Today" : t.urgency === "soon" ? "Soon" : "Later"}
                  </span>
                </div>
                <div className="task-title">{t.title}</div>
                <div className="task-meta">
                  <CompanyLogo company={t.company} />
                  <span>{t.company}</span>
                </div>
              </div>
              <div className="task-actions">
                <button className="task-action-btn" title="Snooze" onClick={() => snoozeTask(t.id)}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M6 4.5V6.5L7.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="tasks-foot">
          <div className="tasks-foot-progress">
            <span>{doneCount}/{tasks.length} done</span>
            <div className="tasks-foot-bar">
              <div className="tasks-foot-bar-fill" style={{ width: `${(doneCount / tasks.length) * 100}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
