"use client";

import { useState } from "react";

interface GoalCardProps {
  goal: number | null;
  applied: number;
  onGoalUpdate?: () => void;
}

export function GoalCard({ goal, applied, onGoalUpdate }: GoalCardProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String(goal || 10));
  const [saving, setSaving] = useState(false);

  const target = goal || 10;
  const pct = Math.min(Math.round((applied / target) * 100), 100);
  const remaining = Math.max(target - applied, 0);

  async function saveGoal() {
    const val = parseInt(input, 10);
    if (!val || val < 1 || val > 100) return;
    setSaving(true);
    try {
      await fetch("/api/users/me/goal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyGoal: val }),
      });
      setEditing(false);
      onGoalUpdate?.();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const caption =
    applied >= target
      ? "Goal reached! Keep the momentum going."
      : remaining <= 2
        ? `Almost there — ${remaining} more to hit your target.`
        : `On pace — ${remaining} more this week keeps your streak alive.`;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <span className="card-index">[05]</span>
          <span className="card-title">Weekly goal</span>
        </div>
        <button className="card-action" onClick={() => setEditing(!editing)}>
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {editing ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <input
            type="number"
            min={1}
            max={100}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveGoal()}
            style={{
              width: 60, padding: "6px 8px", border: "1px solid var(--line)",
              borderRadius: 4, fontFamily: "var(--font-jetbrains-mono)", fontSize: 14,
              background: "var(--bg)", color: "var(--ink)",
            }}
          />
          <span style={{ fontSize: 13, color: "var(--ink-3)" }}>applications per week</span>
          <button className="quickadd-submit" onClick={saveGoal} disabled={saving}>Save</button>
        </div>
      ) : (
        <>
          <div className="goal-row">
            <div>
              <span className="goal-value">{applied}</span>
              <span className="goal-value-target">/{target} applications</span>
            </div>
            <span className="goal-pct">{pct}%</span>
          </div>
          <div className="goal-track">
            <div className="goal-bar" style={{ width: `${pct}%` }} />
          </div>
          <div className="goal-ticks">
            <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
          </div>
          <div className="goal-caption">{caption}</div>
        </>
      )}
    </div>
  );
}
