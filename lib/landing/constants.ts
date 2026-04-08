/**
 * Hardcoded synthetic data for the landing page.
 * All numbers are illustrative. See spec §7 for the data source decision.
 */

/** The 5 hero stage columns in display order. */
export const HERO_STAGES = ['applied', 'screen', 'interview', 'final', 'offer'] as const;
export type HeroStage = (typeof HERO_STAGES)[number];

/** Additional column identifier used only for dropped-off cards. */
export const DROPOFF = 'dropoff' as const;
export type ColumnId = HeroStage | typeof DROPOFF;

/** Human-readable column labels (uppercase-cased at render time). */
export const HERO_STAGE_LABELS: Record<HeroStage, string> = {
  applied:   'Applied',
  screen:    'Screen',
  interview: 'Interview',
  final:     'Final',
  offer:     'Offer',
};

/** Baseline counts displayed under each hero column header. */
export const HERO_BASELINE_COUNTS: Record<HeroStage, number> = {
  applied:   280,
  screen:    87,
  interview: 34,
  final:     9,
  offer:     4,
};

/** Metric strip displayed above the hero columns. */
export interface MetricStripCell {
  label: string;
  value: string;
  delta?: string;
  deltaKind?: 'up' | 'down' | 'none';
}

export const METRIC_STRIP: readonly MetricStripCell[] = [
  { label: 'Total applied',    value: '342',   delta: '+14 wk', deltaKind: 'up' },
  { label: 'Response rate',    value: '25.4%' },
  { label: 'Active pipeline',  value: '62',    delta: '+3', deltaKind: 'up' },
  { label: 'Median velocity',  value: '14d' },
  { label: 'Offers',           value: '4',     delta: '+1', deltaKind: 'up' },
] as const;

/** Proof section counters (§5.6). */
export interface ProofCounter {
  prefix?: string;
  value: number;
  suffix?: string;
  label: string;
}

export const PROOF_COUNTERS: readonly ProofCounter[] = [
  { value: 14203,                    label: 'Apps tracked' },
  { value: 1247,                     label: 'Offers landed' },
  { value: 28,                       label: 'Median days to offer' },
  { prefix: '$', value: 127, suffix: 'k', label: 'Median comp' },
] as const;

/** Rotating auth-left-panel captions (§7.2). */
export const ROTATING_CAPTIONS: readonly string[] = [
  '14,203 applications tracked',
  '1,247 offers landed',
  '28 days median to offer',
  'Referrals convert 8× better than LinkedIn',
  'Resume A/B testing built in',
] as const;

/**
 * The 10 stages of the full pipeline (anatomy section, §5.3).
 *
 * Variants:
 *   - `advance`: normal middle stage; shows "X% advance rate" + days.
 *   - `end`:     Offer — positive end of pipeline; no percentage.
 *   - `closed`:  Rejected / Withdrawn / Ghosted — application is closed.
 *
 * The advance rates multiply to ~1.18% (≈ 4 offers from 342 applications),
 * matching the hero headline "342 applications in. 4 offers out."
 * Math: 0.25 · 0.60 · 0.55 · 0.55 · 0.58 · 0.45 ≈ 0.01184.
 */
export interface AnatomyStage {
  key: string;
  label: string;
  variant: 'advance' | 'end' | 'closed';
  /** Decimal 0-1. Only present for variant 'advance'. */
  medianConversion: number | null;
  /** Median days a card sits in this stage. Only present for non-closed. */
  medianDaysInStage: number | null;
}

export const ANATOMY_STAGES: readonly AnatomyStage[] = [
  { key: 'APPLIED',           label: 'Applied',          variant: 'advance', medianConversion: 0.25, medianDaysInStage: 5 },
  { key: 'RECRUITER_SCREEN',  label: 'Recruiter Screen', variant: 'advance', medianConversion: 0.60, medianDaysInStage: 3 },
  { key: 'OA',                label: 'OA',               variant: 'advance', medianConversion: 0.55, medianDaysInStage: 4 },
  { key: 'INTERVIEW_ROUND_1', label: 'Interview R1',     variant: 'advance', medianConversion: 0.55, medianDaysInStage: 6 },
  { key: 'INTERVIEW_ROUND_2', label: 'Interview R2',     variant: 'advance', medianConversion: 0.58, medianDaysInStage: 9 },
  { key: 'INTERVIEW_ROUND_3', label: 'Interview R3',     variant: 'advance', medianConversion: 0.45, medianDaysInStage: 7 },
  { key: 'OFFER',             label: 'Offer',            variant: 'end',     medianConversion: null, medianDaysInStage: 2 },
  { key: 'REJECTED',          label: 'Rejected',         variant: 'closed',  medianConversion: null, medianDaysInStage: null },
  { key: 'WITHDRAWN',         label: 'Withdrawn',        variant: 'closed',  medianConversion: null, medianDaysInStage: null },
  { key: 'GHOSTED',           label: 'Ghosted',          variant: 'closed',  medianConversion: null, medianDaysInStage: null },
] as const;
