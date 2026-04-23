'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import {
  type DemoStage,
  BOARD_TEMPLATES,
  BOARD_COMPANY_COLORS,
  BOARD_DEFAULT_COLOR,
  DEMO_STAGES,
  DEMO_TAGS,
  DEMO_SALARIES,
  boardShuffle,
  pickDemoNote,
} from '@/lib/landing/design-board-data';

// --- Types ---

interface DemoCardData {
  id: string;
  role: string;
  company: string;
  color: string;
  tag: string;
  resume: string;
  salary: string;
  note: string;
  stage: string;
  days: number;
}

// --- Card generation ---

function generateInitStageDist(): string[] {
  const stages = DEMO_STAGES.map((s: DemoStage) => s.id);
  const total = 8 + Math.floor(Math.random() * 5);
  const dist = [...stages]; // 1 per column minimum
  for (let i = stages.length; i < total; i++) dist.push(stages[Math.floor(Math.random() * stages.length)]);
  return boardShuffle(dist);
}

function generateCards(): DemoCardData[] {
  const templates = boardShuffle(BOARD_TEMPLATES);
  const stages = generateInitStageDist();
  return stages.map((stage, i) => {
    const t = templates[i % templates.length];
    const tags = DEMO_TAGS[stage] ?? ['Applied'];
    return {
      id: 'd' + (i + 1),
      role: t.role,
      company: t.company,
      color: t.color,
      tag: tags[Math.floor(Math.random() * tags.length)],
      resume: t.resume,
      salary: DEMO_SALARIES[Math.floor(Math.random() * DEMO_SALARIES.length)],
      note: pickDemoNote(stage),
      stage,
      days: Math.floor(Math.random() * 30) + 1,
    };
  });
}

// --- Components ---

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number>(0);
  const displayRef = useRef(value);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const start = displayRef.current;
    const end = value;
    if (start === end) return;
    const t0 = performance.now();
    const dur = 400;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <span>{display}</span>;
}

