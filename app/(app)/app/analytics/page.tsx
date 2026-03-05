"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
          setData(null);
          return;
        }
        setData(body as AnalyticsPayload);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        height: 520,
        tooltip: { trigger: "none" },
        backgroundColor: "#f3f3f3",
        sankey: {
          node: {
            width: 16,
            nodePadding: 28,
            colors: [
              "#b8aea8",
              "#88bfc0",
              "#5ca85a",
              "#2f6aa3",
              "#e14f56",
              "#f39a2e",
              "#d9bf3d",
              "#a8739b",
            ],
            label: {
              color: "#111111",
              fontSize: 16,
              bold: true,
            },
          },
          link: {
            colorMode: "source",
            color: { fillOpacity: 0.5 },
          },
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
        if (!g?.charts) {
          setChartErr("Failed to initialize Google Charts.");
          return;
        }
        g.charts.load("current", { packages: ["sankey"] });
        g.charts.setOnLoadCallback(draw);
      };
      script.onerror = () => setChartErr("Failed to load Google Charts script.");
      document.head.appendChild(script);
    }

    ensureGoogleChartsLoaded();

    return () => {
      cancelled = true;
    };
  }, [data]);

  return (
    <main style={{ maxWidth: 980, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 10 }}>Analytics</h1>

      {loading && <div>Loading...</div>}
      {err && <div style={{ color: "crimson" }}>{err}</div>}

      {!loading && data && (
        <div style={{ display: "grid", gap: 18 }}>
          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Summary</h2>
            <div>Total applications: {data.summary.totalApplications}</div>
            <div>Responded applications: {data.summary.respondedApplications}</div>
            <div>Response rate: {(data.summary.responseRate * 100).toFixed(1)}%</div>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Funnel</h2>
            <div>Applied: {data.funnel.applied}</div>
            <div>Screen: {data.funnel.screen}</div>
            <div>Interview: {data.funnel.interview}</div>
            <div>Offer: {data.funnel.offer}</div>
            <div>Terminal outcomes: {data.funnel.terminalOutcomes}</div>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Pipeline Counts</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(data.pipelineCountsLabeled, null, 2)}
            </pre>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Time In Stage</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(data.timeInStage, null, 2)}
            </pre>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Sankey Chart</h2>
            {chartErr && <div style={{ color: "crimson", marginBottom: 8 }}>{chartErr}</div>}
            {data.sankey.googleChartRows.length === 0 ? (
              <div style={{ opacity: 0.8 }}>No transitions yet.</div>
            ) : (
              <div
                id="sankey-chart"
                style={{
                  width: "100%",
                  maxWidth: 940,
                  minHeight: 520,
                  background: "#f3f3f3",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 6,
                }}
              />
            )}
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              SankeyMATIC Export
            </h2>
            <textarea
              readOnly
              value={data.sankey.sankeymaticText}
              style={{ width: "100%", minHeight: 180, fontFamily: "monospace" }}
            />
          </section>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <Link href="/app">Back to dashboard</Link>
      </div>
    </main>
  );
}
