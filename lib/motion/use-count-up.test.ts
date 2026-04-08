import { describe, it, expect } from 'vitest';
import { computeCountUpValue } from './use-count-up';

describe('computeCountUpValue', () => {
  it('returns 0 at t=0', () => {
    expect(computeCountUpValue(100, 0)).toBe(0);
  });

  it('returns target at t=1', () => {
    expect(computeCountUpValue(100, 1)).toBe(100);
  });

  it('returns rounded integer between 0 and target mid-flight', () => {
    const v = computeCountUpValue(100, 0.5);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(100);
    expect(Number.isInteger(v)).toBe(true);
  });

  it('handles negative progress (clamps to 0)', () => {
    expect(computeCountUpValue(100, -0.2)).toBe(0);
  });

  it('handles progress > 1 (clamps to target)', () => {
    expect(computeCountUpValue(100, 1.5)).toBe(100);
  });

  it('rounds to nearest integer when target is decimal-free', () => {
    const v = computeCountUpValue(10, 0.33);
    expect(Number.isInteger(v)).toBe(true);
  });
});
