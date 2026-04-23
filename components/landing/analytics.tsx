'use client';

import React, { useRef, useState, useEffect } from 'react';

// --- useInView hook ---

function useInView(ref: React.RefObject<HTMLElement | null>, opts: IntersectionObserverInit = { threshold: 0.25 }): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect(); }
    }, opts);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return inView;
}

// --- CountUp ---

function CountUp({ to, duration = 1400, suffix = '', prefix = '', decimals = 0 }: {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref);
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t0 = performance.now();
    let raf: number;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return <span ref={ref}>{prefix}{val.toFixed(decimals)}{suffix}</span>;
}

// --- StatCard ---

function StatCard({ label, value, delta, sparkline, positive = true, suffix = '', prefix = '' }: {
  label: string;
  value: number;
  delta: string;
  sparkline: number[];
  positive?: boolean;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const max = Math.max(...sparkline);
  const min = Math.min(...sparkline);
  const w = 80, h = 28;
  const pts = sparkline.map((v, i) => {
    const x = (i / (sparkline.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const pathD = 'M ' + pts.replace(/ /g, ' L ');

  return (
    <div className="stat-card" ref={ref}>
      <div className="stat-label">{label}</div>
      <div className="stat-row">
        <div className="stat-value">
          {inView && <CountUp to={value} prefix={prefix} suffix={suffix} />}
        </div>
        <svg className="stat-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <path d={pathD} fill="none" stroke={positive ? 'var(--sage)' : 'var(--accent)'} strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="200" strokeDashoffset={inView ? 0 : 200}
            style={{ transition: 'stroke-dashoffset 1s 0.2s ease-out' }} />
        </svg>
      </div>
      <div className={`stat-delta ${positive ? 'pos' : 'neg'}`}>
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d={positive ? 'M2 7l3-3 3 3' : 'M2 3l3 3 3-3'} stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {delta} vs. last month
      </div>
    </div>
  );
}

// --- FunnelChart ---

function FunnelChart() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.2 });
  const stages = [
    { label: 'Applied', count: 84, color: 'oklch(0.82 0.06 230)' },
    { label: 'Phone Screen', count: 41, color: 'oklch(0.80 0.08 200)' },
    { label: 'Take-Home', count: 28, color: 'oklch(0.78 0.09 170)' },
    { label: 'Onsite', count: 14, color: 'oklch(0.76 0.10 120)' },
    { label: 'Offer', count: 6, color: 'oklch(0.70 0.13 50)' },
  ];
  const max = stages[0].count;

  return (
    <div className="chart chart-funnel" ref={ref}>
      <div className="chart-head">
        <div>
          <div className="chart-title">Conversion funnel</div>
          <div className="chart-sub">Last 90 days across all roles</div>
        </div>
        <div className="chart-kpi">
          <span className="chart-kpi-value">7.1%</span>
          <span className="chart-kpi-label">application {'\u2192'} offer</span>
        </div>
      </div>
      <div className="funnel-rows">
        {stages.map((s, i) => {
          const pct = (s.count / max) * 100;
          const conv = i === 0 ? 100 : Math.round((s.count / stages[i - 1].count) * 100);
          return (
            <div key={s.label} className="funnel-row">
              <div className="funnel-label">{s.label}</div>
              <div className="funnel-bar-wrap">
                <div
                  className="funnel-bar"
                  style={{
                    width: inView ? `${pct}%` : '0%',
                    background: s.color,
                    transitionDelay: `${i * 80}ms`,
                  }}
                >
                  <span className="funnel-count">{s.count}</span>
                </div>
              </div>
              <span className="funnel-conv" style={{ opacity: inView && i > 0 ? 1 : 0, transitionDelay: `${i * 80 + 400}ms` }}>
                {i > 0 ? `${conv}%` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- ActivityChart ---

function ActivityChart() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.2 });

  const applications = [3, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 15];
  const responses = [0, 1, 1, 2, 2, 3, 3, 4, 5, 7, 8, 9];
  const w = 420, h = 180, pad = { top: 12, right: 8, bottom: 24, left: 28 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const max = Math.max(...applications);
  const n = applications.length;
  const xAt = (i: number) => pad.left + (i / (n - 1)) * innerW;
  const yAt = (v: number) => pad.top + innerH - (v / max) * innerH;

  const areaPath = 'M ' + applications.map((v, i) => `${xAt(i)} ${yAt(v)}`).join(' L ') + ` L ${xAt(n - 1)} ${pad.top + innerH} L ${xAt(0)} ${pad.top + innerH} Z`;
  const linePath = 'M ' + applications.map((v, i) => `${xAt(i)} ${yAt(v)}`).join(' L ');
  const respPath = 'M ' + responses.map((v, i) => `${xAt(i)} ${yAt(v)}`).join(' L ');

  return (
    <div className="chart chart-activity" ref={ref}>
      <div className="chart-head">
        <div>
          <div className="chart-title">Weekly activity</div>
          <div className="chart-sub">Applications sent vs. responses received</div>
        </div>
        <div className="chart-legend">
          <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--accent)' }} /> Applied</span>
          <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--sage)' }} /> Responded</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="activity-svg" preserveAspectRatio="none">
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <line key={p} x1={pad.left} x2={w - pad.right}
            y1={pad.top + innerH * p} y2={pad.top + innerH * p}
            stroke="var(--line)" strokeDasharray={p === 1 ? '0' : '2 3'} strokeWidth="1" />
        ))}
        {/* Y labels */}
        {[0, 0.5, 1].map(p => (
          <text key={p} x={pad.left - 6} y={pad.top + innerH * (1 - p) + 3}
            fill="var(--ink-3)" fontSize="9" textAnchor="end" fontFamily="var(--mono)">
            {Math.round(max * p)}
          </text>
        ))}
        {/* Area under applied */}
        <defs>
          <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.62 0.15 40)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="oklch(0.62 0.15 40)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGrad)"
          style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.8s 0.3s' }} />
        {/* Response line */}
        <path d={respPath} fill="none" stroke="var(--sage)" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="500" strokeDashoffset={inView ? 0 : 500}
          style={{ transition: 'stroke-dashoffset 1.2s 0.5s cubic-bezier(0.2,0,0,1)' }} />
        {/* Applied line */}
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="500" strokeDashoffset={inView ? 0 : 500}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.2,0,0,1)' }} />
        {/* End dots */}
        <circle cx={xAt(n - 1)} cy={yAt(applications[n - 1])} r="3.5" fill="var(--accent)"
          style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.3s 1.3s' }} />
        <circle cx={xAt(n - 1)} cy={yAt(responses[n - 1])} r="3" fill="var(--sage)"
          style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.3s 1.5s' }} />
        {/* X labels */}
        {['12w', '8w', '4w', 'now'].map((lbl, i) => (
          <text key={lbl}
            x={pad.left + (innerW * i / 3)}
            y={h - 6}
            fill="var(--ink-3)" fontSize="9" textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}
            fontFamily="var(--mono)">{lbl}</text>
        ))}
      </svg>
    </div>
  );
}

