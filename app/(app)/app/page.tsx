"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge, statusToBadgeVariant } from "@/components/ui/badge";
import { QuickAddForm } from "@/components/quick-add-form";

interface DashboardData {
  stats: {
    totalApplications: number;
    responseRate: number;
    offerCount: number;
    activePipeline: number;
  };
  needsAttention: {
    staleApps: {
      id: string;
      company: string;
      roleTitle: string;
      status: string;
      statusLabel: string;
      daysSinceUpdate: number;
    }[];
    overdueFollowUps: {
      id: string;
      company: string;
      roleTitle: string;
      nextFollowUp: string;
      status: string;
      statusLabel: string;
    }[];
  };
  recentActivity: {
    id: string;
    company: string;
    roleTitle: string;
    fromStatus: string;
    toStatus: string;
    occurredAt: string;
  }[];
  velocity: { weekLabel: string; count: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [resumes, setResumes] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const [dashRes, resumeRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/resumes"),
      ]);
      if (!dashRes.ok) throw new Error(`dashboard ${dashRes.status}`);
      if (!resumeRes.ok) throw new Error(`resumes ${resumeRes.status}`);
      const [dashData, resumeData] = await Promise.all([
        dashRes.json(),
        resumeRes.json(),
      ]);
      setData(dashData);
      setResumes(
        (resumeData.items ?? []).map((r: any) => ({ id: r.id, label: r.label }))
      );
    } catch (err) {
      console.error("[dashboard] load failed", err);
      setLoadError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-text-muted text-sm animate-pulse font-data">Initializing terminal...</div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="text-center text-text-muted py-20 font-data">
        {loadError ?? "Failed to load dashboard data."}
        <div className="mt-4">
          <button
            onClick={() => fetchAll()}
            className="font-data text-[10px] text-accent uppercase tracking-widest hover:text-accent-hover"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const maxVelocity = Math.max(...data.velocity.map((v) => v.count), 1);
  const hasAttention =
    data.needsAttention.staleApps.length > 0 || data.needsAttention.overdueFollowUps.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between pb-6 border-b border-white/5">
        <div>
          <div className="section-index text-accent mb-2">01 / Overview</div>
          <h1 className="text-3xl font-display text-text-primary">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-1 border border-white/5">
          <div className="w-1.5 h-1.5 bg-positive shadow-[0_0_6px_rgba(0,255,136,0.6)]" />
          <span className="font-data text-[9px] text-text-secondary uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
        <StatCard label="Total Applications" value={data.stats.totalApplications} />
        <StatCard label="Response Rate" value={`${data.stats.responseRate}%`} />
        <StatCard label="Offers" value={data.stats.offerCount} />
        <StatCard label="Active Pipeline" value={data.stats.activePipeline} />
      </div>

      {/* Needs Attention */}
      {hasAttention && (
        <Card className="border-l-2 border-l-warning/40">
          <div className="flex items-center gap-2 mb-4">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-warning">
              <path d="M7 2l5.5 9.5H1.5L7 2zM7 5.5v2.5M7 10v0" />
            </svg>
            <h2 className="font-data text-[10px] font-bold text-text-primary uppercase tracking-widest">Needs Attention</h2>
          </div>

          {data.needsAttention.staleApps.length > 0 && (
            <div className="mb-4">
              <p className="font-data text-[9px] text-text-muted uppercase mb-2 tracking-widest">Stale Applications</p>
              <div className="space-y-0.5">
                {data.needsAttention.staleApps.map((a) => (
                  <Link
                    key={a.id}
                    href="/app/applications"
                    className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.02] transition-colors text-xs"
                  >
                    <span className="text-text-primary font-medium truncate">{a.company}</span>
                    <span className="text-text-muted truncate">{a.roleTitle}</span>
                    <Badge variant={statusToBadgeVariant(a.status)} className="ml-auto shrink-0">{a.statusLabel}</Badge>
                    <span className="text-warning font-data shrink-0">{a.daysSinceUpdate}d</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {data.needsAttention.overdueFollowUps.length > 0 && (
            <div>
              <p className="font-data text-[9px] text-text-muted uppercase mb-2 tracking-widest">Overdue Follow-ups</p>
              <div className="space-y-0.5">
                {data.needsAttention.overdueFollowUps.map((a) => (
                  <Link
                    key={a.id}
                    href="/app/applications"
                    className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.02] transition-colors text-xs"
                  >
                    <span className="text-text-primary font-medium truncate">{a.company}</span>
                    <span className="text-text-muted truncate">{a.roleTitle}</span>
                    <span className="ml-auto text-negative font-data shrink-0">
                      {new Date(a.nextFollowUp).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Two-column: Activity + Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <Card padding="none">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
            <h2 className="font-data text-[10px] font-bold text-text-primary uppercase tracking-widest">Recent Activity</h2>
          </div>
          {data.recentActivity.length === 0 ? (
            <p className="text-xs text-text-muted px-5 py-6 font-data">No recent status changes</p>
          ) : (
            <div>
              <div className="grid grid-cols-[2fr_3fr_auto] px-5 py-2 font-data text-[9px] font-medium text-text-muted uppercase tracking-widest border-b border-white/[0.03]">
                <span>Company</span>
                <span>Status Change</span>
                <span>Date</span>
              </div>
              {data.recentActivity.map((ev) => (
                <div key={ev.id} className="grid grid-cols-[2fr_3fr_auto] items-center px-5 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.015] transition-colors">
                  <div className="flex flex-col">
                    <span className="text-xs text-text-primary font-medium truncate">{ev.company}</span>
                    <span className="font-data text-[10px] text-text-muted truncate">{ev.roleTitle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-surface-3 border border-white/5 font-data text-[9px] text-text-muted truncate max-w-[80px]">{ev.fromStatus}</span>
                    <span className="text-accent text-[10px]">&rarr;</span>
                    <span className="px-1.5 py-0.5 bg-accent/8 border border-accent/15 font-data text-[9px] text-accent truncate max-w-[80px]">{ev.toStatus}</span>
                  </div>
                  <span className="font-data text-[10px] text-text-muted tabular-nums whitespace-nowrap">
                    {new Date(ev.occurredAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Application Velocity */}
        <Card padding="none">
          <div className="px-5 pt-5 pb-3 border-b border-white/5 flex items-start justify-between">
            <div>
              <h2 className="font-data text-[10px] font-bold text-text-primary uppercase tracking-widest">Weekly Velocity</h2>
              <p className="font-data text-[9px] text-text-muted mt-0.5 uppercase tracking-widest">Applications / week</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-display text-text-primary tabular-nums leading-none">
                {data.velocity.reduce((s, v) => s + v.count, 0)}
              </span>
              <p className="font-data text-[9px] text-text-muted mt-0.5">total</p>
            </div>
          </div>
          <div className="px-5 pb-5 pt-4">
            <div className="relative h-[100px] flex items-end gap-1">
              {/* Grid lines */}
              <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between pointer-events-none">
                <div className="border-t border-white/[0.04] w-full" />
                <div className="border-t border-white/[0.04] w-full" />
                <div className="border-t border-white/[0.04] w-full" />
              </div>
              {data.velocity.map((week, i) => {
                const isMax = week.count === maxVelocity && week.count > 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5 relative z-10">
                    <span className="font-data text-[8px] text-text-muted tabular-nums">{week.count || ""}</span>
                    <div
                      className={`w-full transition-all duration-300 ${isMax ? "bg-accent shadow-[0_-4px_12px_rgba(0,212,255,0.2)]" : "bg-accent/25 hover:bg-accent/45"}`}
                      style={{ height: `${Math.max((week.count / maxVelocity) * 100, 3)}%`, minHeight: 3 }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-1 mt-2">
              {data.velocity.map((week, i) => (
                <div key={i} className="flex-1 text-center">
                  <span className="font-data text-[7px] text-text-muted truncate">{week.weekLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Add */}
      <Card>
        <h2 className="font-data text-[10px] font-bold text-text-primary mb-4 uppercase tracking-widest">Quick Add Application</h2>
        <QuickAddForm resumes={resumes} onCreated={fetchAll} />
      </Card>
    </div>
  );
}
