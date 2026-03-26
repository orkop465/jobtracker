"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge, statusToBadgeVariant } from "@/components/ui/badge";
import { QuickAddForm } from "@/components/quick-add-form";
import { statusLabel } from "@/lib/constants";

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

  function fetchAll() {
    setLoading(true);
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/resumes").then((r) => r.json()),
    ])
      .then(([dashData, resumeData]) => {
        setData(dashData);
        setResumes(
          (resumeData.items ?? []).map((r: any) => ({ id: r.id, label: r.label }))
        );
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-text-muted text-sm animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-text-muted py-20">Failed to load dashboard data.</div>
    );
  }

  const maxVelocity = Math.max(...data.velocity.map((v) => v.count), 1);
  const hasAttention =
    data.needsAttention.staleApps.length > 0 || data.needsAttention.overdueFollowUps.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">Your job search at a glance</p>
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
        <Card className="border-warning/20 bg-warning-muted/30">
          <div className="flex items-center gap-2 mb-4">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-warning">
              <path d="M8 2l6 11H2L8 2zM8 6.5v3M8 11.5v0" />
            </svg>
            <h2 className="text-sm font-semibold text-text-primary">Needs Attention</h2>
          </div>

          {data.needsAttention.staleApps.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-text-muted uppercase font-medium mb-2">Stale Applications</p>
              <div className="space-y-1">
                {data.needsAttention.staleApps.map((a) => (
                  <Link
                    key={a.id}
                    href="/app/applications"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-3 transition-colors text-sm"
                  >
                    <span className="text-text-primary font-medium truncate">{a.company}</span>
                    <span className="text-text-muted truncate">{a.roleTitle}</span>
                    <Badge variant={statusToBadgeVariant(a.status)} className="ml-auto shrink-0">{a.statusLabel}</Badge>
                    <span className="text-xs text-warning font-mono shrink-0">{a.daysSinceUpdate}d ago</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {data.needsAttention.overdueFollowUps.length > 0 && (
            <div>
              <p className="text-xs text-text-muted uppercase font-medium mb-2">Overdue Follow-ups</p>
              <div className="space-y-1">
                {data.needsAttention.overdueFollowUps.map((a) => (
                  <Link
                    key={a.id}
                    href="/app/applications"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-3 transition-colors text-sm"
                  >
                    <span className="text-text-primary font-medium truncate">{a.company}</span>
                    <span className="text-text-muted truncate">{a.roleTitle}</span>
                    <span className="ml-auto text-xs text-negative font-mono shrink-0">
                      Due {new Date(a.nextFollowUp).toLocaleDateString()}
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
        <Card>
          <h2 className="text-sm font-semibold text-text-primary mb-3">Recent Activity</h2>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-text-muted py-4">No recent status changes</p>
          ) : (
            <div className="space-y-1.5">
              {data.recentActivity.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 text-xs py-1.5">
                  <span className="text-text-primary font-medium truncate max-w-[120px]">{ev.company}</span>
                  <span className="text-text-muted">{ev.fromStatus}</span>
                  <span className="text-text-muted">&rarr;</span>
                  <span className="text-text-secondary">{ev.toStatus}</span>
                  <span className="ml-auto text-text-muted font-mono text-[10px] shrink-0">
                    {new Date(ev.occurredAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Application Velocity */}
        <Card>
          <h2 className="text-sm font-semibold text-text-primary mb-3">Weekly Velocity</h2>
          <div className="flex items-end gap-1.5 h-[120px]">
            {data.velocity.map((week, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <span className="text-[10px] font-mono text-text-muted">{week.count}</span>
                <div
                  className="w-full rounded-t-sm bg-accent/60 transition-all duration-300"
                  style={{
                    height: `${Math.max((week.count / maxVelocity) * 100, 4)}%`,
                    minHeight: 4,
                  }}
                />
                <span className="text-[9px] text-text-muted truncate w-full text-center">{week.weekLabel}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Add */}
      <Card>
        <h2 className="text-sm font-semibold text-text-primary mb-3">Quick Add Application</h2>
        <QuickAddForm resumes={resumes} onCreated={fetchAll} />
      </Card>
    </div>
  );
}
