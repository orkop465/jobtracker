# Mobile Pipeline — Stacked Segment Funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile pipeline's 3x2 grid of company-card columns with a stacked-segment bar chart funnel where segments animate between bars (advance) or drop-and-fade (reject).

**Architecture:** A new `<MobilePipeline>` component renders 5 vertical bar stacks. Each bar is an array of segment objects managed by a `useMobileSegments` hook that consumes the same `PipelineState` (counts, flying, lastFlash) produced by the existing `usePipelineState` reducer. The hook translates `fireTransition` / `completeTransition` events into segment-level animations (lift, slide, collapse, fade). The desktop `<StageColumn>` grid and SVG overlays remain unchanged behind the `sm:` breakpoint.

**Tech Stack:** React 19, Tailwind CSS v4, CSS keyframes + inline style transitions, existing `usePipelineState` hook.

**Spec:** `docs/superpowers/specs/2026-04-09-mobile-pipeline-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `components/landing/hero/mobile-pipeline.tsx` | Top-level mobile pipeline component — renders 5 `<MobileBarStack>` columns, manages segment state, handles transitions |
| Create | `components/landing/hero/mobile-bar-stack.tsx` | Single bar column — renders segments, labels, counts, +1/-1 flash |
| Create | `components/landing/hero/mobile-flying-segment.tsx` | A single segment in flight between bars — absolutely positioned, animates from source rect to destination rect |
| Create | `components/landing/hero/mobile-drain-segment.tsx` | A single segment draining (reject) — drops down and fades out |
| Modify | `components/landing/hero/pipeline.tsx` | Conditionally render `<MobilePipeline>` below `sm:`, keep desktop path for `sm:+` |
| Modify | `app/globals.css` | Add keyframes: `segment-collapse`, `segment-enter`, `segment-drain` |

---

### Task 1: Add CSS keyframes for mobile segment animations

**Files:**
- Modify: `app/globals.css:61-122` (KEYFRAMES section)

- [ ] **Step 1: Add the segment keyframes to globals.css**

Insert after the existing `ambient-fade-out` keyframe block (line 122), before the INTERACTION section:

```css
/* Mobile pipeline segment animations (stacked bar funnel). */
@keyframes segment-enter {
  from { opacity: 0; transform: scaleX(0.3); }
  to   { opacity: 1; transform: scaleX(1); }
}

@keyframes segment-drain {
  from { opacity: var(--seg-opacity, 0.15); transform: translateY(0); }
  to   { opacity: 0; transform: translateY(24px); }
}
```

- [ ] **Step 2: Verify CSS parses correctly**

Run: `npx next lint --quiet`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(mobile-pipeline): add segment animation keyframes"
```

---

### Task 2: Create `<MobileBarStack>` — single bar column

**Files:**
- Create: `components/landing/hero/mobile-bar-stack.tsx`

This component renders one vertical bar: a stack of segment divs, a stage label, and a count with flash animation. It receives segments as data — it does not manage animation state.

- [ ] **Step 1: Create the MobileBarStack component**

