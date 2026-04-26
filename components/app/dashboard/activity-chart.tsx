"use client";

import { useEffect, useRef, useState } from "react";
import type { MonthlyActivityPoint } from "./types";

interface ActivityChartProps {
  data: MonthlyActivityPoint[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const applied = data.map((d) => d.applied);
  const responses = data.map((d) => d.responded);
  const max = Math.max(...applied, 1);
  const totalApplied = applied.reduce((s, v) => s + v, 0);
  const totalResponded = responses.reduce((s, v) => s + v, 0);
  const pct = totalApplied > 0 ? Math.round((totalResponded / totalApplied) * 100) : 0;

  const w = 360, h = 120;
  const pad = { t: 6, r: 4, b: 18, l: 4 };
  const iW = w - pad.l - pad.r, iH = h - pad.t - pad.b;
  const n = applied.length || 1;
  const xAt = (i: number) => pad.l + (i / (n - 1 || 1)) * iW;
  const yAt = (v: number) => pad.t + iH - (v / max) * iH;
  const barW = iW / n - 4;

  return (
    <div className="card" ref={ref}>
      <div className="card-head">
        <div className="card-head-left">
          <span className="card-index">[04]</span>
          <span className="card-title">This month</span>
        </div>
        <div className="mini-chart-legend">
          <span className="lg"><span className="sw" style={{ background: "var(--accent)" }} />Applied</span>
          <span className="lg"><span className="sw" style={{ background: "var(--sage)" }} />Responded</span>
        </div>
      </div>
      <div className="mini-chart">
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          {[0.33, 0.67, 1].map((p) => (
            <line
              key={p}
              x1={pad.l} x2={w - pad.r}
              y1={pad.t + iH * p} y2={pad.t + iH * p}
              stroke="var(--line)" strokeDasharray={p === 1 ? "0" : "2 3"} strokeWidth="0.8"
            />
          ))}
          {applied.map((v, i) => {
            const bh = (v / max) * iH;
            return (
              <rect
                key={i}
                x={xAt(i) - barW / 2}
                y={pad.t + iH - (inView ? bh : 0)}
                width={barW}
                height={inView ? bh : 0}
                fill="var(--accent-soft)"
                stroke="var(--accent)"
                strokeWidth="0.8"
                style={{
                  transition: `y 0.8s ${i * 30}ms cubic-bezier(0.2, 0, 0, 1), height 0.8s ${i * 30}ms cubic-bezier(0.2, 0, 0, 1)`,
                }}
              />
            );
          })}
          <path
            d={"M " + responses.map((v, i) => `${xAt(i)} ${yAt(v)}`).join(" L ")}
            fill="none"
            stroke="var(--sage)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="400"
            strokeDashoffset={inView ? 0 : 400}
            style={{ transition: "stroke-dashoffset 1s 0.5s cubic-bezier(0.2, 0, 0, 1)" }}
          />
          {responses.map((v, i) => (
            <circle
              key={i}
              cx={xAt(i)}
              cy={yAt(v)}
              r="2.2"
              fill="var(--sage)"
              style={{ opacity: inView ? 1 : 0, transition: `opacity 0.3s ${800 + i * 40}ms` }}
            />
          ))}
          {data.map((d, i) => (
            <text
              key={d.weekLabel}
              x={xAt(i)}
              y={h - 4}
              fill="var(--ink-3)"
              fontSize="9"
              textAnchor="middle"
              fontFamily="var(--font-jetbrains-mono, var(--mono))"
            >
              {d.weekLabel}
            </text>
          ))}
        </svg>
      </div>
      <div className="mini-chart-foot">
        <span>{totalApplied} applied</span>
        <span>{totalResponded} responses &middot; {pct}%</span>
      </div>
    </div>
  );
}
