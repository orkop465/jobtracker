'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  JOURNEY_TEMPLATES,
  JOURNEY_INTERVIEWERS,
  JOURNEY_DATES,
  JOURNEY_TIMES,
  JOURNEY_COMP_BANDS,
  JOURNEY_BASES,
  JOURNEY_EQUITIES,
  JOURNEY_SIGNINGS,
  JOURNEY_FOCUSES,
  JOURNEY_PANELS,
  JOURNEY_ROUNDS,
  JOURNEY_FOLLOWUPS,
  JOURNEY_STAGE_TAGS,
  JOURNEY_BENCHMARKS,
  JOURNEY_DOT_COLORS,
  JOURNEY_OUTCOME_THRESHOLDS,
  JOURNEY_TIMING,
} from '@/lib/landing/design-board-data';
import { STAGE_DETAILS } from '@/components/landing/stages';

/* ── Helpers ── */

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

/* ── Stage-specific field generators ── */

interface FieldRow { key: string; value: string }

function fieldsForStage(stageIdx: number, templateIdx: number): FieldRow[] {
  const s = templateIdx + stageIdx;
  const t = JOURNEY_TEMPLATES[templateIdx];
  switch (stageIdx) {
    case 0: // Applied
      return [
        { key: 'resume', value: t.resume },
        { key: 'submitted', value: `${pick(JOURNEY_DATES, s)} · ${pick(JOURNEY_TIMES, s + 1)}` },
        { key: 'comp band', value: pick(JOURNEY_COMP_BANDS, s + 2) },
      ];
    case 1: // Screen
      return [
        { key: 'when', value: `${pick(JOURNEY_DATES, s + 3)} · ${pick(JOURNEY_TIMES, s + 4)}` },
        { key: 'with', value: pick(JOURNEY_INTERVIEWERS, s + 5) },
        { key: 'followup', value: pick(JOURNEY_FOLLOWUPS, s + 6) },
      ];
    case 2: // Onsite
      return [
        { key: 'rounds', value: pick(JOURNEY_ROUNDS, s + 7) },
        { key: 'focus', value: pick(JOURNEY_FOCUSES, s + 8) },
        { key: 'panel', value: pick(JOURNEY_PANELS, s + 9) },
      ];
    case 3: // Offer
      return [
        { key: 'base', value: pick(JOURNEY_BASES, s + 10) },
        { key: 'equity', value: `${pick(JOURNEY_EQUITIES, s + 11)} · 4yr` },
        { key: 'signing', value: pick(JOURNEY_SIGNINGS, s + 12) },
      ];
    default:
      return [];
  }
}

function tagsForStage(stageIdx: number): string[] {
  const id = STAGE_DETAILS[stageIdx]?.id;
  return JOURNEY_STAGE_TAGS[id] ?? [];
}

function benchmarkForStage(stageIdx: number, seed: number): string {
  const id = STAGE_DETAILS[stageIdx]?.id;
  const options = JOURNEY_BENCHMARKS[id] ?? [];
  return options.length ? pick(options, seed) : '';
}

/* ── State model ── */

interface EpisodeState {
  templateIndex: number;
  activeStageIndex: number;
  finalStageIndex: number;
  outcome: 'offer' | 'rejected';
  phase: 'hold' | 'transitioning' | 'revealing-rejection' | 'between-episodes';
}

function decideFinalStage(): { finalStageIndex: number; outcome: 'offer' | 'rejected' } {
  const t = JOURNEY_OUTCOME_THRESHOLDS;
  const r = Math.random();
  if (r < t.rejectedAtApplied) return { finalStageIndex: 0, outcome: 'rejected' };
  if (r < t.rejectedAtScreen)  return { finalStageIndex: 1, outcome: 'rejected' };
  if (r < t.rejectedAtOnsite)  return { finalStageIndex: 2, outcome: 'rejected' };
  return { finalStageIndex: 3, outcome: 'offer' };
}

/* ── Shuffle utility ── */

function shuffled<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── Component ── */

