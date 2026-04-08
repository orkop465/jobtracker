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

/** The 10 stages of the full pipeline (anatomy section, §5.3). */
export interface AnatomyStage {
  key: string;
  label: string;
  terminal: boolean;
  /** Median conversion rate as a decimal 0-1. Null for terminal stages. */
  medianConversion: number | null;
  medianDaysInStage: number | null;
}

export const ANATOMY_STAGES: readonly AnatomyStage[] = [
  { key: 'APPLIED',          label: 'Applied',          terminal: false, medianConversion: 0.25, medianDaysInStage: 5 },
  { key: 'RECRUITER_SCREEN', label: 'Recruiter Screen', terminal: false, medianConversion: 0.71, medianDaysInStage: 3 },
  { key: 'OA',               label: 'OA',               terminal: false, medianConversion: 0.54, medianDaysInStage: 4 },
  { key: 'INTERVIEW_ROUND_1',label: 'Interview R1',     terminal: false, medianConversion: 0.45, medianDaysInStage: 6 },
  { key: 'INTERVIEW_ROUND_2',label: 'Interview R2',     terminal: false, medianConversion: 0.38, medianDaysInStage: 9 },
  { key: 'INTERVIEW_ROUND_3',label: 'Interview R3',     terminal: false, medianConversion: 0.44, medianDaysInStage: 7 },
  { key: 'OFFER',            label: 'Offer',            terminal: false, medianConversion: 1.0,  medianDaysInStage: 2 },
  { key: 'REJECTED',         label: 'Rejected',         terminal: true,  medianConversion: null, medianDaysInStage: null },
  { key: 'WITHDRAWN',        label: 'Withdrawn',        terminal: true,  medianConversion: null, medianDaysInStage: null },
  { key: 'GHOSTED',          label: 'Ghosted',          terminal: true,  medianConversion: null, medianDaysInStage: null },
] as const;
