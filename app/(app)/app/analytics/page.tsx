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
  timeInStage: Record<string, { avgHours: number; samples: number }>;
  sankey: {
    nodes: Array<{ id: string; label: string }>;
    links: Array<{ source: string; target: string; value: number }>;
  };
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
              {JSON.stringify(data.pipelineCounts, null, 2)}
            </pre>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Time In Stage</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(data.timeInStage, null, 2)}
            </pre>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Sankey Data</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(data.sankey, null, 2)}
            </pre>
          </section>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <Link href="/app">Back to dashboard</Link>
      </div>
    </main>
  );
}
