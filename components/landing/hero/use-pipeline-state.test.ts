import { describe, it, expect } from 'vitest';
import { pipelineReducer, initialPipelineState } from './use-pipeline-state';
import { HERO_BASELINE_COUNTS } from '@/lib/landing/constants';

describe('pipelineReducer', () => {
  it('initial state matches baseline counts', () => {
    const s = initialPipelineState(0);
    expect(s.counts.applied).toBe(HERO_BASELINE_COUNTS.applied);
    expect(s.counts.offer).toBe(HERO_BASELINE_COUNTS.offer);
    expect(s.flying).toHaveLength(0);
    expect(s.cycleStartedAt).toBe(0);
  });

  it('fireTransition adds a flying entry and decrements source count', () => {
    const s0 = initialPipelineState(0);
    const s1 = pipelineReducer(s0, {
      type: 'fireTransition',
      cardId: 'c1',
      from: 'applied',
      to: 'screen',
      pathName: 'applied-screen',
      now: 1000,
    });
    expect(s1.flying).toHaveLength(1);
    expect(s1.flying[0].cardId).toBe('c1');
    expect(s1.counts.applied).toBe(HERO_BASELINE_COUNTS.applied - 1);
    // Destination count is not updated until completeTransition
    expect(s1.counts.screen).toBe(HERO_BASELINE_COUNTS.screen);
  });

  it('completeTransition removes the flying entry and increments destination count', () => {
    let s = initialPipelineState(0);
    s = pipelineReducer(s, {
      type: 'fireTransition',
      cardId: 'c1',
      from: 'applied',
      to: 'screen',
      pathName: 'applied-screen',
      now: 1000,
    });
    s = pipelineReducer(s, { type: 'completeTransition', cardId: 'c1' });
    expect(s.flying).toHaveLength(0);
    expect(s.counts.screen).toBe(HERO_BASELINE_COUNTS.screen + 1);
  });

  it('inflow source skips the count decrement', () => {
    const s0 = initialPipelineState(0);
    const s1 = pipelineReducer(s0, {
      type: 'fireTransition',
      cardId: 'c1',
      from: 'inflow',
      to: 'applied',
      pathName: 'inflow-applied',
      now: 1000,
    });
    // Applied's count is unchanged until arrival; inflow is not a real column
    expect(s1.counts.applied).toBe(HERO_BASELINE_COUNTS.applied);
    expect(s1.flying).toHaveLength(1);
  });

  it('bookkeeping transitions mutate counts but skip flying entry', () => {
    const s0 = initialPipelineState(0);
    const s1 = pipelineReducer(s0, {
      type: 'fireTransition',
      cardId: 'bk-1',
      from: 'offer',
      to: 'inflow',
      pathName: 'bookkeeping',
      now: 1000,
    });
    expect(s1.flying).toHaveLength(0); // not animated
    expect(s1.counts.offer).toBe(HERO_BASELINE_COUNTS.offer - 1);
  });

  it('count flash timestamps are recorded on fire and complete', () => {
    let s = initialPipelineState(0);
    s = pipelineReducer(s, {
      type: 'fireTransition',
      cardId: 'c1',
      from: 'applied',
      to: 'screen',
      pathName: 'applied-screen',
      now: 1000,
    });
    expect(s.lastFlash.applied).toEqual({ kind: 'down', at: 1000 });
    s = pipelineReducer(s, { type: 'completeTransition', cardId: 'c1' });
    // Complete is not given a timestamp; use now=0 default (consumer passes current time)
    expect(s.lastFlash.screen?.kind).toBe('up');
  });
});
