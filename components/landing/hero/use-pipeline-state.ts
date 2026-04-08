'use client';

import { useReducer } from 'react';
import type { ColumnId, HeroStage } from '@/lib/landing/constants';
import { HERO_BASELINE_COUNTS, HERO_STAGES } from '@/lib/landing/constants';
import type { TransitionSource, TransitionTarget } from '@/lib/landing/pipeline-schedule';

export interface FlyingCard {
  cardId: string;
  from: TransitionSource;
  to: TransitionTarget;
  pathName: string;
  startedAt: number;
}

export interface PipelineState {
  counts: Record<HeroStage, number>;
  flying: FlyingCard[];
  lastFlash: Partial<Record<ColumnId, { kind: 'up' | 'down'; at: number }>>;
  cycleStartedAt: number;
}

export type PipelineAction =
  | {
      type: 'fireTransition';
      cardId: string;
      from: TransitionSource;
      to: TransitionTarget;
      pathName: string;
      now: number;
    }
  | { type: 'completeTransition'; cardId: string; now?: number };

export function initialPipelineState(cycleStartedAt: number): PipelineState {
  return {
    counts: { ...HERO_BASELINE_COUNTS },
    flying: [],
    lastFlash: {},
    cycleStartedAt,
  };
}

function isHeroStage(id: TransitionSource | TransitionTarget): id is HeroStage {
  return (HERO_STAGES as readonly string[]).includes(id as string);
}

const BOOKKEEPING_PATH = 'bookkeeping';

export function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case 'fireTransition': {
      // Bookkeeping transitions mutate counts silently, no flying entry, no flash.
      if (action.pathName === BOOKKEEPING_PATH) {
        const counts = { ...state.counts };
        if (isHeroStage(action.from)) {
          counts[action.from] = Math.max(0, counts[action.from] - 1);
        }
        if (isHeroStage(action.to)) {
          counts[action.to] = counts[action.to] + 1;
        }
        return { ...state, counts };
      }

      // Visible transition: create flying entry, decrement source count, record flash.
      const counts = { ...state.counts };
      if (isHeroStage(action.from)) {
        counts[action.from] = Math.max(0, counts[action.from] - 1);
      }
      const lastFlash = { ...state.lastFlash };
      if (isHeroStage(action.from)) {
        lastFlash[action.from] = { kind: 'down', at: action.now };
      }

      return {
        ...state,
        counts,
        flying: [
          ...state.flying,
          {
            cardId: action.cardId,
            from: action.from,
            to: action.to,
            pathName: action.pathName,
            startedAt: action.now,
          },
        ],
        lastFlash,
      };
    }

    case 'completeTransition': {
      const flight = state.flying.find((f) => f.cardId === action.cardId);
      if (!flight) return state;

      const counts = { ...state.counts };
      if (isHeroStage(flight.to)) {
        counts[flight.to] = counts[flight.to] + 1;
      }

      const lastFlash = { ...state.lastFlash };
      if (isHeroStage(flight.to)) {
        lastFlash[flight.to] = { kind: 'up', at: action.now ?? Date.now() };
      }

      return {
        ...state,
        counts,
        flying: state.flying.filter((f) => f.cardId !== action.cardId),
        lastFlash,
      };
    }

    default:
      return state;
  }
}

/** Convenience hook wrapping the reducer. */
export function usePipelineState(cycleStartedAt: number) {
  return useReducer(pipelineReducer, cycleStartedAt, initialPipelineState);
}
