"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorBanner } from "@/components/ui/error-banner";

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
      const googleRef = (window as any).google;
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
        backgroundColor: "#0f1218",
        sankey: {
          node: {
            width: 14,
            nodePadding: 24,
            colors: ["#4e5871", "#60a5fa", "#2dd4bf", "#a78bfa", "#34d399", "#fb7185", "#f97316", "#fbbf24"],
            label: { color: "#eef0f4", fontSize: 13, bold: true },
          },
          link: { colorMode: "source", color: { fillOpacity: 0.35 } },
        },
      });
    }

    function ensureGoogleChartsLoaded() {
      const existingGoogle = (window as any).google;
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
        const g = (window as any).google;
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
        <div className="text-text-muted text-sm animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  if (err) return <ErrorBanner message={err} />;
  if (!data) return <div className="text-text-muted">No data available.</div>;

  const maxVelocity = Math.max(...(data.velocity ?? []).map((v) => v.count), 1);
  const pipelineEntries = Object.entries(data.pipelineCountsLabeled).sort(([, a], [, b]) => b - a);
  const timeEntries = Object.entries(data.timeInStage).filter(([, v]) => v.samples > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Analytics</h1>
        <p className="text-sm text-text-muted mt-0.5">Data-driven insights for your job search</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
        <StatCard label="Total Apps" value={data.summary.totalApplications} />
        <StatCard label="Response Rate" value={`${(data.summary.responseRate * 100).toFixed(0)}%`} />
        <StatCard label="Responded" value={data.summary.respondedApplications} />
        <StatCard label="Terminal" value={data.funnel.terminalOutcomes} />
      </div>

      {/* Conversion funnel */}
      <Card>
        <h2 className="text-sm font-semibold text-text-primary mb-4">Conversion Funnel</h2>
        <div className="space-y-3">
          {[
            { label: "Applied", count: data.funnel.applied, pct: 100 },
            { label: "Screen", count: data.funnel.screen, pct: data.funnel.applied ? (data.funnel.screen / data.funnel.applied) * 100 : 0 },
            { label: "Interview", count: data.funnel.interview, pct: data.funnel.applied ? (data.funnel.interview / data.funnel.applied) * 100 : 0 },
            { label: "Offer", count: data.funnel.offer, pct: data.funnel.applied ? (data.funnel.offer / data.funnel.applied) * 100 : 0 },
          ].map((stage) => (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-text-secondary">{stage.label}</span>
                <span className="text-xs font-mono text-text-muted">{stage.count} ({stage.pct.toFixed(0)}%)</span>
              </div>
              <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
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
          <h2 className="text-sm font-semibold text-text-primary mb-3">Stage Conversion Rates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.conversionRates.map((cr) => (
              <div key={`${cr.from}-${cr.to}`} className="text-center p-3 rounded-lg bg-surface-2">
                <p className="text-xs text-text-muted mb-1">{cr.from} &rarr; {cr.to}</p>
                <p className="text-2xl font-bold font-[family-name:var(--font-geist-mono)] text-text-primary">
                  {(cr.rate * 100).toFixed(0)}%
                </p>
                <p className="text-[10px] text-text-muted mt-1">{cr.numerator} / {cr.denominator}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Two column: Pipeline + Time in Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold text-text-primary mb-3">Pipeline Breakdown</h2>
          <div className="space-y-2">
            {pipelineEntries.map(([label, count]) => {
              const maxCount = Math.max(...pipelineEntries.map(([, c]) => c), 1);
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-28 shrink-0 truncate">{label}</span>
                  <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent/60 rounded-full"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-text-muted w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-text-primary mb-3">Avg Time in Stage</h2>
          {timeEntries.length === 0 ? (
            <p className="text-sm text-text-muted">Not enough data yet.</p>
          ) : (
            <div className="space-y-2">
              {timeEntries.map(([stage, info]) => {
                const days = info.avgHours / 24;
                return (
                  <div key={stage} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-xs text-text-secondary">{stage}</span>
                    <div className="text-right">
                      <span className="text-sm font-mono text-text-primary">{days.toFixed(1)}d</span>
                      <span className="text-[10px] text-text-muted ml-1.5">({info.samples} samples)</span>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          <h2 className="text-sm font-semibold text-text-primary mb-3">Source Effectiveness</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border">
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
                      <td className="py-2 px-2 text-right font-mono text-text-secondary">{stats.total}</td>
                      <td className="py-2 px-2 text-right font-mono text-text-secondary">{stats.responded}</td>
                      <td className="py-2 px-2 text-right font-mono text-text-secondary">{stats.interviewed}</td>
                      <td className="py-2 px-2 text-right font-mono text-text-secondary">{stats.offered}</td>
                      <td className="py-2 pl-2 text-right font-mono text-accent-text font-semibold">
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
          <h2 className="text-sm font-semibold text-text-primary mb-3">Resume Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium">Resume</th>
                  <th className="text-right py-2 px-2 font-medium">Apps Sent</th>
                  <th className="text-right py-2 px-2 font-medium">Responded</th>
                  <th className="text-right py-2 pl-2 font-medium">Response Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.resumeStats.map((rs, i) => (
                  <tr key={rs.resumeId} className={`border-b border-border-subtle ${i === 0 ? "bg-positive-muted/30" : ""}`}>
                    <td className="py-2 pr-4 font-medium text-text-primary">{rs.resumeLabel}</td>
                    <td className="py-2 px-2 text-right font-mono text-text-secondary">{rs.total}</td>
                    <td className="py-2 px-2 text-right font-mono text-text-secondary">{rs.responded}</td>
                    <td className="py-2 pl-2 text-right font-mono text-positive font-semibold">
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
          <h2 className="text-sm font-semibold text-text-primary mb-3">Application Velocity (12 weeks)</h2>
          <div className="flex items-end gap-1 h-[140px]">
            {data.velocity.map((week, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <span className="text-[10px] font-mono text-text-muted">{week.count || ""}</span>
                <div
                  className="w-full rounded-t-sm bg-info/50 transition-all duration-300"
                  style={{ height: `${Math.max((week.count / maxVelocity) * 100, 3)}%`, minHeight: 3 }}
                />
                <span className="text-[8px] text-text-muted truncate w-full text-center">{week.weekLabel}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sankey Chart */}
      <Card>
        <h2 className="text-sm font-semibold text-text-primary mb-3">Application Flow</h2>
        {chartErr && <ErrorBanner message={chartErr} className="mb-3" />}
        {data.sankey.googleChartRows.length === 0 ? (
          <p className="text-sm text-text-muted py-4">No transitions recorded yet.</p>
        ) : (
          <div
            id="sankey-chart"
            className="w-full rounded-lg overflow-hidden"
            style={{ minHeight: 460, background: "#0f1218" }}
          />
        )}
      </Card>

      {/* SankeyMATIC Export */}
      {data.sankey.sankeymaticText && (
        <Card>
          <h2 className="text-sm font-semibold text-text-primary mb-3">SankeyMATIC Export</h2>
          <textarea
            readOnly
            value={data.sankey.sankeymaticText}
            className="w-full min-h-[140px] bg-surface-2 text-text-secondary text-xs font-mono border border-border rounded-lg p-3 resize-y focus-ring"
          />
        </Card>
      )}
    </div>
  );
}
