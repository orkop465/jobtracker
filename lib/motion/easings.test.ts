import { describe, it, expect } from 'vitest';
import { easeOutQuart, easeInOutCubic, CSS_EASE_OUT_QUART, CSS_EASE_IN_OUT_CUBIC } from './easings';

describe('easings', () => {
  it('easeOutQuart boundaries', () => {
    expect(easeOutQuart(0)).toBe(0);
    expect(easeOutQuart(1)).toBe(1);
  });

  it('easeOutQuart monotonic increasing', () => {
    const points = [0, 0.25, 0.5, 0.75, 1];
    const values = points.map(easeOutQuart);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('easeInOutCubic boundaries', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('easeInOutCubic midpoint is 0.5', () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 3);
  });

  it('CSS token strings match spec', () => {
    expect(CSS_EASE_OUT_QUART).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(CSS_EASE_IN_OUT_CUBIC).toBe('cubic-bezier(0.65, 0, 0.35, 1)');
  });
});