export function CardJourney() {
  const [episode, setEpisode] = useState<EpisodeState | null>(() => {
    const templateIndex = Math.floor(Math.random() * JOURNEY_TEMPLATES.length);
    const { finalStageIndex, outcome } = decideFinalStage();
    return { templateIndex, activeStageIndex: 0, finalStageIndex, outcome, phase: 'hold' };
  });
  const [fields, setFields] = useState<FieldRow[]>(() =>
    episode ? fieldsForStage(0, episode.templateIndex) : []
  );
  const [contentVisible, setContentVisible] = useState(true);
  const [cardFadedIn, setCardFadedIn] = useState(false);
  const orderRef = useRef<number[]>([]);
  const orderIdxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCardFadedIn(true));
    });
  }, []);

  const nextTemplateIndex = useCallback((): number => {
    if (orderRef.current.length === 0 || orderIdxRef.current >= orderRef.current.length) {
      orderRef.current = shuffled(JOURNEY_TEMPLATES.map((_, i) => i));
      orderIdxRef.current = 0;
    }
    return orderRef.current[orderIdxRef.current++];
  }, []);

  const startEpisode = useCallback(() => {
    const templateIndex = nextTemplateIndex();
    const { finalStageIndex, outcome } = decideFinalStage();
    const newEpisode: EpisodeState = {
      templateIndex,
      activeStageIndex: 0,
      finalStageIndex,
      outcome,
      phase: 'hold',
    };
    setCardFadedIn(false);
    setEpisode(newEpisode);
    setFields(fieldsForStage(0, templateIndex));
    setContentVisible(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCardFadedIn(true));
    });
  }, [nextTemplateIndex]);

  // Main tick loop
  useEffect(() => {
    if (!episode || reducedMotion.current) return;

    const T = JOURNEY_TIMING;
    const clear = () => { if (timerRef.current) clearTimeout(timerRef.current); };

    if (episode.phase === 'hold') {
      const atFinal = episode.activeStageIndex === episode.finalStageIndex;

      if (atFinal && episode.outcome === 'offer') {
        timerRef.current = setTimeout(() => {
          setEpisode(prev => prev ? { ...prev, phase: 'between-episodes' } : null);
        }, T.finalOfferHoldMs);
      } else if (atFinal && episode.outcome === 'rejected') {
        // Hold normally first, then reveal rejection
        timerRef.current = setTimeout(() => {
          setEpisode(prev => prev ? { ...prev, phase: 'revealing-rejection' } : null);
        }, T.holdMs);
      } else {
        timerRef.current = setTimeout(() => {
          setContentVisible(false);
          setEpisode(prev => prev ? { ...prev, phase: 'transitioning' } : null);
        }, T.holdMs);
      }
    } else if (episode.phase === 'revealing-rejection') {
      timerRef.current = setTimeout(() => {
        setEpisode(prev => prev ? { ...prev, phase: 'between-episodes' } : null);
      }, T.finalRejectHoldMs);
    } else if (episode.phase === 'transitioning') {
      timerRef.current = setTimeout(() => {
        setEpisode(prev => {
          if (!prev) return null;
          const next = prev.activeStageIndex + 1;
          setFields(fieldsForStage(next, prev.templateIndex));
          setContentVisible(true);
          return { ...prev, activeStageIndex: next, phase: 'hold' };
        });
      }, T.transitionMs);
    } else if (episode.phase === 'between-episodes') {
      timerRef.current = setTimeout(() => {
        startEpisode();
      }, T.betweenMs);
    }

    return clear;
  }, [episode, startEpisode]);

  if (!episode) return null;

  const template = JOURNEY_TEMPLATES[episode.templateIndex];
  const stage = STAGE_DETAILS[episode.activeStageIndex];
  const isOffer = episode.activeStageIndex === episode.finalStageIndex
    && episode.outcome === 'offer' && episode.phase === 'hold';
  const showRejection = episode.phase === 'revealing-rejection';
  const isBetween = episode.phase === 'between-episodes';
  const tags = tagsForStage(episode.activeStageIndex);
  const benchmark = benchmarkForStage(episode.activeStageIndex, episode.templateIndex);

  return (
    <div className="card-journey">
      {/* Progress dots */}
      <div className="cj-progress">
        {STAGE_DETAILS.map((s, i) => {
          let dotClass = 'cj-dot';
          if (isBetween) {
            dotClass += ' cj-dot-hollow';
          } else if (i < episode.activeStageIndex) {
            dotClass += ' cj-dot-done';
          } else if (i === episode.activeStageIndex) {
            dotClass += ' cj-dot-active';
            if (isOffer) dotClass += ' cj-dot-offer';
            if (showRejection) dotClass += ' cj-dot-rejected';
          } else if (i <= episode.finalStageIndex) {
            dotClass += ' cj-dot-upcoming';
          } else {
            dotClass += ' cj-dot-hollow';
          }
          const dotStyle: React.CSSProperties = {};
          if (!isBetween && (i <= episode.activeStageIndex || i <= episode.finalStageIndex)) {
            dotStyle['--dot-color' as string] = JOURNEY_DOT_COLORS[s.id] ?? s.color;
          }
          return (
            <div key={s.id} className="cj-step">
              {i > 0 && <div className={`cj-line${i <= episode.activeStageIndex && !isBetween ? ' cj-line-filled' : ''}${i === episode.activeStageIndex + 1 && episode.phase === 'transitioning' ? ' cj-line-filling' : ''}`} />}
              <div className={dotClass} style={dotStyle} />
              <span className="cj-dot-label mono">{s.title}</span>
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className={`cj-card ${isOffer ? 'cj-card-offer' : ''} ${showRejection ? 'cj-card-rejected' : ''} ${isBetween ? 'cj-card-between' : ''} ${cardFadedIn && !isBetween ? 'cj-card-in' : ''}`}>
        {isBetween ? (
          <div className="cj-loading">
            <div className="cj-spinner" />
            <span className="cj-loading-text mono">Loading next application...</span>
          </div>
        ) : (
          <>
            <div className="cj-card-identity">
              <span className="kcard-logo" style={{ background: stage.color }}>
                {template.company.charAt(0)}
              </span>
              <div className="cj-card-identity-text">
                <span className="cj-card-role">{template.role}</span>
                <span className="cj-card-company">{template.company}</span>
              </div>
              <span className="cj-card-stage mono" style={{ color: stage.color }}>{stage.title}</span>
            </div>

            {showRejection && (
              <div className="cj-rejection-banner">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>No longer under consideration</span>
              </div>
            )}

            <div className={`cj-card-content ${contentVisible ? 'cj-visible' : 'cj-hidden'} ${showRejection ? 'cj-content-dimmed' : ''}`}>
              <div className="cj-fields">
                {fields.map(f => (
                  <div key={f.key} className="cj-field">
                    <span className="cj-field-key mono">{f.key}</span>
                    <span className="cj-field-value">{f.value}</span>
                  </div>
                ))}
              </div>

              <div className="cj-features">
                {tags.map(f => (
                  <span key={f} className="cj-feature-tag">{f}</span>
                ))}
              </div>

              <div className="cj-metric" style={{ background: stage.bg, color: stage.color }}>
                <span className="cj-metric-label mono">BENCHMARK</span>
                <span className="cj-metric-value">{benchmark}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