```tsx
'use client';

import { useEffect, useState } from 'react';

export interface MobileSegment {
  id: string;
  /** 0-1 opacity value. Higher = lower in the stack (older). */
  opacity: number;
}

interface MobileBarStackProps {
  label: string;
  count: number;
  flash: { kind: 'up' | 'down'; at: number } | null;
  segments: MobileSegment[];
  isOffer?: boolean;
}

const FLASH_HOLD_MS = 400;

export function MobileBarStack({ label, count, flash, segments, isOffer = false }: MobileBarStackProps) {
  const [flashActive, setFlashActive] = useState(false);
  useEffect(() => {
    if (!flash) return;
    setFlashActive(true);
    const t = setTimeout(() => setFlashActive(false), FLASH_HOLD_MS);
    return () => clearTimeout(t);
  }, [flash?.at]);

  const segColor = isOffer ? 'var(--color-survive)' : 'var(--color-ink)';

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      {/* Segment stack — bottom aligned */}
      <div className="w-full flex flex-col gap-[1.5px] justify-end h-[110px]">
        {segments.map((seg) => (
          <div
            key={seg.id}
            className="h-[5px] rounded-[1.5px] transition-transform duration-200 ease-out"
            style={{
              backgroundColor: segColor,
              opacity: isOffer ? 0.35 : seg.opacity,
              ['--seg-opacity' as string]: seg.opacity,
            }}
          />
        ))}
      </div>

      {/* Label */}
      <div
        className={[
          'font-mono uppercase text-[8px] tracking-[0.1em] mt-1.5 font-medium',
          isOffer ? 'text-[var(--color-survive)]' : 'text-[var(--color-ink-muted)]',
        ].join(' ')}
      >
        {label}
      </div>

      {/* Count + flash */}
      <div className="relative">
        <span
          className={[
            'font-mono text-[13px] font-semibold tabular-nums leading-tight transition-colors duration-[280ms]',
            flashActive && flash?.kind === 'up' && 'text-[var(--color-survive)]',
            flashActive && flash?.kind === 'down' && 'text-[var(--color-ink-muted)]',
            !flashActive && isOffer && 'text-[var(--color-survive)]',
            !flashActive && !isOffer && 'text-[var(--color-ink)]',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {count}
        </span>
        {flash && (
          <span
            key={flash.at}
            aria-hidden
            className="absolute -right-4 top-0 font-mono text-[9px] font-semibold pointer-events-none tabular-nums"
            style={{
              color: flash.kind === 'up' ? 'var(--color-survive)' : 'var(--color-sink)',
              animation: 'float-up 900ms cubic-bezier(0.22, 1, 0.36, 1) both',
            }}
          >
            {flash.kind === 'up' ? '+1' : '−1'}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors related to `mobile-bar-stack.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/landing/hero/mobile-bar-stack.tsx
git commit -m "feat(mobile-pipeline): add MobileBarStack column component"
```

---

### Task 3: Create `<MobileFlyingSegment>` — segment in flight

**Files:**
- Create: `components/landing/hero/mobile-flying-segment.tsx`

An absolutely-positioned segment that animates from a source position to a destination position. Uses `requestAnimationFrame` to interpolate position. Calls `onComplete` when done.

- [ ] **Step 1: Create the MobileFlyingSegment component**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

interface Rect {
  x: number;
  y: number;
  width: number;
}

interface MobileFlyingSegmentProps {
  id: string;
  from: Rect;
  to: Rect;
  durationMs: number;
  isOffer: boolean;
  onComplete: (id: string) => void;
}

const ARC_HEIGHT = 12; // pixels of upward arc at midpoint

export function MobileFlyingSegment({
  id,
  from,
  to,
  durationMs,
  isOffer,
  onComplete,
}: MobileFlyingSegmentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const t = Math.min(elapsed / durationMs, 1);

      // Ease out quart
      const ease = 1 - Math.pow(1 - t, 4);

      // Interpolate x and width
      const x = from.x + (to.x - from.x) * ease;
      const y = from.y + (to.y - from.y) * ease - Math.sin(t * Math.PI) * ARC_HEIGHT;
      const width = from.width + (to.width - from.width) * ease;

      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.width = `${width}px`;

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDone(true);
        onComplete(id);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [id, from, to, durationMs, onComplete]);

  if (done) return null;

  return (
    <div
      ref={ref}
      className="absolute top-0 left-0 h-[5px] rounded-[1.5px] pointer-events-none z-30"
      style={{
        backgroundColor: isOffer ? 'var(--color-survive)' : 'var(--color-survive)',
        opacity: 0.45,
        transform: `translate(${from.x}px, ${from.y}px)`,
        width: `${from.width}px`,
      }}
    />
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors related to `mobile-flying-segment.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/landing/hero/mobile-flying-segment.tsx
git commit -m "feat(mobile-pipeline): add MobileFlyingSegment transition component"
```

---

### Task 4: Create `<MobileDrainSegment>` — segment draining on reject

**Files:**
- Create: `components/landing/hero/mobile-drain-segment.tsx`

An absolutely-positioned segment that drops downward and fades out, then calls `onComplete`.

- [ ] **Step 1: Create the MobileDrainSegment component**

```tsx
'use client';

