'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface StageDetail {
  id: string;
  num: string;
  title: string;
  desc: string;
  color: string;
  bg: string;
  metric: string;
  features: string[];
}

export const STAGE_DETAILS: StageDetail[] = [
  {
    id: 'applied',
    num: '01',
    title: 'Applied',
    desc: 'Every application is a row in your pipeline \u2014 resume version, portal URL, recruiter name, comp band. One source of truth so you never ask "wait, which resume did I send?"',
    color: 'oklch(0.42 0.08 230)',
    bg: 'oklch(0.91 0.03 230)',
    metric: '2.1 min avg. logging time',
    features: ['Resume versioning', 'Application timeline', 'Custom tags & filters'],
  },
  {
    id: 'screen',
    num: '02',
    title: 'Phone Screen',
    desc: 'Recruiter chats, hiring-manager intros, take-homes. Log who you spoke with, what they asked, and when to follow up \u2014 so you spend zero brainpower on logistics.',
    color: 'oklch(0.48 0.10 70)',
    bg: 'oklch(0.93 0.05 80)',
    metric: '63% screen \u2192 onsite rate',
    features: ['Interviewer log', 'Follow-up reminders', 'Take-home tracking'],
  },
  {
    id: 'onsite',
    num: '03',
    title: 'Onsite',
    desc: 'The big loops. Track every panel and every round. Replay the day afterwards and see which kinds of rounds you crush \u2014 and which need work.',
    color: 'oklch(0.45 0.08 300)',
    bg: 'oklch(0.92 0.03 300)',
    metric: '33% onsite \u2192 offer rate',
    features: ['Round-by-round log', 'Panel notes', 'Thank-you drafts'],
  },
  {
    id: 'offer',
    num: '04',
    title: 'Offer',
    desc: 'Side-by-side comp comparisons and a clear-eyed view of total comp across equity, signing, and base \u2014 so you negotiate from data, not gut feel.',
    color: 'oklch(0.42 0.14 38)',
    bg: 'oklch(0.88 0.06 40)',
    metric: '+$18k avg. negotiation uplift',
    features: ['TC calculator', 'Side-by-side comparison', 'Decision matrix'],
  },
];

const CYCLE_DURATION_MS = 5000;
const HOVER_PAUSE_MS = 3000;
const TIMER_RADIUS = 7;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

function CircularTimer({ progress, color }: { progress: number; color: string }) {
  const offset = TIMER_CIRCUMFERENCE * (1 - progress);
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}
    >
      <circle
        cx="9"
        cy="9"
        r={TIMER_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.15"
      />
      <circle
        cx="9"
        cy="9"
        r={TIMER_RADIUS}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray={TIMER_CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 50ms linear' }}
      />
    </svg>
  );
}

