# Mobile Landing Page + Auth Redesign

**Date:** 2026-04-21
**Status:** Draft
**Scope:** Mobile-only changes (≤720px landing, <960px auth). Desktop unchanged.

---

## Problem

Two mobile pain points on the landing page:

1. **Demo board** becomes a horizontal swipe carousel on mobile. Scrolling through 4 kanban columns of cards is clunky — the spatial layout that makes a kanban useful doesn't translate to 375px. Drag-drop is meaningless on touch.
2. **Stages section** stacks all 4 pills vertically plus the detail area below each, creating a very tall section with lots of empty space.

Auth pages hide the entire right side panel on mobile (<960px), leaving just a bare form with no personality.

## Solution

### Landing: Card Journey Component

Replace both the demo board carousel AND the stages section with a single `CardJourney` component on mobile (≤720px). Desktop remains unchanged.

**Layout:**
- Horizontal stage progress dots at top: Applied ●───── Screen ○───── Onsite ○───── Offer ○
- Completed stages: filled dot with stage color, connecting line colored
- Active stage: slightly larger dot with subtle ring/glow
- Upcoming stages: hollow dots with gray border, gray connecting line
- Below dots: a card container showing company logo, role title, salary
- Below card identity: stage-specific fields that crossfade at each transition
- Below fields: stage feature tags (from existing `STAGE_DETAILS[].features`)
- Below tags: benchmark metric strip (from existing `STAGE_DETAILS[].metric`)

**Animation cycle (one "episode"):**
1. Card enters — company + role from `COMPANY_TEMPLATES` (or `BOARD_COMPANIES`/`BOARD_ROLES`), Applied dot fills
2. Hold ~4s showing Applied-stage fields (resume, submitted date, comp band) + features + metric
3. Stage advances — Applied dot stays filled, line extends, Screen dot fills. Card fields crossfade to Screen-stage content (interviewer, date, follow-up). Feature tags + metric update.
4. Hold ~4s
5. Repeat advance for each stage the card reaches
6. **Outcome fork:**
   - **Offer reached (~40%):** All 4 dots filled. Card shows comp details. Green checkmark pulse on Offer dot. Card gets subtle green border. Hold 4s. Fade out.
   - **Rejected (~60%):** Card fades down with opacity drop at the stage it died. Brief dim state. Dots reset.
     - ~30% of all cards die at Screen
     - ~20% at Onsite
     - ~10% at Final
7. **Between-episode transition:** Card content fades out but container stays at fixed `min-height` (no layout shift). Stage dots reset to all hollow. A brief shimmer or subtle pulse on the container signals "next card loading." After ~1.5s, new company/role fades in at Applied stage.

**Timing:** ~4s per stage hold + ~0.6s transition animation. Full offer path ≈ 20s. Average episode ≈ 12–15s (since most don't reach Offer).

**Data sources (reuse existing):**
- Company/role pairs: `lib/landing/company-templates.ts` → `COMPANY_TEMPLATES` (30 templates)
- Stage details: `components/landing/stages.tsx` → `STAGE_DETAILS` (features, descriptions, metrics, colors)
- Stage-specific card fields: derive from existing `StageVisual` component patterns in `stages.tsx`

**Position in page:** Renders inside `<section id="stages">` on mobile, replacing both the `DemoBoardSection` (hidden on mobile) and `StagesSection` (hidden on mobile). Wrap in existing `RevealOnScroll`.

**Reduced motion:** If `prefers-reduced-motion: reduce`, show a static card at the Applied stage. No animation. Stage dots all visible but only Applied filled.

### Auth: Mobile Form + Rotating Caption

On mobile auth pages (<960px), add `RotatingCaption` below the form.

**Changes:**
- `AuthShell` component: render `<RotatingCaption style="editorial" />` after `auth-body` div, visible only on mobile (<960px via CSS media query or Tailwind `lg:hidden`)
- Caption style: `editorial` — the poetic set ("Every offer starts as a cold application.", etc.)
- No other mobile changes to auth. Side panel stays hidden. No animations, no progress bars.

**RotatingCaption already exists** at `components/auth/rotating-caption.tsx` with typewriter effect and multiple caption sets. Just needs to be wired into AuthShell for mobile.

## Files to Modify

### New files
- `components/landing/card-journey.tsx` — the mobile card journey component

### Modified files
- `app/(public)/page.tsx` — conditionally render CardJourney on mobile, hide DemoBoardSection + StagesSection on mobile
- `styles/design/landing.css` — mobile media query: hide `.demo-board-wrap` and `.stages` on ≤720px, add card journey styles
- `components/auth/auth-shell.tsx` — add RotatingCaption on mobile

### Unchanged
- `components/landing/demo-board.tsx` — desktop unchanged
- `components/landing/stages.tsx` — desktop unchanged
- All hero pipeline components — unchanged

## Visual Tokens

Use existing design system variables:
- Stage colors: `oklch(0.42 0.08 230)` (applied/sky), `oklch(0.48 0.10 70)` (screen/amber), `oklch(0.45 0.08 300)` (onsite/lilac), `oklch(0.42 0.14 38)` (offer/accent)
- Stage backgrounds: from `STAGE_DETAILS[].bg`
- Card background: `var(--bg)` (warm bone)
- Borders: `var(--line)`
- Typography: `var(--display)` for headings, `var(--mono)` for labels, `var(--sans)` for body
- Success color: `var(--sage)` / `oklch(0.60 0.10 150)`
- Shadows: `var(--shadow-sm)`, `var(--shadow-md)`

## Verification

1. Resize browser to ≤720px — card journey should render, demo board carousel and stages section should be hidden
2. Watch 3+ card episodes — verify different companies appear, different outcomes occur
3. Resize back to >720px — desktop demo board + stages should render, card journey hidden
4. Check `prefers-reduced-motion` — should show static card, no animation
5. Navigate to /login on mobile (<960px) — rotating caption should appear below form
6. Navigate to /login on desktop (≥960px) — side panel shows, no rotating caption below form
7. Test on actual mobile device (or Chrome DevTools device mode) for touch/scroll behavior