import { useEffect, useState } from 'react';

const DRAIN_DURATION_MS = 450;

interface MobileDrainSegmentProps {
  id: string;
  x: number;
  y: number;
  width: number;
  opacity: number;
  onComplete: (id: string) => void;
}

export function MobileDrainSegment({ id, x, y, width, opacity, onComplete }: MobileDrainSegmentProps) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDone(true);
      onComplete(id);
    }, DRAIN_DURATION_MS);
    return () => clearTimeout(t);
  }, [id, onComplete]);

  if (done) return null;

  return (
    <div
      className="absolute top-0 left-0 h-[5px] rounded-[1.5px] pointer-events-none z-30"
      style={{
        backgroundColor: 'var(--color-ink)',
        ['--seg-opacity' as string]: opacity,
        opacity,
        transform: `translate(${x}px, ${y}px)`,
        width: `${width}px`,
        animation: `segment-drain ${DRAIN_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
      }}
    />
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors related to `mobile-drain-segment.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/landing/hero/mobile-drain-segment.tsx
git commit -m "feat(mobile-pipeline): add MobileDrainSegment reject component"
```

---

### Task 5: Create `<MobilePipeline>` — orchestrator component

**Files:**
- Create: `components/landing/hero/mobile-pipeline.tsx`

This is the main mobile component. It:
1. Receives `state` (PipelineState) and `dispatch` from the parent `HeroPipeline`.
2. Maintains an internal array of segments per column (proportional to counts).
3. Listens for `state.flying` changes to spawn `<MobileFlyingSegment>` or `<MobileDrainSegment>`.
4. Uses refs to bar column DOM elements to calculate source/destination rects.

- [ ] **Step 1: Create the MobilePipeline component**

```tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HERO_STAGES, HERO_STAGE_LABELS, type HeroStage } from '@/lib/landing/constants';
import type { PipelineState, PipelineAction } from './use-pipeline-state';
import { MobileBarStack, type MobileSegment } from './mobile-bar-stack';
import { MobileFlyingSegment } from './mobile-flying-segment';
import { MobileDrainSegment } from './mobile-drain-segment';

const LABELS: Record<HeroStage, string> = {
  applied: 'Applied',
  screen: 'Screen',
  interview: 'Interview',
  final: 'Final',
  offer: 'Offer',
};

const MAX_SEGMENTS = 14;
const FLIGHT_DURATION_MS = 450;

interface FlyingSegmentState {
  id: string;
  fromStage: HeroStage;
  toStage: HeroStage | 'dropoff';
  fromRect: { x: number; y: number; width: number };
  toRect: { x: number; y: number; width: number };
  isOffer: boolean;
}

interface DrainSegmentState {
  id: string;
  x: number;
  y: number;
  width: number;
  opacity: number;
}

/** Build proportional segment arrays from counts. */
function buildSegments(counts: Record<HeroStage, number>): Record<HeroStage, MobileSegment[]> {
  const maxCount = Math.max(...HERO_STAGES.map((s) => counts[s]), 1);
  const result = {} as Record<HeroStage, MobileSegment[]>;
  for (const stage of HERO_STAGES) {
    const n = Math.round((counts[stage] / maxCount) * MAX_SEGMENTS);
    const segments: MobileSegment[] = [];
    for (let i = 0; i < n; i++) {
      // Opacity: higher at bottom (older), lower at top (newer)
      const opacity = 0.08 + (1 - i / Math.max(n - 1, 1)) * 0.14;
      segments.push({ id: `${stage}-${i}`, opacity });
    }
    result[stage] = segments;
  }
  return result;
}

interface MobilePipelineProps {
  state: PipelineState;
  dispatch: React.ActionDispatch<[action: PipelineAction]>;
  onFlightComplete: (cardId: string) => void;
}

export function MobilePipeline({ state, dispatch, onFlightComplete }: MobilePipelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<Partial<Record<HeroStage, HTMLDivElement>>>({});
  const [flyingSegments, setFlyingSegments] = useState<FlyingSegmentState[]>([]);
  const [drainSegments, setDrainSegments] = useState<DrainSegmentState[]>([]);
  const processedFlights = useRef<Set<string>>(new Set());

  const segments = useMemo(() => buildSegments(state.counts), [state.counts]);

  // Check for reduced motion preference.
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const getBarRect = useCallback((stage: HeroStage) => {
    const barEl = barRefs.current[stage];
    const container = containerRef.current;
    if (!barEl || !container) return null;
    const barBox = barEl.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    return {
      x: barBox.left - containerBox.left,
      y: barBox.top - containerBox.top,
      width: barBox.width,
      height: barBox.height,
    };
  }, []);

  // Watch state.flying for new entries and spawn mobile animations.
  useEffect(() => {
    if (prefersReducedMotion) return;

    for (const flight of state.flying) {
      if (processedFlights.current.has(flight.cardId)) continue;
      if (flight.pathName === 'bookkeeping') continue;
      processedFlights.current.add(flight.cardId);

      const fromStage = flight.from as HeroStage;
      if (!HERO_STAGES.includes(fromStage as HeroStage)) {
        // inflow — no source bar, skip flight animation (handled by segment-enter)
        continue;
      }

      const sourceRect = getBarRect(fromStage);
      if (!sourceRect) continue;

      // Pick a random y position within the source bar for departure point
      const segHeight = 5;
      const segGap = 1.5;
      const sourceSegments = segments[fromStage];
      const randomIdx = Math.floor(Math.random() * Math.max(sourceSegments.length, 1));
      const segY = sourceRect.y + sourceRect.height - (randomIdx + 1) * (segHeight + segGap);
      const removedOpacity = sourceSegments[randomIdx]?.opacity ?? 0.12;

      if (flight.to === 'dropoff') {
        // Drain animation
        setDrainSegments((prev) => [
          ...prev,
          {
            id: flight.cardId,
            x: sourceRect.x,
            y: segY,
            width: sourceRect.width,
            opacity: removedOpacity,
          },
        ]);
      } else {
        // Forward flight
        const toStage = flight.to as HeroStage;
        const destRect = getBarRect(toStage);
        if (!destRect) continue;

        // Destination: top of the destination bar
        const destSegments = segments[toStage];
        const destY = destRect.y + destRect.height - (destSegments.length + 1) * (segHeight + segGap);

        setFlyingSegments((prev) => [
          ...prev,
          {
            id: flight.cardId,
            fromStage,
            toStage,
            fromRect: { x: sourceRect.x, y: segY, width: sourceRect.width },
            toRect: { x: destRect.x, y: destY, width: destRect.width },
            isOffer: toStage === 'offer',
          },
        ]);
      }
    }
  }, [state.flying, segments, getBarRect, prefersReducedMotion]);

  // Clean up processedFlights when flights complete
  useEffect(() => {
    const currentIds = new Set(state.flying.map((f) => f.cardId));
    processedFlights.current.forEach((id) => {
      if (!currentIds.has(id)) processedFlights.current.delete(id);
    });
  }, [state.flying]);

  const handleFlyingComplete = useCallback(
    (id: string) => {
      setFlyingSegments((prev) => prev.filter((f) => f.id !== id));
      onFlightComplete(id);
    },
    [onFlightComplete],
  );

  const handleDrainComplete = useCallback(
    (id: string) => {
      setDrainSegments((prev) => prev.filter((d) => d.id !== id));
      // Drain = dropoff, the desktop handleComplete already handles count via dispatch
      onFlightComplete(id);
    },
    [onFlightComplete],
  );

  const setBarRef = useCallback(
    (stage: HeroStage) => (el: HTMLDivElement | null) => {
      if (el) barRefs.current[stage] = el;
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      aria-label="Pipeline funnel"
    >
      <div className="flex gap-1.5 items-end px-1">
        {HERO_STAGES.map((stage) => (
          <div key={stage} ref={setBarRef(stage)} className="flex-1 min-w-0">
            <MobileBarStack
              label={LABELS[stage]}
              count={state.counts[stage]}
              flash={state.lastFlash[stage] ?? null}
              segments={segments[stage]}
              isOffer={stage === 'offer'}
            />
          </div>
        ))}
      </div>

      {/* Flying segments overlay */}
      {flyingSegments.map((f) => (
        <MobileFlyingSegment
          key={f.id}
          id={f.id}
          from={f.fromRect}
          to={f.toRect}
          durationMs={FLIGHT_DURATION_MS}
          isOffer={f.isOffer}
          onComplete={handleFlyingComplete}
        />
      ))}

      {/* Drain segments overlay */}
      {drainSegments.map((d) => (
        <MobileDrainSegment
          key={d.id}
          id={d.id}
          x={d.x}
          y={d.y}
          width={d.width}
          opacity={d.opacity}
          onComplete={handleDrainComplete}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors related to `mobile-pipeline.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/landing/hero/mobile-pipeline.tsx
git commit -m "feat(mobile-pipeline): add MobilePipeline orchestrator component"
```

---

### Task 6: Wire MobilePipeline into HeroPipeline with breakpoint switch

**Files:**
- Modify: `components/landing/hero/pipeline.tsx:1-399`

The existing `HeroPipeline` component needs to:
1. Import and render `<MobilePipeline>` at the default breakpoint (below `sm`).
2. Hide the desktop grid, SVG overlays, and Sankey ribbons on mobile (already partially done via `hidden sm:block`).
3. Pass `state`, `dispatch`, and a flight-complete handler to the mobile component.

- [ ] **Step 1: Add import for MobilePipeline**

At the top of `pipeline.tsx`, add the import alongside existing ones:

```tsx
import { MobilePipeline } from './mobile-pipeline';
```

- [ ] **Step 2: Render MobilePipeline inside the hero container**

Replace the columns grid block. Find this code in the return JSX:

```tsx
        {/* Columns — 3×2 grid on mobile, 6-col single row on sm+. */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 relative z-10">
          {HERO_STAGES.map((stage) => (
            <StageColumn
              key={stage}
              label={HERO_STAGE_LABELS[stage]}
              count={state.counts[stage]}
              flash={state.lastFlash[stage] ?? null}
              variant={stage === 'offer' ? 'offer' : 'default'}
              cards={slotsByColumn[stage].map((s) => ({
                cardId: s.cardId,
                templateIndex: s.templateIndex,
                isNew: s.isNew,
              }))}
            />
          ))}
          <StageColumn
            label="Closed"
            count={closedCount}
            flash={closedFlash}
            variant="closed"
            cards={closedColumnCards}
          />
        </div>
```

Replace with:

```tsx
        {/* Mobile: stacked segment funnel. */}
        <div className="sm:hidden relative z-10">
          <MobilePipeline
            state={state}
            dispatch={dispatch}
            onFlightComplete={handleComplete}
          />
        </div>

        {/* Desktop: 6-col kanban with company cards. */}
        <div className="hidden sm:grid sm:grid-cols-6 gap-2 relative z-10">
          {HERO_STAGES.map((stage) => (
            <StageColumn
              key={stage}
              label={HERO_STAGE_LABELS[stage]}
              count={state.counts[stage]}
              flash={state.lastFlash[stage] ?? null}
              variant={stage === 'offer' ? 'offer' : 'default'}
              cards={slotsByColumn[stage].map((s) => ({
                cardId: s.cardId,
                templateIndex: s.templateIndex,
                isNew: s.isNew,
              }))}
            />
          ))}
          <StageColumn
            label="Closed"
            count={closedCount}
            flash={closedFlash}
            variant="closed"
            cards={closedColumnCards}
          />
        </div>
```

- [ ] **Step 3: Verify it compiles and renders**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Manual visual test**

Open the app in a browser, resize to mobile width (<640px). Verify:
- 5 vertical bars appear with decreasing heights (Applied tallest → Offer shortest)
- Labels show: Applied, Screen, Interview, Final, Offer (full words)
- Counts match desktop values
- After a few seconds, segments start flying between bars (green tint during flight, fades to gray on landing)
- Rejected segments drop downward and fade out
- +1/-1 flashes appear on count changes
- At sm+ width, the desktop pipeline renders as before

- [ ] **Step 5: Commit**

```bash
git add components/landing/hero/pipeline.tsx
git commit -m "feat(mobile-pipeline): wire MobilePipeline into HeroPipeline at mobile breakpoint"
```

---

### Task 7: Polish and edge cases

**Files:**
- Modify: `components/landing/hero/mobile-pipeline.tsx`
- Modify: `components/landing/hero/mobile-bar-stack.tsx`

- [ ] **Step 1: Add `prefers-reduced-motion` static rendering**

In `mobile-pipeline.tsx`, the `prefersReducedMotion` check already skips spawning animations. Verify that when motion is reduced, the bars render statically with correct segment counts and no animation classes.

- [ ] **Step 2: Add segment-enter animation for inflow arrivals**

In `mobile-bar-stack.tsx`, the newest segment (index 0, top of stack) should get the `segment-enter` animation when it first appears. Modify the segment rendering:

Find:
```tsx
          <div
            key={seg.id}
            className="h-[5px] rounded-[1.5px] transition-transform duration-200 ease-out"
            style={{
              backgroundColor: segColor,
              opacity: isOffer ? 0.35 : seg.opacity,
              ['--seg-opacity' as string]: seg.opacity,
            }}
          />
```

Replace with:
```tsx
          <div
            key={seg.id}
            className="h-[5px] rounded-[1.5px] transition-transform duration-200 ease-out"
            style={{
              backgroundColor: segColor,
              opacity: isOffer ? 0.35 : seg.opacity,
              ['--seg-opacity' as string]: seg.opacity,
              ...(seg.isNew ? { animation: 'segment-enter 300ms cubic-bezier(0.22, 1, 0.36, 1) both' } : {}),
            }}
          />
```

Also add `isNew?: boolean` to the `MobileSegment` interface:

```tsx
export interface MobileSegment {
  id: string;
  opacity: number;
  isNew?: boolean;
}
```

- [ ] **Step 3: Mark inflow segments as new in MobilePipeline**

In `mobile-pipeline.tsx`, the `buildSegments` function doesn't track newness. Instead, handle inflow in the `useEffect` that watches `state.flying`: when a flight has `from === 'inflow'`, the Applied bar's top segment should briefly get `isNew: true`. This is already implicitly handled because `buildSegments` re-derives from counts — when the Applied count increments, a new top segment appears. The `key` change on the new segment will cause React to mount it fresh, triggering the `segment-enter` animation if applied.

To make this work reliably, change the segment id generation in `buildSegments` to incorporate the count so IDs change when segments are added:

Find in `buildSegments`:
```tsx
      segments.push({ id: `${stage}-${i}`, opacity });
```

Replace with:
```tsx
      segments.push({
        id: `${stage}-${counts[stage]}-${i}`,
        opacity,
        isNew: i === 0,
      });
```

Note: `isNew` on index 0 (top of stack) means the newest segment always gets the entrance animation. On subsequent renders when counts haven't changed, the same id will be reused and React won't re-mount, so the animation won't replay.

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

```bash
git add components/landing/hero/mobile-pipeline.tsx components/landing/hero/mobile-bar-stack.tsx
git commit -m "feat(mobile-pipeline): add segment-enter animation and reduced-motion support"
```

---

### Task 8: Final integration test and cleanup

**Files:**
- All mobile pipeline files

- [ ] **Step 1: Full build check**

Run: `npx next build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Lint check**

Run: `npx next lint --quiet`
Expected: No new lint warnings or errors.

- [ ] **Step 3: Visual regression test on multiple viewport widths**

Open in browser and test at:
- 375px (iPhone SE) — bars should fit comfortably, segments visible
- 390px (iPhone 14) — same
- 414px (iPhone Plus) — same
- 639px (just below sm breakpoint) — mobile pipeline visible
- 640px (sm breakpoint) — desktop pipeline renders, mobile hidden

Verify at each width:
- Funnel shape is clear (Applied tallest, Offer shortest)
- Segments animate between bars after a few seconds
- Green tint during flight, fades to gray on landing (green stays in Offer)
- Rejected segments drop and fade
- Count +1/-1 flashes work
- No horizontal overflow or clipping

- [ ] **Step 4: Commit any final adjustments**

```bash
git add -A
git commit -m "feat(mobile-pipeline): final polish and integration"
```