// --- SourceBreakdown ---

function SourceBreakdown() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const sources = [
    { label: 'Referral', outcome: 28, total: 34, hue: 40 },
    { label: 'Recruiter reach', outcome: 18, total: 41, hue: 230 },
    { label: 'LinkedIn apply', outcome: 9, total: 52, hue: 200 },
    { label: 'Job board', outcome: 4, total: 38, hue: 80 },
    { label: 'Cold outreach', outcome: 7, total: 14, hue: 150 },
  ];

  return (
    <div className="chart chart-sources" ref={ref}>
      <div className="chart-head">
        <div>
          <div className="chart-title">Outcome by source</div>
          <div className="chart-sub">Response rate across channels</div>
        </div>
      </div>
      <div className="sources-rows">
        {sources.map((s, i) => {
          const pct = Math.round((s.outcome / s.total) * 100);
          return (
            <div key={s.label} className="sources-row">
              <div className="sources-label">{s.label}</div>
              <div className="sources-track">
                <div
                  className="sources-bar"
                  style={{
                    width: inView ? `${pct}%` : '0%',
                    background: `oklch(0.75 0.09 ${s.hue})`,
                    transitionDelay: `${i * 70}ms`,
                  }}
                />
              </div>
              <div className="sources-num mono">
                <span className="sources-pct">{pct}%</span>
                <span className="sources-count">{s.outcome}/{s.total}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="sources-insight">
        <span className="insight-dot" />
        <span><strong>Referrals convert 4.2{'\u00D7'}</strong> better than job boards. Your warm network is your best asset.</span>
      </div>
    </div>
  );
}

// --- AnalyticsSection ---

export function AnalyticsSection() {
  return (
    <div className="analytics">
      <div className="analytics-top">
        <StatCard
          label="Response rate"
          value={31}
          suffix="%"
          delta="+8pts"
          sparkline={[12, 14, 18, 15, 22, 24, 28, 31]}
          positive
        />
        <StatCard
          label="Avg. time to reply"
          value={4.2}
          suffix="d"
          delta="-1.3d"
          sparkline={[7, 7.2, 6.8, 6.1, 5.5, 5.0, 4.6, 4.2]}
          positive
        />
        <StatCard
          label="Onsites landed"
          value={14}
          delta="+5"
          sparkline={[4, 5, 6, 8, 9, 11, 12, 14]}
          positive
        />
        <StatCard
          label="Days in pipeline"
          value={19}
          suffix="d"
          delta="-4d"
          sparkline={[28, 27, 25, 23, 22, 20, 19, 19]}
          positive
        />
      </div>

      <div className="analytics-grid">
        <FunnelChart />
        <ActivityChart />
        <SourceBreakdown />
      </div>
    </div>
  );
}
