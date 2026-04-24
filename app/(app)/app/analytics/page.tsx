"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorBanner } from "@/components/ui/error-banner";

type GoogleChartsDataTable = {
  addColumn: (type: string, label: string) => void;
  addRows: (rows: Array<[string, string, number]>) => void;
};
type GoogleChartsSankey = {
  draw: (table: GoogleChartsDataTable, options: Record<string, unknown>) => void;
};
type GoogleChartsNamespace = {
  visualization?: {
    DataTable: new () => GoogleChartsDataTable;
    Sankey: new (container: HTMLElement) => GoogleChartsSankey;
  };
  charts?: {
    load: (version: string, options: { packages: string[] }) => void;
    setOnLoadCallback: (callback: () => void) => void;
  };
};
type WindowWithGoogle = Window & { google?: GoogleChartsNamespace };

type AnalyticsPayload = {
  summary: {
    totalApplications: number;
    respondedApplications: number;
    responseRate: number;
  };
  funnel: {
    applied: number;
    screen: number;
    interview: number;
    offer: number;
    terminalOutcomes: number;
  };
  pipelineCounts: Record<string, number>;
  pipelineCountsLabeled: Record<string, number>;
  timeInStage: Record<string, { avgHours: number; samples: number }>;
  sankey: {
    nodes: Array<{ id: string; label: string }>;
    links: Array<{ source: string; target: string; value: number }>;
    sankeymaticText: string;
    googleChartRows: Array<[string, string, number]>;
  };
  sourceStats: Record<string, { total: number; responded: number; interviewed: number; offered: number; responseRate: number }>;
  resumeStats: Array<{ resumeId: string; resumeLabel: string; total: number; responded: number; responseRate: number }>;
  velocity: Array<{ weekLabel: string; count: number }>;
  conversionRates: Array<{ from: string; to: string; rate: number; numerator: number; denominator: number }>;
  timeToOutcome: {
    avgDaysToOffer: number | null;
    avgDaysToRejection: number | null;
    medianDaysToOffer: number | null;
    medianDaysToRejection: number | null;
    offerSamples: number;
    rejectionSamples: number;
  };
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartErr, setChartErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/analytics", { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setErr(body?.error ?? `Failed (${res.status})`);
          return;
        }
        setData(body as AnalyticsPayload);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Google Charts Sankey
  useEffect(() => {
    if (!data?.sankey.googleChartRows?.length) return;
    const currentData = data;
    let cancelled = false;

    function draw() {
      if (cancelled) return;
      const googleRef = (window as WindowWithGoogle).google;
      if (!googleRef?.visualization?.DataTable || !googleRef?.charts) return;
      const container = document.getElementById("sankey-chart");
      if (!container) return;

      const table = new googleRef.visualization.DataTable();
      table.addColumn("string", "From");
      table.addColumn("string", "To");
      table.addColumn("number", "Count");
      table.addRows(currentData.sankey.googleChartRows);

      const chart = new googleRef.visualization.Sankey(container);
      chart.draw(table, {
        width: 920,
        height: 460,
        tooltip: { trigger: "none" },
        backgroundColor: "#0b0f18",
        sankey: {
          node: {
            width: 14,
            nodePadding: 24,
            colors: ["#3d4f6a", "#38bdf8", "#14b8a6", "#a78bfa", "#10b981", "#f43f5e", "#f97316", "#f59e0b"],
            label: { color: "#e4e8f1", fontSize: 13, bold: true },
          },
          link: { colorMode: "source", color: { fillOpacity: 0.3 } },
        },
      });
    }

    function ensureGoogleChartsLoaded() {
      const existingGoogle = (window as WindowWithGoogle).google;
      if (existingGoogle?.charts) {
        existingGoogle.charts.load("current", { packages: ["sankey"] });
        existingGoogle.charts.setOnLoadCallback(draw);
        return;
      }
      const existingScript = document.getElementById("google-charts-loader");
      if (existingScript) return;
      const script = document.createElement("script");
      script.id = "google-charts-loader";
      script.src = "https://www.gstatic.com/charts/loader.js";
      script.async = true;
      script.onload = () => {
        const g = (window as WindowWithGoogle).google;
        if (!g?.charts) { setChartErr("Failed to init Google Charts."); return; }
        g.charts.load("current", { packages: ["sankey"] });
        g.charts.setOnLoadCallback(draw);
      };
      script.onerror = () => setChartErr("Failed to load Google Charts script.");
      document.head.appendChild(script);
    }

    ensureGoogleChartsLoaded();
    return () => { cancelled = true; };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-text-muted text-sm animate-pulse font-data">Loading analytics...</div>
      </div>
    );
  }

  if (err) return <ErrorBanner message={err} />;
  if (!data) return <div className="text-text-muted">No data available.</div>;

  const maxVelocity = Math.max(...(data.velocity ?? []).map((v) => v.count), 1);
  const pipelineEntries = Object.entries(data.pipelineCountsLabeled).sort(([, a], [, b]) => b - a);
  const timeEntries = Object.entries(data.timeInStage).filter(([, v]) => v.samples > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-6 border-b border-white/5">
        <div>
          <div className="section-index text-accent mb-2">02 / Analytics</div>
          <h1 className="text-3xl font-display text-text-primary">Analytics</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-1 border border-white/5">
          <div className="w-1.5 h-1.5 bg-accent shadow-[0_0_6px_rgba(0,212,255,0.6)]" />
          <span className="font-data text-[9px] text-text-secondary tabular-nums uppercase tracking-widest">
            {data.summary.totalApplications} records
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 stagger-children">
        <StatCard label="Total Apps" value={data.summary.totalApplications} />
        <StatCard label="Response Rate" value={`${(data.summary.responseRate * 100).toFixed(0)}%`} />
        <StatCard label="Responded" value={data.summary.respondedApplications} />
        <StatCard label="Terminal" value={data.funnel.terminalOutcomes} />
      </div>

      {/* Conversion funnel */}
      <Card>
        <h2 className="text-xs font-semibold text-text-primary mb-4 uppercase tracking-wider font-data">Conversion Funnel</h2>
        <div className="space-y-3">
          {[
            { label: "Applied", count: data.funnel.applied, pct: 100, color: "bg-info/50", glow: "" },
            { label: "Screen", count: data.funnel.screen, pct: data.funnel.applied ? (data.funnel.screen / data.funnel.applied) * 100 : 0, color: "bg-accent/50", glow: "" },
            { label: "Interview", count: data.funnel.interview, pct: data.funnel.applied ? (data.funnel.interview / data.funnel.applied) * 100 : 0, color: "bg-[#a78bfa]/50", glow: "" },
            { label: "Offer", count: data.funnel.offer, pct: data.funnel.applied ? (data.funnel.offer / data.funnel.applied) * 100 : 0, color: "bg-positive/60", glow: "shadow-[0_0_8px_rgba(16,185,129,0.2)]" },
          ].map((stage) => (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-text-secondary font-data">{stage.label}</span>
                <span className="text-xs font-data text-text-muted tabular-nums">{stage.count} <span className="text-text-primary">({stage.pct.toFixed(0)}%)</span></span>
              </div>
              <div className="h-2 bg-surface-3 rounded-sm overflow-hidden">
                <div
                  className={`h-full ${stage.color} ${stage.glow} rounded-sm transition-all duration-500`}
                  style={{ width: `${Math.max(stage.pct, 1)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Stage conversion rates */}
      {data.conversionRates && data.conversionRates.length > 0 && (
        <Card>
          <h2 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider font-data">Stage Conversion Rates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.conversionRates.map((cr) => (
              <div key={`${cr.from}-${cr.to}`} className="relative text-center p-4 rounded-md bg-surface-2 border border-border overflow-hidden group hover:border-accent/15 transition-all">
                <div className="absolute top-0 left-0 w-[2px] h-full bg-accent/30 group-hover:bg-accent/60 transition-colors" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-[10px] text-text-muted mb-1.5 font-data tracking-wider">{cr.from} &rarr; {cr.to}</p>
                <p className="text-3xl font-light font-data text-text-primary tabular-nums">
                  {(cr.rate * 100).toFixed(0)}<span className="text-lg text-accent-text">%</span>
                </p>
                <p className="text-[10px] text-text-muted mt-1.5 font-data tabular-nums">{cr.numerator} / {cr.denominator}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Two column: Pipeline + Time in Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider font-data">Pipeline Breakdown</h2>
          <div className="space-y-2">
            {pipelineEntries.map(([label, count]) => {
              const maxCount = Math.max(...pipelineEntries.map(([, c]) => c), 1);
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-28 shrink-0 truncate font-data">{label}</span>
                  <div className="flex-1 h-1.5 bg-surface-3 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-accent/50 rounded-sm"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-data text-text-muted w-8 text-right tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider font-data">Avg Time in Stage</h2>
          {timeEntries.length === 0 ? (
            <p className="text-xs text-text-muted font-data">Not enough data yet.</p>
          ) : (
            <div className="space-y-0.5">
              {timeEntries.map(([stage, info]) => {
                const days = info.avgHours / 24;
                return (
                  <div key={stage} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-xs text-text-secondary font-data">{stage}</span>
                    <div className="text-right">
                      <span className="text-sm font-data text-text-primary tabular-nums">{days.toFixed(1)}d</span>
                      <span className="text-[10px] text-text-muted ml-1.5 font-data">({info.samples})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Time to outcome */}
      {data.timeToOutcome && (data.timeToOutcome.offerSamples > 0 || data.timeToOutcome.rejectionSamples > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {data.timeToOutcome.avgDaysToOffer != null && (
            <StatCard
              label="Avg Days to Offer"
              value={`${data.timeToOutcome.avgDaysToOffer}d`}
              subtitle={`${data.timeToOutcome.offerSamples} offer${data.timeToOutcome.offerSamples !== 1 ? "s" : ""}`}
            />
          )}
          {data.timeToOutcome.medianDaysToOffer != null && (
            <StatCard
              label="Median Days to Offer"
              value={`${data.timeToOutcome.medianDaysToOffer}d`}
            />
          )}
          {data.timeToOutcome.avgDaysToRejection != null && (
            <StatCard
              label="Avg Days to Reject"
              value={`${data.timeToOutcome.avgDaysToRejection}d`}
              subtitle={`${data.timeToOutcome.rejectionSamples} rejection${data.timeToOutcome.rejectionSamples !== 1 ? "s" : ""}`}
            />
          )}
          {data.timeToOutcome.medianDaysToRejection != null && (
            <StatCard
              label="Median Days to Reject"
              value={`${data.timeToOutcome.medianDaysToRejection}d`}
            />
          )}
        </div>
      )}

      {/* Source Effectiveness */}
      {data.sourceStats && Object.keys(data.sourceStats).length > 0 && (
        <Card>
          <h2 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider font-data">Source Effectiveness</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-text-muted uppercase tracking-wider border-b border-border font-data">
                  <th className="text-left py-2 pr-4 font-medium">Source</th>
                  <th className="text-right py-2 px-2 font-medium">Total</th>
                  <th className="text-right py-2 px-2 font-medium">Response</th>
                  <th className="text-right py-2 px-2 font-medium">Interview</th>
                  <th className="text-right py-2 px-2 font-medium">Offer</th>
                  <th className="text-right py-2 pl-2 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.sourceStats)
                  .sort(([, a], [, b]) => b.responseRate - a.responseRate)
                  .map(([source, stats], i) => (
                    <tr key={source} className={`border-b border-border-subtle ${i === 0 ? "bg-accent-muted/30" : ""}`}>
                      <td className="py-2 pr-4 font-medium text-text-primary">{source}</td>
                      <td className="py-2 px-2 text-right font-data text-text-secondary tabular-nums">{stats.total}</td>
                      <td className="py-2 px-2 text-right font-data text-text-secondary tabular-nums">{stats.responded}</td>
                      <td className="py-2 px-2 text-right font-data text-text-secondary tabular-nums">{stats.interviewed}</td>
                      <td className="py-2 px-2 text-right font-data text-text-secondary tabular-nums">{stats.offered}</td>
                      <td className="py-2 pl-2 text-right font-data text-accent-text font-semibold tabular-nums">
                        {(stats.responseRate * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Resume Performance */}
      {data.resumeStats && data.resumeStats.length > 0 && (
        <Card>
          <h2 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider font-data">Resume Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-text-muted uppercase tracking-wider border-b border-border font-data">
                  <th className="text-left py-2 pr-4 font-medium">Resume</th>
                  <th className="text-right py-2 px-2 font-medium">Sent</th>
                  <th className="text-right py-2 px-2 font-medium">Responded</th>
                  <th className="text-right py-2 pl-2 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.resumeStats.map((rs, i) => (
                  <tr key={rs.resumeId} className={`border-b border-border-subtle ${i === 0 ? "bg-positive-muted/30" : ""}`}>
                    <td className="py-2 pr-4 font-medium text-text-primary">{rs.resumeLabel}</td>
                    <td className="py-2 px-2 text-right font-data text-text-secondary tabular-nums">{rs.total}</td>
                    <td className="py-2 px-2 text-right font-data text-text-secondary tabular-nums">{rs.responded}</td>
                    <td className="py-2 pl-2 text-right font-data text-positive font-semibold tabular-nums">
                      {(rs.responseRate * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Application Velocity */}
      {data.velocity && data.velocity.length > 0 && (
        <Card>
          <h2 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider font-data">Application Velocity (12 weeks)</h2>
          <div className="flex items-end gap-1 h-[140px]">
            {data.velocity.map((week, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <span className="text-[10px] font-data text-text-muted tabular-nums">{week.count || ""}</span>
                <div
                  className="w-full rounded-t-sm bg-info/40 transition-all duration-300"
                  style={{ height: `${Math.max((week.count / maxVelocity) * 100, 3)}%`, minHeight: 3 }}
                />
                <span className="text-[7px] text-text-muted truncate w-full text-center font-data">{week.weekLabel}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sankey Chart */}
      <Card>
        <h2 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider font-data">Application Flow</h2>
        {chartErr && <ErrorBanner message={chartErr} className="mb-3" />}
        {data.sankey.googleChartRows.length === 0 ? (
          <p className="text-xs text-text-muted py-4 font-data">No transitions recorded yet.</p>
        ) : (
          <div
            id="sankey-chart"
            className="w-full rounded-md overflow-hidden"
            style={{ minHeight: 460, background: "#0b0f18" }}
          />
        )}
      </Card>

      {/* SankeyMATIC Export */}
      {data.sankey.sankeymaticText && (
        <Card>
          <h2 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider font-data">SankeyMATIC Export</h2>
          <textarea
            readOnly
            value={data.sankey.sankeymaticText}
            className="w-full min-h-[140px] bg-surface-2 text-text-secondary text-xs font-data border border-border rounded-md p-3 resize-y focus-ring"
          />
        </Card>
      )}
    </div>
  );
}
