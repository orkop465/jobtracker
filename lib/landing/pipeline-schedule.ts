/**
 * Deterministic 90-second hero transition schedule.
 * See spec §6.1–§6.3 for the steady-state model.
 *
 * Each entry fires one card transition from `from` to `to` at time `atMs`
 * (modulo CYCLE_DURATION_MS). The schedule is authored so that after one
 * full cycle every column's population returns to its HERO_BASELINE_COUNT.
 *
 * `from: 'inflow'` is a synthetic source representing new applications
 * entering the pipeline from outside. Cards fade in at `applied`.
 * `to: 'dropoff'` means the card falls into the reject tray.
 * `to: 'inflow'` is a bookkeeping sink (offer→inflow at the cycle seam) — these
 * entries are filtered out of visual rendering by the orchestrator.
 */

import type { ColumnId } from './constants';

export type TransitionSource = ColumnId | 'inflow';
export type TransitionTarget = ColumnId | 'inflow';

export interface ScheduledTransition {
  /** Millisecond offset from the cycle start (0 ≤ atMs < CYCLE_DURATION_MS). */
  atMs: number;
  from: TransitionSource;
  to: TransitionTarget;
  /** Named SVG path to follow (keys of PATH_DEFINITIONS). */
  pathName: string;
}

export const CYCLE_DURATION_MS = 90_000;

/**
 * Hand-authored schedule. Authoring rules:
 * - Every ~2700ms (jittered 2500–3500ms) one transition fires.
 * - Cadence test enforces 1800ms ≤ gap ≤ 4200ms.
 * - Every column in HERO_STAGES must end the cycle at its baseline count
 *   (enforced by the count-conservation test). Dropoff is exempt.
 *
 * Counts (verified by hand to satisfy net=0 per HERO_STAGES column):
 *   Inflow → applied:           10
 *   Forward applied → screen:    6
 *   applied → dropoff:           4
 *   Forward screen → interview:  4
 *   screen → dropoff:            2
 *   Forward interview → final:   2
 *   interview → dropoff:         2
 *   Forward final → offer:       1
 *   final → dropoff:             1
 *   Bookkeeping offer → inflow:  1
 *
 * Net per column over one cycle:
 *   applied:   +10 - 6 - 4 = 0  ✓
 *   screen:     +6 - 4 - 2 = 0  ✓
 *   interview:  +4 - 2 - 2 = 0  ✓
 *   final:      +2 - 1 - 1 = 0  ✓
 *   offer:      +1 - 1     = 0  ✓
 *   dropoff:    +9 (visual recycling buffer; not in HERO_STAGES, exempt)
 *
 * The single bookkeeping `offer → inflow` at the seam closes the offer column.
 * The dropoff column accumulates over the cycle but is rendered as a "tray"
 * (last-N visual buffer), not a running count, so its drift is invisible.
 *
 * Total: 33 entries spread 2000ms..88900ms with regular ~2700ms gaps.
 */