function StageVisual({ stage }: { stage: StageDetail }) {
  return (
    <div className="stage-visual" style={{ background: stage.bg }}>
      <div className="stage-visual-grid" />
      <div className="stage-visual-card">
        <div className="stage-visual-card-top">
          <span className="stage-visual-tag mono" style={{ color: stage.color }}>{stage.title}</span>
          <span className="stage-visual-kebab">{'\u00B7\u00B7\u00B7'}</span>
        </div>
        <div className="stage-visual-role">
          {stage.id === 'applied' && 'Sr. PM, Platform'}
          {stage.id === 'screen' && 'Frontend Engineer'}
          {stage.id === 'onsite' && 'Data Scientist, Growth'}
          {stage.id === 'offer' && 'ML Engineer, Applied'}
        </div>
        <div className="stage-visual-company">
          <span className="kcard-logo" style={{ background: stage.color }}>
            {stage.id === 'applied' && 'R'}
            {stage.id === 'screen' && 'F'}
            {stage.id === 'onsite' && 'L'}
            {stage.id === 'offer' && 'A'}
          </span>
          <span>
            {stage.id === 'applied' && 'Ramp'}
            {stage.id === 'screen' && 'Figma'}
            {stage.id === 'onsite' && 'Linear'}
            {stage.id === 'offer' && 'Anthropic'}
          </span>
        </div>
        <div className="stage-visual-fields">
          {stage.id === 'applied' && (
            <>
              <div className="svf"><span className="svf-k mono">resume</span><span className="svf-v">maya_senior_v4.pdf</span></div>
              <div className="svf"><span className="svf-k mono">submitted</span><span className="svf-v">Apr 12 {'\u00B7'} 9:42am</span></div>
              <div className="svf"><span className="svf-k mono">comp band</span><span className="svf-v">$210k {'\u2013'} $260k</span></div>
            </>
          )}
          {stage.id === 'screen' && (
            <>
              <div className="svf"><span className="svf-k mono">when</span><span className="svf-v">Thu Apr 18 {'\u00B7'} 2:00pm</span></div>
              <div className="svf"><span className="svf-k mono">with</span><span className="svf-v">Priya S., EM</span></div>
              <div className="svf"><span className="svf-k mono">followup</span><span className="svf-v">Set for Mon</span></div>
            </>
          )}
          {stage.id === 'onsite' && (
            <>
              <div className="svf"><span className="svf-k mono">rounds</span><span className="svf-v">5 {'\u00B7'} full day loop</span></div>
              <div className="svf"><span className="svf-k mono">focus</span><span className="svf-v">SQL, exp. design, case</span></div>
              <div className="svf"><span className="svf-k mono">panel</span><span className="svf-v">PM, EM, 2 DS, VP</span></div>
            </>
          )}
          {stage.id === 'offer' && (
            <>
              <div className="svf"><span className="svf-k mono">base</span><span className="svf-v">$245,000</span></div>
              <div className="svf"><span className="svf-k mono">equity</span><span className="svf-v">$140k / yr {'\u00B7'} 4yr</span></div>
              <div className="svf"><span className="svf-k mono">signing</span><span className="svf-v">$40,000</span></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function StagesSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cycleStartRef = useRef(0);
  const elapsedBeforePauseRef = useRef(0);
  const rafRef = useRef<number>(0);

  const current = STAGE_DETAILS[activeIdx];

  const advanceStage = useCallback(() => {
    setActiveIdx(prev => (prev + 1) % STAGE_DETAILS.length);
    setProgress(0);
    cycleStartRef.current = performance.now();
    elapsedBeforePauseRef.current = 0;
  }, []);

  // Animation frame loop for smooth timer progress
  useEffect(() => {
    if (!cycleStartRef.current) cycleStartRef.current = performance.now();
    const tick = () => {
      if (!paused) {
        const elapsed = elapsedBeforePauseRef.current + (performance.now() - cycleStartRef.current);
        const p = Math.min(1, elapsed / CYCLE_DURATION_MS);
        setProgress(p);
        if (p >= 1) {
          advanceStage();
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, advanceStage]);

  const handleMouseEnter = useCallback((idx: number) => {
    // Clear any pending resume timer
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    // Pause timer and save elapsed progress
    elapsedBeforePauseRef.current += performance.now() - cycleStartRef.current;
    setPaused(true);
    // Switch to hovered stage, reset progress for it
    setActiveIdx(idx);
    setProgress(0);
    elapsedBeforePauseRef.current = 0;
  }, []);

  const handleMouseLeave = useCallback(() => {
    // After leaving, wait a few seconds then resume auto-cycling
    pauseTimerRef.current = setTimeout(() => {
      cycleStartRef.current = performance.now();
      elapsedBeforePauseRef.current = 0;
      setPaused(false);
      pauseTimerRef.current = null;
    }, HOVER_PAUSE_MS);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  return (
    <div className="stages">
      <div className="stages-rail">
        {STAGE_DETAILS.map((s, i) => (
          <button
            key={s.id}
            className={`stage-pill ${activeIdx === i ? 'is-active' : ''}`}
            onClick={() => handleMouseEnter(i)}
            onMouseEnter={() => handleMouseEnter(i)}
            onMouseLeave={handleMouseLeave}
            style={{
              '--stage-color': s.color,
              '--stage-bg': s.bg,
            } as React.CSSProperties}
          >
            {activeIdx === i && (
              <CircularTimer
                progress={paused ? 0 : progress}
                color={s.color}
              />
            )}
            <span className="stage-pill-num mono">{s.num}</span>
            <span className="stage-pill-label">{s.title}</span>
            <span className="stage-pill-arrow">
              {i < STAGE_DETAILS.length - 1 && (
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5h10m0 0L7 1m4 4L7 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="stages-detail" key={current.id}>
        <div className="stages-detail-left">
          <div className="stages-num serif" style={{ color: current.color }}>{current.num}</div>
          <h3 className="stages-title serif">{current.title}</h3>
          <p className="stages-desc">{current.desc}</p>
          <ul className="stages-features">
            {current.features.map(f => (
              <li key={f}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: current.color }}>
                  <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                  <path d="M4 7.5l2 2 4-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <div className="stages-metric" style={{ background: current.bg, color: current.color }}>
            <span className="stages-metric-label mono">BENCHMARK</span>
            <span className="stages-metric-value">{current.metric}</span>
          </div>
        </div>
        <div className="stages-detail-right">
          <StageVisual stage={current} />
        </div>
      </div>
    </div>
  );
}
