"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/app/dashboard/page-header";
import { StatTile } from "@/components/app/dashboard/stat-tile";
import { TasksCard } from "@/components/app/dashboard/tasks-card";
import { UpcomingCard } from "@/components/app/dashboard/upcoming-card";
import { StalledCard } from "@/components/app/dashboard/stalled-card";
import { QuickAddInline } from "@/components/app/dashboard/quick-add-inline";
import { ActivityChart } from "@/components/app/dashboard/activity-chart";
import { GoalCard } from "@/components/app/dashboard/goal-card";
import { InsightCard } from "@/components/app/dashboard/insight-card";
import { FeedCard } from "@/components/app/dashboard/feed-card";
import { MarketplaceCard } from "@/components/app/dashboard/marketplace-card";
import { PeekSheet } from "@/components/app/dashboard/peek-sheet";
import type { DashboardData } from "@/components/app/dashboard/types";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("week");
  const [quickOpen, setQuickOpen] = useState(false);
  const [peekAppId, setPeekAppId] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error("[dashboard] load failed", err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Dashboard-local keyboard shortcuts (Esc closes peek/inline).
  // Global N hotkey lives in <QuickAddProvider> — opens the overlay.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setQuickOpen(false);
        setPeekAppId(null);
      }
    }
    function onAppsChanged() {
      fetchDashboard();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("app:applications-changed", onAppsChanged);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("app:applications-changed", onAppsChanged);
    };
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <span style={{ color: "var(--ink-3)", fontSize: 13, fontFamily: "var(--font-jetbrains-mono)" }}>
          Loading dashboard...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ textAlign: "center", color: "var(--ink-3)", padding: "80px 20px", fontSize: 14 }}>
        {error || "Failed to load dashboard."}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => { setLoading(true); fetchDashboard(); }}
            style={{
              fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--accent-ink)",
              background: "none", border: "1px solid var(--line)", borderRadius: 4, padding: "6px 14px",
              cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Build sparkline data from velocity
  const velocityCounts = data.velocity.map((v) => v.count);
  const responseRateSpark = velocityCounts.length > 1 ? velocityCounts : [0, data.stats.responseRate];
  const inFlightSpark = velocityCounts.length > 1 ? velocityCounts.map((_, i) => Math.max(1, data.stats.inFlight - (velocityCounts.length - 1 - i))) : [0, data.stats.inFlight];

  const overdueCount = data.followUps.filter((f) => f.urgency === "overdue" || f.urgency === "today").length;

  return (
    <>
      <PageHeader
        userName={data.userName}
        followUpCount={overdueCount}
        interviewCount={data.interviews.length}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
      />

      <div className="dash">
        {/* Stat tiles */}
        <div className="dash-stats">
          <StatTile
            label="Response rate"
            value={data.stats.responseRate}
            suffix="%"
            delta={data.stats.responseRate > 0 ? `${data.stats.responseRate}%` : undefined}
            deltaKind={data.stats.responseRate >= 30 ? "pos" : data.stats.responseRate >= 15 ? "neu" : "neg"}
            sparkData={responseRateSpark}
            sparkColor="var(--sage)"
            foot={`${data.stats.totalApplications} total applications`}
            footRight="12W"
          />
          <StatTile
            label="In flight"
            value={data.stats.inFlight}
            delta={data.stats.inFlight > 0 ? `${data.stats.inFlight}` : undefined}
            deltaKind="pos"
            sparkData={inFlightSpark}
            sparkColor="var(--accent)"
            foot="active pipeline"
            footRight="12W"
          />
          <StatTile
            label="Interviews"
            value={data.stats.onsites}
            delta={data.stats.onsites > 0 ? `${data.stats.onsites}` : "—"}
            deltaKind={data.stats.onsites > 0 ? "pos" : "neu"}
            sparkData={velocityCounts}
            sparkColor="var(--sky)"
            foot="in interview stages"
          />
          <StatTile
            label="Offers pending"
            value={data.stats.offersPending}
            delta={data.stats.offersPending > 0 ? `${data.stats.offersPending}` : "—"}
            deltaKind={data.stats.offersPending > 0 ? "pos" : "neu"}
            sparkData={[0, 0, 0, 0, data.stats.offersPending, data.stats.offersPending]}
            sparkColor="var(--accent)"
            foot={data.stats.offersPending > 0 ? "pending review" : "none yet"}
          />
        </div>

        {/* Main grid */}
        <div className="dash-grid">
          <div className="dash-col">
            <TasksCard followUps={data.followUps} onRefresh={fetchDashboard} />
            <UpcomingCard interviews={data.interviews} onSelect={setPeekAppId} />
            <StalledCard apps={data.stalledApps} onSelect={setPeekAppId} />
          </div>
          <div className="dash-col">
            <QuickAddInline open={quickOpen} setOpen={setQuickOpen} onCreated={fetchDashboard} />
            <ActivityChart data={data.monthlyActivity} />
            <GoalCard goal={data.weeklyGoal} applied={data.thisWeekApplied} onGoalUpdate={fetchDashboard} />
            <InsightCard insight={data.insight} />
            <FeedCard activity={data.recentActivity} />
          </div>
        </div>

        {/* Resume marketplace callouts */}
        <MarketplaceCard />
      </div>

      {/* Peek sheet */}
      {peekAppId && <PeekSheet appId={peekAppId} onClose={() => setPeekAppId(null)} />}
    </>
  );
}