export const PIPELINE_SCHEDULE: readonly ScheduledTransition[] = [
  // --- first quarter (0–22.5s) ---
  { atMs:  2_000, from: 'inflow',    to: 'applied',   pathName: 'inflow-applied' },
  { atMs:  4_700, from: 'applied',   to: 'screen',    pathName: 'applied-screen' },
  { atMs:  7_500, from: 'inflow',    to: 'applied',   pathName: 'inflow-applied' },
  { atMs: 10_200, from: 'applied',   to: 'dropoff',   pathName: 'applied-dropoff' },
  { atMs: 12_900, from: 'screen',    to: 'interview', pathName: 'screen-interview' },
  { atMs: 15_600, from: 'inflow',    to: 'applied',   pathName: 'inflow-applied' },
  { atMs: 18_300, from: 'applied',   to: 'screen',    pathName: 'applied-screen' },
  { atMs: 21_100, from: 'screen',    to: 'dropoff',   pathName: 'screen-dropoff' },
  // --- second quarter (22.5–45s) ---
  { atMs: 23_800, from: 'inflow',    to: 'applied',   pathName: 'inflow-applied' },
  { atMs: 26_500, from: 'screen',    to: 'interview', pathName: 'screen-interview' },
  { atMs: 29_200, from: 'applied',   to: 'screen',    pathName: 'applied-screen' },
  { atMs: 31_900, from: 'interview', to: 'final',     pathName: 'interview-final' },
  { atMs: 34_600, from: 'inflow',    to: 'applied',   pathName: 'inflow-applied' },
  { atMs: 37_400, from: 'applied',   to: 'dropoff',   pathName: 'applied-dropoff' },
  { atMs: 40_100, from: 'screen',    to: 'interview', pathName: 'screen-interview' },
  { atMs: 42_800, from: 'applied',   to: 'screen',    pathName: 'applied-screen' },
  { atMs: 45_500, from: 'screen',    to: 'dropoff',   pathName: 'screen-dropoff' },
  // --- third quarter (45–67.5s) ---
  { atMs: 48_200, from: 'inflow',    to: 'applied',   pathName: 'inflow-applied' },
  { atMs: 50_900, from: 'interview', to: 'dropoff',   pathName: 'interview-dropoff' },
  { atMs: 53_700, from: 'screen',    to: 'interview', pathName: 'screen-interview' },
  { atMs: 56_400, from: 'final',     to: 'offer',     pathName: 'final-offer' },
  { atMs: 59_100, from: 'inflow',    to: 'applied',   pathName: 'inflow-applied' },
  { atMs: 61_800, from: 'applied',   to: 'screen',    pathName: 'applied-screen' },
  { atMs: 64_500, from: 'applied',   to: 'dropoff',   pathName: 'applied-dropoff' },
  { atMs: 67_200, from: 'applied',   to: 'screen',    pathName: 'applied-screen' },
  // --- fourth quarter (67.5–90s) ---
  { atMs: 70_000, from: 'interview', to: 'final',     pathName: 'interview-final' },
  { atMs: 72_700, from: 'inflow',    to: 'applied',   pathName: 'inflow-applied' },
  { atMs: 75_400, from: 'interview', to: 'dropoff',   pathName: 'interview-dropoff' },
  { atMs: 78_100, from: 'inflow',    to: 'applied',   pathName: 'inflow-applied' },
  { atMs: 80_800, from: 'applied',   to: 'dropoff',   pathName: 'applied-dropoff' },
  { atMs: 83_500, from: 'final',     to: 'dropoff',   pathName: 'final-dropoff' },
  { atMs: 86_200, from: 'inflow',    to: 'applied',   pathName: 'inflow-applied' },
  { atMs: 88_900, from: 'offer',     to: 'inflow',    pathName: 'bookkeeping' },
];

/**
 * Look up transitions in the window [fromMs, toMs), handling modulo wrap.
 * Both inputs are in ms since page load; the schedule itself cycles every 90s.
 */
export function getActiveTransitionsAt(fromMs: number, toMs: number): ScheduledTransition[] {
  if (toMs <= fromMs) return [];
  const fromCycle = fromMs % CYCLE_DURATION_MS;
  const toCycle = toMs % CYCLE_DURATION_MS;
  const wraps = Math.floor(toMs / CYCLE_DURATION_MS) > Math.floor(fromMs / CYCLE_DURATION_MS);

  if (!wraps) {
    return PIPELINE_SCHEDULE.filter((t) => t.atMs >= fromCycle && t.atMs < toCycle);
  }
  // Wraps: from fromCycle to CYCLE_DURATION_MS, plus 0 to toCycle.
  return [
    ...PIPELINE_SCHEDULE.filter((t) => t.atMs >= fromCycle),
    ...PIPELINE_SCHEDULE.filter((t) => t.atMs < toCycle),
  ];
}

/**
 * Static SVG path d-strings for flying cards. Coordinates assume the hero
 * viewBox is 1000 × 300 (matches the scaled hero layout). Column x-positions:
 *   applied:   100
 *   screen:    300
 *   interview: 500
 *   final:     700
 *   offer:     900
 * Card y-midline is at ~150 in all columns. Drop-off tray is at y=280.
 * Inflow enters applied from x=20, y=150.
 */
export const PATH_DEFINITIONS: Record<string, string> = {
  'inflow-applied':     'M 20 150 Q 60 150 100 150',
  'applied-screen':     'M 100 150 C 180 150 220 150 300 150',
  'screen-interview':   'M 300 150 C 380 150 420 150 500 150',
  'interview-final':    'M 500 150 C 580 150 620 150 700 150',
  'final-offer':        'M 700 150 C 780 150 820 150 900 150',
  'applied-dropoff':    'M 100 175 C 140 220 180 260 240 280',
  'screen-dropoff':     'M 300 175 C 340 220 380 260 440 280',
  'interview-dropoff':  'M 500 175 C 540 220 580 260 640 280',
  'final-dropoff':      'M 700 175 C 740 220 780 260 840 280',
  'bookkeeping':        'M 0 0 L 0 0',
};
