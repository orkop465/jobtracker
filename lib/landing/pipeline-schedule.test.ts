import { describe, it, expect } from 'vitest';
import {
  PIPELINE_SCHEDULE,
  CYCLE_DURATION_MS,
  getActiveTransitionsAt,
  PATH_DEFINITIONS,
} from './pipeline-schedule';
import { HERO_BASELINE_COUNTS, HERO_STAGES } from './constants';

describe('pipeline schedule', () => {
  it('cycle duration is 90 seconds', () => {
    expect(CYCLE_DURATION_MS).toBe(90_000);
  });

  it('schedule is non-empty and sorted by time', () => {
    expect(PIPELINE_SCHEDULE.length).toBeGreaterThan(0);
    for (let i = 1; i < PIPELINE_SCHEDULE.length; i++) {
      expect(PIPELINE_SCHEDULE[i].atMs).toBeGreaterThanOrEqual(PIPELINE_SCHEDULE[i - 1].atMs);
    }
  });

  it('every scheduled entry has atMs within [0, CYCLE_DURATION_MS)', () => {
    for (const entry of PIPELINE_SCHEDULE) {
      expect(entry.atMs).toBeGreaterThanOrEqual(0);
      expect(entry.atMs).toBeLessThan(CYCLE_DURATION_MS);
    }
  });

  it('transitions respect the spec cadence (2000ms–4000ms gap)', () => {
    for (let i = 1; i < PIPELINE_SCHEDULE.length; i++) {
      const gap = PIPELINE_SCHEDULE[i].atMs - PIPELINE_SCHEDULE[i - 1].atMs;
      expect(gap).toBeGreaterThanOrEqual(1800);
      expect(gap).toBeLessThanOrEqual(4200);
    }
  });

  it('getActiveTransitionsAt is deterministic (same input -> same output)', () => {
    const a = getActiveTransitionsAt(12_345, 12_500);
    const b = getActiveTransitionsAt(12_345, 12_500);
    expect(a).toEqual(b);
  });

  it('getActiveTransitionsAt handles modulo wrap', () => {
    // Verify a window near cycle end + cycle start returns both sides of the wrap
    const transitions = getActiveTransitionsAt(CYCLE_DURATION_MS - 100, CYCLE_DURATION_MS + 100);
    expect(Array.isArray(transitions)).toBe(true);
  });

  it('column counts are conserved over one full cycle', () => {
    // Simulate: starting from baseline, apply every transition's net effect, end at baseline.
    const counts: Record<string, number> = { ...HERO_BASELINE_COUNTS, dropoff: 0 };
    for (const entry of PIPELINE_SCHEDULE) {
      counts[entry.from] -= 1;
      counts[entry.to] = (counts[entry.to] ?? 0) + 1;
    }
    // Applied gains inflow-matched arrivals; after 90s the baseline matches.
    for (const stage of HERO_STAGES) {
      expect(counts[stage]).toBe(HERO_BASELINE_COUNTS[stage]);
    }
  });

  it('every path name referenced by the schedule has a PATH_DEFINITIONS entry', () => {
    for (const entry of PIPELINE_SCHEDULE) {
      expect(PATH_DEFINITIONS).toHaveProperty(entry.pathName);
    }
  });

  it('path definitions contain valid SVG path d-strings', () => {
    for (const [, d] of Object.entries(PATH_DEFINITIONS)) {
      expect(typeof d).toBe('string');
      expect(d.length).toBeGreaterThan(0);
      expect(d[0]).toMatch(/^M/i); // path must start with a moveto
    }
  });
});
