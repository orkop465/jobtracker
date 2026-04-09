# Mobile Pipeline — Stacked Segment Funnel

## Overview

Replace the current mobile pipeline (3x2 grid of dashed-border columns with tiny company cards) with a stacked segment bar chart that communicates the funnel concept in ~150-170px of vertical space. Individual company cards are abstracted into anonymous thin segments. Segments animate between bars to show flow, and drop-and-fade to show rejection.

Desktop pipeline (sm+ breakpoint) is unchanged.

## Layout

- **5 vertical bars** in a single horizontal row: Applied, Screen, Interview, Final, Offer.
- No Closed column — rejections are expressed as a drain animation (segments falling out and fading).
- Total height budget: ~150-170px including labels and counts.
- Contained in the same `rounded-[10px]` white card with border as the desktop pipeline.

## Bar Construction

Each bar is a vertical stack of thin segments, bottom-aligned:

- **Segment size:** 5px tall, full column width, 1.5px vertical gap, `border-radius: 1.5px`.
- **Segment color:** `var(--color-ink)` at varying opacity (higher opacity at bottom, lower at top) for subtle depth.
- **Segment count per bar:** Proportional to the stage count, capped so the tallest bar (Applied) fills the available height (~14 segments max). Other bars scale proportionally (e.g. Screen ≈ 8, Interview ≈ 4, Final ≈ 2, Offer ≈ 1).
- **Offer column exception:** Segments use `var(--color-survive)` (green) instead of ink.

## Labels and Counts

Below each bar:

- **Stage label:** Monospace, uppercase, 8-9px, muted color. Full words: Applied, Screen, Interview, Final, Offer.
- **Count:** Monospace, 13px, semibold, tabular-nums. Ink color for most stages, green for Offer.
- **+1/-1 flash:** Same floating sprite animation as desktop — appears on count change, floats up and fades.

## Animations

### Forward transition (advance)

1. A segment is selected from a **random position** within the source bar (not necessarily the top).
2. The segment lifts out of the stack. Segments above it **collapse downward** to close the gap (spring/ease-out easing, ~200ms).
3. The segment slides horizontally rightward with a slight upward arc toward the destination bar. During flight it is tinted green (`var(--color-survive)`).
4. The segment lands on **top** of the destination bar.
5. After landing, the segment **fades back to gray** (ink color at appropriate opacity) over ~300ms. Exception: segments landing in the Offer column stay green.
6. Source count decrements (flash -1), destination count increments (flash +1).

### Rejection transition (drain)

1. A segment is selected from a random position within the source bar.
2. The segment drops **downward** out of the bar and **fades to 0 opacity** over ~400ms.
3. Segments above it collapse downward to close the gap.
4. Source count decrements (flash -1). No destination.

### Inflow (new applications)

1. A new segment **fades in** at the top of the Applied bar (opacity 0 → target opacity, ~300ms).
2. Applied count increments (flash +1).

### Timing

- Reuse the existing `PIPELINE_SCHEDULE` and `CYCLE_DURATION_MS` from the desktop pipeline. The same schedule drives both views — only the rendering differs.
- Flight duration can be shorter than desktop (400-500ms vs 640ms) since the horizontal distance is smaller.

## Interaction with Desktop

- The mobile pipeline renders at the default breakpoint (below `sm`/640px).
- At `sm+`, the existing desktop pipeline renders unchanged (columns, Sankey ribbons, flying cards).
- Both share the same `usePipelineState` hook and schedule driver. The mobile view simply renders state differently.

## What's Removed on Mobile

- Company cards (name + role text)
- Sankey SVG ribbons
- Flying card overlay
- Flight trail SVG overlay
- Closed column (6th column)
- Dashed-border column containers
- 3x2 grid layout

## Accessibility

- `prefers-reduced-motion`: skip all segment animations, render static bars only.
- Bar heights and counts convey the funnel data without animation.
- `aria-label="Pipeline funnel"` on the container.