function FlipCard({ id, flipKey, children, highlighted }: {
  id: string;
  flipKey: string;
  children: React.ReactNode;
  highlighted: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prevRect = useRef<DOMRect | null>(null);
  const prevKey = useRef(flipKey);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (prevRect.current && prevKey.current !== flipKey) {
      const dx = prevRect.current.left - rect.left;
      const dy = prevRect.current.top - rect.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(1.03)`, boxShadow: '0 18px 36px oklch(0.22 0.02 60 / 0.14)', zIndex: '10' },
            { transform: 'translate(0, 0) scale(1)', zIndex: '10' },
          ],
          { duration: 500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
        );
      }
    }
    prevRect.current = rect;
    prevKey.current = flipKey;
  });

  return (
    <div ref={ref} className={`flip-card ${highlighted ? 'is-moving' : ''}`} data-id={id}>
      {children}
    </div>
  );
}

function DemoCard({ card, onDragStart, onDragEnd, isDragging }: {
  card: DemoCardData;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const color = card.color || BOARD_COMPANY_COLORS[card.company] || BOARD_DEFAULT_COLOR;
  const initial = card.company[0];
  return (
    <div
      className={`demo-card ${isDragging ? 'is-dragging' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onDragEnd={onDragEnd}
    >
      <div className="demo-card-top">
        <div className="demo-card-role">{card.role}</div>
      </div>
      <div className="demo-card-company">
        <span className="kcard-logo" style={{ background: color }}>{initial}</span>
        <span>{card.company}</span>
        <span className="demo-card-salary">{card.salary}</span>
      </div>
      {card.resume && (
        <div className="demo-card-resume">
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
            <path d="M1.5 1.5h5l2 2v7h-7v-9z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
            <path d="M6.5 1.5v2h2" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          <span>{card.resume}</span>
        </div>
      )}
      {card.note && <div className="demo-card-note">{card.note}</div>}
      <div className="demo-card-foot">
        <span className="demo-card-tag">{card.tag}</span>
        <span className="demo-card-days">
          {card.days === 0 ? 'new' : `${card.days}d`}
        </span>
      </div>
    </div>
  );
}

export function DemoBoardSection() {
  const [cards, setCards] = useState(generateCards);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ stage: string; index: number } | null>(null);
  const [lastMoved, setLastMoved] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', id); } catch { /* noop */ }
  };
  const onDragEnd = () => { setDraggingId(null); setDropTarget(null); };

  const onColDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const colEl = e.currentTarget as HTMLElement;
    const cardEls = colEl.querySelectorAll('.demo-card-slot');
    const y = e.clientY;
    let index = cardEls.length;
    for (let i = 0; i < cardEls.length; i++) {
      const r = cardEls[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) { index = i; break; }
    }
    setDropTarget(prev => (prev && prev.stage === stageId && prev.index === index) ? prev : { stage: stageId, index });
  };

  const onDragLeave = (e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDropTarget(null);
  };

  const onDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (!draggingId || !dropTarget) { setDropTarget(null); setDraggingId(null); return; }

    setCards(prev => {
      const without = prev.filter(c => c.id !== draggingId);
      const dragged = prev.find(c => c.id === draggingId);
      if (!dragged) return prev;
      const updated = { ...dragged, stage: stageId, note: pickDemoNote(stageId) };

      const targetCardsInStage = without.filter(c => c.stage === stageId);
      const idx = Math.min(dropTarget.index, targetCardsInStage.length);
      const insertBeforeCard = idx < targetCardsInStage.length ? targetCardsInStage[idx] : null;

      const result: DemoCardData[] = [];
      let inserted = false;
      for (const c of without) {
        if (!inserted && insertBeforeCard && c.id === insertBeforeCard.id) {
          result.push(updated);
          inserted = true;
        }
        result.push(c);
      }
      if (!inserted) result.push(updated);
      return result;
    });

    setLastMoved(draggingId);
    setDropTarget(null);
    setDraggingId(null);
    setTimeout(() => setLastMoved(null), 900);
  };

  const addCard = useCallback((stageId: string) => {
    const idx = Math.floor(Math.random() * BOARD_TEMPLATES.length);
    const t = BOARD_TEMPLATES[idx];
    const salaryIdx = Math.floor(Math.random() * DEMO_SALARIES.length);
    const newCard: DemoCardData = {
      id: 'new-' + Date.now(),
      role: t.role,
      company: t.company,
      color: t.color,
      tag: 'Applied',
      resume: t.resume,
      salary: DEMO_SALARIES[salaryIdx],
      note: pickDemoNote(stageId),
      stage: stageId,
      days: 0,
    };
    setCards(prev => [...prev, newCard]);
    setJustAdded(newCard.id);
    setLastMoved(newCard.id);
    setTimeout(() => setJustAdded(null), 700);
    setTimeout(() => setLastMoved(null), 900);
  }, []);

  const reset = useCallback(() => {
    setCards(generateCards());
  }, []);

  const byStage = useMemo(() => {
    const grouped: Record<string, DemoCardData[]> = {};
    DEMO_STAGES.forEach((s: { id: string }) => { grouped[s.id] = []; });
    cards.forEach(c => { if (grouped[c.stage]) grouped[c.stage].push(c); });
    return grouped;
  }, [cards]);

  return (
    <div className="demo-board-wrap">
      <div className="demo-board-chrome">
        <div className="demo-board-chrome-left">
          <span className="chrome-dot" style={{ background: 'oklch(0.75 0.14 25)' }} />
          <span className="chrome-dot" style={{ background: 'oklch(0.80 0.12 80)' }} />
          <span className="chrome-dot" style={{ background: 'oklch(0.72 0.12 150)' }} />
          <span className="chrome-title">maakavoda.app/board <span className="chrome-sep">/</span> Spring 2026 Search</span>
        </div>
        <div className="demo-board-chrome-right">
          <span className="chrome-badge">
            <span className="chrome-live-dot" /> Live
          </span>
          <button className="chrome-reset" onClick={reset}>Reset demo</button>
        </div>
      </div>

      <div className="demo-board-toolbar">
        <div className="toolbar-stats">
          <div className="toolbar-stat">
            <span className="toolbar-stat-label">Active</span>
            <span className="toolbar-stat-value" suppressHydrationWarning><AnimatedNumber value={cards.length} /></span>
          </div>
          <div className="toolbar-stat">
            <span className="toolbar-stat-label">In flight</span>
            <span className="toolbar-stat-value" suppressHydrationWarning><AnimatedNumber value={cards.filter(c => ['applied', 'screen', 'onsite'].includes(c.stage)).length} /></span>
          </div>
          <div className="toolbar-stat">
            <span className="toolbar-stat-label">Offers</span>
            <span className="toolbar-stat-value accent" suppressHydrationWarning><AnimatedNumber value={cards.filter(c => c.stage === 'offer').length} /></span>
          </div>
        </div>
        <div className="toolbar-hint mono">
          <kbd>drag</kbd> a card to move it between columns
        </div>
      </div>

      <div className="demo-board">
        {DEMO_STAGES.map((stage: DemoStage) => (
          <div
            key={stage.id}
            className={`demo-col ${dropTarget && dropTarget.stage === stage.id ? 'is-hover' : ''} ${draggingId ? 'is-dragging-any' : ''}`}
            onDragOver={(e) => onColDragOver(e, stage.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, stage.id)}
          >
            <div className="demo-col-head">
              <div className="demo-col-head-top">
                <div className="kcol-head-left">
                  <span className="kcol-dot" style={{ background: stage.accent }} />
                  <span className="demo-col-title">{stage.label}</span>
                </div>
                <span className="kcol-count" suppressHydrationWarning>{byStage[stage.id].length}</span>
              </div>
              <div className="demo-col-hint">{stage.hint}</div>
            </div>
            <div className="demo-col-body">
              {byStage[stage.id].map((c, i) => (
                <React.Fragment key={c.id}>
                  {dropTarget && dropTarget.stage === stage.id && dropTarget.index === i && draggingId !== c.id && (
                    <div className="drop-indicator" />
                  )}
                  <div className={"demo-card-slot" + (justAdded === c.id ? " is-just-added" : "")}>
                    <FlipCard id={c.id} flipKey={c.stage} highlighted={lastMoved === c.id}>
                      <DemoCard
                        card={c}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        isDragging={draggingId === c.id}
                      />
                    </FlipCard>
                  </div>
                </React.Fragment>
              ))}
              {dropTarget && dropTarget.stage === stage.id && dropTarget.index >= byStage[stage.id].length && (
                <div className="drop-indicator" />
              )}
              <button className="demo-add" onClick={() => addCard(stage.id)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Add role
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
