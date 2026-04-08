# MKVDATA Style Guide

> Binding visual system for MKVDATA, derived from the shipped landing page at `/` and the auth pages at `/login` + `/register`. Amended after the first round of visual feedback (hero: Closed column + flash sprites + materialize-in-place inflow; anatomy: recalibrated rates; how-it-works: grid layout). Any new page in the project should consult this document before making visual decisions.

This document is the contract for the upcoming authed-app rework. It is intentionally self-contained: a plan-writer should be able to use it without reading the original landing+auth design spec or its implementation plan.

---

## 1. Purpose

The MKVDATA visual system is **calm editorial**. It reads like a financial newspaper that happens to be alive — warm off-white canvas, ink-black type, monospaced numerics, hairline borders, and motion that exists only when it tells a truth about the underlying data.

It is the deliberate opposite of the cyberpunk-terminal look it replaced. There is no neon, no scanlines, no terminal metaphors, no glow shadows, no ticker, no gradient borders. Anywhere those start to creep back in, this guide overrides.

The shipped landing at `/` is the proof of the system. The hero pipeline animation is the centerpiece — it is allowed to be alive because it's literally showing you a hiring pipeline in motion. Everywhere else, motion is restrained: scroll-triggered fade-ups, count-ups on first view, hover state changes, and almost nothing else.

---

## 2. Palette

Nine tokens. Defined once in `app/globals.css` inside `@theme inline { … }` and consumed everywhere via `var(--color-*)`.

| Token | Hex | CSS variable | Used for |
|---|---|---|---|
| canvas | `#fafaf7` | `--color-canvas` | Page background, body, light surfaces |
| surface | `#ffffff` | `--color-surface` | Cards, inputs, the auth right panel |
| ink | `#0a0a0a` | `--color-ink` | Primary text, primary buttons, brand mark dot |
| ink-muted | `#737373` | `--color-ink-muted` | Secondary text, labels, eyebrows, captions |
| line | `#e7e7e2` | `--color-line` | Hairline borders, dividers, dashed column outlines |
| line-subtle | `#ececec` | `--color-line-subtle` | Faint internal dividers |
| survive | `#15803d` | `--color-survive` | Positive flashes (`+1`), arriving cards, offer column accent, "live" dot, success/winner badges |
| survive-soft | `#ecfdf5` | `--color-survive-soft` | Offer column background tint |
| sink | `#9a3412` | `--color-sink` | Negative deltas, error text, bottleneck warnings |

**Banned colors.** Cyan, orange, purple, neon, gradients between hue families. The single permitted accent for "good" is `survive` green; the single permitted accent for "bad" is `sink` warm-brown. Nothing else.

**Contrast note.** `--color-ink-muted` (`#737373`) on `--color-canvas` (`#fafaf7`) is approximately **4.04:1** — passes WCAG AA for large text and UI components, fails small-text AA by a small margin. Use ink-muted for labels, captions, and meta text at 11px+ mono / 14px+ sans only. For body copy under 14px, use `--color-ink`.

**Tailwind usage example.**

```tsx
<div className="bg-[var(--color-canvas)] text-[var(--color-ink)] border border-[var(--color-line)]">
  <span className="text-[var(--color-ink-muted)]">Eyebrow</span>
</div>
```

---

## 3. Typography

Two families. **No third face.** Loaded via `next/font/google` in `app/layout.tsx`.

| Slot | Family | CSS var | Tailwind class | Used for |
|---|---|---|---|---|
| Sans (display + body) | **Inter** | `var(--font-inter)` (also `--font-sans`) | `font-sans` | Headlines, sub copy, body |
| Mono (data + labels) | **JetBrains Mono** | `var(--font-jetbrains-mono)` (also `--font-mono`) | `font-mono` | All numbers, all labels, all eyebrows, brand mark |

**Display headlines** are Inter 600, tight tracking, generous size:

```tsx
<h1 className="text-[clamp(40px,6vw,64px)] leading-[1.05] font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
  342 applications in.
  <br />
  <span className="text-[var(--color-ink-muted)]">4 offers out.</span>
</h1>
```

**Section headlines** are 44px Inter 600, max-width gated to keep them in a comfortable measure:

```tsx
<h2 className="text-[44px] leading-[1.05] font-semibold tracking-[-0.02em] text-[var(--color-ink)] mb-12 max-w-[680px]">
  What your spreadsheet can&rsquo;t tell you.
</h2>
```

**Eyebrows** are mono uppercase, 11px, 0.14em tracking, ink-muted, with an optional 1.5×1.5px ink dot:

```tsx
<div className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] flex items-center gap-2">
  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink)]" />
  Stage by stage
</div>
```

**Labels inside cards / columns** drop to mono 9–10px, 0.10–0.12em tracking, uppercase. Always with `font-mono` for tabular alignment:

```tsx
<label className="block font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-ink-muted)] mb-1.5">
  Email
</label>
```

**All numerics use `tabular-nums`.** This is non-negotiable — counts, percentages, durations, currencies, anything that animates or that the eye tracks across rows.

```tsx
<div className="font-mono text-[22px] tabular-nums tracking-[-0.02em] text-[var(--color-ink)]">
  342
  <span className="text-[10px] text-[var(--color-survive)] ml-1.5">+14 wk</span>
</div>
```

The `.tabular-nums` helper class is also defined in `app/globals.css` for non-Tailwind use.

**Banned faces.** No serifs (no DM Serif, Playfair, or anything decorative). No display sans variants (no Sora, Bricolage, Sequel). No old-system fallbacks like Georgia, Times, Courier. Inter and JetBrains Mono only.

---

## 4. Spacing & Layout

The system uses Tailwind's default spacing scale (4px base). Container widths and section padding follow a small set of conventions established by the landing.

| Convention | Value | Usage |
|---|---|---|
| Outer page container | `max-w-[1240px]` | Hero, nav |
| Inner reading container | `max-w-[1160px]` | Anatomy, Intelligence, Proof |
| Body text container | `max-w-[680px]` (heads) / `max-w-[520px]` (sub) | All section headlines and sub copy |
| Auth form column | `max-w-[360px]` | Form contents inside `<AuthShell>` right panel |
| Section vertical padding | `py-16 lg:py-24` (hero) / `py-32` (anatomy, proof) / `py-40` (CTA) | |
| Component card radius | `rounded-md` (default), `rounded-[10px]` (hero outer), `rounded-[5px]` (cards inside columns) | |

**Border style.** Borders are `border border-[var(--color-line)]`. Dashed borders (`border-dashed`) signal "container that holds dynamic items" — the hero stage columns and the drop-off tray use this to indicate they're stage buckets.

**Grid examples.**

```tsx
{/* Hero metric strip — 5 cells, responsive */}
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-t border-b border-[var(--color-line)] py-4">
```

```tsx
{/* Hero kanban columns */}
<div className="grid grid-cols-5 gap-3">
```

```tsx
{/* Anatomy stages — 5 on mobile, 10 on desktop */}
<div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
```

**Auth shell proportions.** The login/register split is 60/40 desktop, stacked mobile, with a 180px minimum strip on top in the stacked layout:

```tsx
<div className="min-h-screen bg-[var(--color-canvas)] flex flex-col lg:flex-row">
  <div className="lg:w-3/5 lg:min-h-screen ... min-h-[180px] border-b lg:border-b-0 lg:border-r border-[var(--color-line)]" aria-hidden="true">
    {/* ambient panel */}
  </div>
  <div className="lg:w-2/5 bg-[var(--color-surface)] flex items-center justify-center p-8 lg:p-16">
    <div className="w-full max-w-[360px]">{children}</div>
  </div>
</div>
```

---

## 5. Motion

Five principles. Defined as CSS variables in `app/globals.css` and as TypeScript exports in `lib/motion/easings.ts`.

### 5.1 Duration tokens

| Token | Value | Use |
|---|---|---|
| `--dur-micro` | 180ms | Border color, hover state, focus ring |
| `--dur-standard` | 280ms | Caption crossfade, count flash hold→fade, entrance opacity |
| `--dur-entrance` | 480ms | Anatomy card stagger, intelligence viz fade-in, hero card `card-enter` (fade-up on mount) |
| `--dur-hero-reveal` | 640ms | Hero card flight, headline reveal, intelligence feature reveal |

There is also one short-lived sprite animation:

| Keyframe | Duration | Use |
|---|---|---|
| `float-up` | 900ms | Floating `+1` / `−1` sprite that appears on the hero stage-column header each time a card arrives or departs. |

### 5.2 Easing tokens

| Token | Value | Curve | Use |
|---|---|---|---|
| `--ease-out-quart` | `cubic-bezier(0.22, 1, 0.36, 1)` | Decelerating | Entrances, scroll reveals, count-ups |
| `--ease-in-out-cubic` | `cubic-bezier(0.65, 0, 0.35, 1)` | Both ends at rest | Loops, hero card flights, anything that should start AND end smoothly |

JS equivalents in `lib/motion/easings.ts`:
- `easeOutQuart(t: number): number`
- `easeInOutCubic(t: number): number`
- `CSS_EASE_OUT_QUART` / `CSS_EASE_IN_OUT_CUBIC` (string constants for inline styles)

### 5.3 Five motion principles

1. **Transform + opacity only.** Never animate `width`, `height`, `top`, `left`, `margin`. Use `translate`, `scale`, and `opacity` so animations stay on the compositor. Exception: SVG `stroke-width` is permitted for the hero ribbon-breathe (background ambient layer where layout/paint cost is acceptable).
2. **Reveal, don't bounce.** Use `--ease-out-quart` for any one-shot reveal. No spring physics, no overshoot. **Do not add horizontal translate animations to static decorative elements** — the user perceives them as layout drift, not as reveal (the how-it-works giant numbers used to translate-x on scroll-in; it read as a stutter, so it was removed).
3. **Steady-state, not keyframed.** Anything that loops (hero pipeline, ribbon breathe, live-dot, rotating captions) must be authored so the user *can never see the loop reset*. The hero accomplishes this with a 90-second deterministic schedule (`lib/landing/pipeline-schedule.ts`) where every column's count returns to baseline at the seam.
4. **Reduced motion is a first-class state.** Every motion-using component must check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and either skip the animation or snap to the final state. The global `@media (prefers-reduced-motion: reduce)` block in `globals.css` collapses CSS transitions to 0.01ms as a safety net.
5. **One thing at a time per interaction.** Don't animate the count and the card and the ribbon and the flash all on the same frame. The hero pipeline fires the source column's `−1` flash sprite the moment the card departs, then the destination column's `+1` sprite 640ms later when it lands, so the eye can track the transfer.

**Entrances vs. transits.** New cards entering the Applied column (inflow arrivals) are *not* animated along an SVG path — they materialize inside the column via the `.card-enter` class (`fade-up 480ms ease-out-quart both`). Cards moving between existing columns use the `useFlightPath` rAF loop to follow an SVG curve. The two motions are deliberately distinct: new items pop into existence, in-flight items travel.

### 5.4 Reusable motion hooks

| Hook | File | Purpose |
|---|---|---|
| `useInView<T>({ threshold, once, rootMargin })` | `lib/motion/use-in-view.ts` | IntersectionObserver-driven scroll reveal. SSR-safe. |
| `useCountUp(target, { start, duration })` | `lib/motion/use-count-up.ts` | rAF-driven number animation, eased via easeOutQuart. Respects reduced-motion. |
| `useFlightPath({ pathElement, duration, startedAt, cardRef, onComplete })` | `components/landing/hero/use-flight-path.ts` | Drives one element along an SVG path via `getPointAtLength`. Hero only. |
| `usePipelineState(cycleStartedAt)` | `components/landing/hero/use-pipeline-state.ts` | The hero's `useReducer`-based state machine. |

### 5.5 Pure helper

```ts
import { computeCountUpValue } from '@/lib/motion/use-count-up';

// progress is 0..1; values outside that range clamp.
computeCountUpValue(100, 0.5); // 94 (eased via easeOutQuart, rounded)
```

---

## 6. Component vocabulary

Reusable primitives shipped under `components/landing/` and `components/auth/`. The authed-app rework should reuse these wherever the visual goal is the same — do not re-invent the metric strip or the column or the stage card.

### 6.1 Landing primitives (`components/landing/`)

| Component | Path | Purpose | Notable props |
|---|---|---|---|
| `LandingNav` | `components/landing/nav.tsx` | Sticky top nav with brand mark + section anchors + `Start tracking` CTA. Becomes bordered on scroll. | None — self-contained |
| `Anatomy` | `components/landing/anatomy.tsx` | The 10-stage strip section. Stagger reveals on scroll. | None |
| `IntelligenceFeature` | `components/landing/intelligence-feature.tsx` | One feature block: headline + caption + viz card. | `headline`, `caption`, `viz: ReactNode`, `reverse?: boolean` |
| `Intelligence` | `components/landing/intelligence.tsx` | Composes 3 `<IntelligenceFeature>` blocks with built-in mini-vizzes. | None |
| `HowItWorksSlide` | `components/landing/how-it-works-slide.tsx` | One dark scroll-driven slide with giant mono number, headline, sub, and a corner visual. | `number`, `headline`, `sub`, `visual: ReactNode` |
| `HowItWorks` | `components/landing/how-it-works.tsx` | Composes 4 dark slides into a typographic interrupt section. | None |
| `Proof` | `components/landing/proof.tsx` | 4 CountUp counters in a 4-column grid; underline draws on viewport entry. | None |
| `LandingCTA` | `components/landing/cta.tsx` | Final pulse CTA. | None |
| `LandingFooter` | `components/landing/footer.tsx` | Bottom strip with brand + legal + version. | None |

### 6.2 Hero primitives (`components/landing/hero/`)

The hero is the project's most expressive component group. **Do not import these into authed pages.** They model a specific visual metaphor (5-column hiring pipeline with flying cards) that doesn't generalize. Instead, the authed pages should reuse the lower-level pieces:

| Component | Path | Reusable for authed pages? |
|---|---|---|
| `HeroPipeline` | `pipeline.tsx` | No — landing only (6-column kanban + flight paths) |
| `SankeyRibbons` | `sankey-ribbons.tsx` | No |
| `StageColumn` | `stage-column.tsx` | **Yes** — kanban-style column with label, flashing count, `+1`/`−1` floating sprite, and `default`/`offer`/`closed` variant styles. |
| `CompanyCard` | `company-card.tsx` | **Yes** — generic card primitive (forwardRef, supports ghost/arriving variants, accepts a `className` so consumers can add `.card-enter` for entrance animation). |
| `FlyingCard` | `flying-card.tsx` | No |
| `MetricStrip` | `metric-strip.tsx` | **Yes** — top-of-page metric row. Generalizes for any dashboard. |
| `useFlightPath` | `use-flight-path.ts` | No |
| `usePipelineState` | `use-pipeline-state.ts` | No (hero-specific state shape) |

The hero's `DropOffTray` primitive was **removed**. The visual of closed/retired applications is now the hero's 6th column (labelled "Closed", variant: `'closed'` on `<StageColumn>`), sitting after Offer with dimmed cards and line-through company names. When reusing `<StageColumn>` in an authed context, the same pattern applies — treat retired items as a dimmed column rather than a separate tray.

### 6.3 Auth primitives (`components/auth/`)

| Component | Path | Purpose |
|---|---|---|
| `AuthShell` | `auth-shell.tsx` | 60/40 split layout. Wrap any auth-context page in `<AuthShell>{form}</AuthShell>`. |
| `AmbientPipeline` | `ambient-pipeline.tsx` | Static 5-column visual for the auth left panel. Decorative only (`aria-hidden`). |
| `RotatingCaption` | `rotating-caption.tsx` | Cycles through `ROTATING_CAPTIONS` from `lib/landing/constants.ts`, 8s interval, 280ms crossfade, respects reduced-motion. |

---

## 7. Data display patterns

These are the rules for rendering numbers, labels, and counts in the system. Apply them consistently to every dashboard, list, and card you build.

### 7.1 Counts

- Always `font-mono` + `tabular-nums`.
- Color: `--color-ink` for steady-state, `--color-survive` when flashing positive, `--color-ink-muted` when flashing negative.
- Flash is a **color transition** (240ms hold → 280ms back to ink). Never animate position or scale on the count itself.
- A separate **floating `+1` / `−1` sprite** appears above the count on each event. The sprite is keyed on the flash timestamp so React re-mounts it on every flash, re-running the `float-up` 900ms keyframe:

```tsx
{flash && (
  <span
    key={flash.at}
    aria-hidden
    className="absolute right-0 -top-3 font-mono text-[10px] font-semibold pointer-events-none tabular-nums"
    style={{
      color: flash.kind === 'up' ? 'var(--color-survive)' : 'var(--color-sink)',
      animation: 'float-up 900ms cubic-bezier(0.22, 1, 0.36, 1) both',
    }}
  >
    {flash.kind === 'up' ? '+1' : '−1'}
  </span>
)}
```

The `StageColumn` prop shape is `flash?: { kind: 'up' | 'down'; at: number } | null` — always pass the timestamp, not just the kind, so the sprite animation retriggers.

### 7.2 Labels and eyebrows

- Always `font-mono uppercase`.
- Tracking: `0.10em` (small), `0.12em` (default), `0.14em` (eyebrows above sections).
- Color: `--color-ink-muted`.
- Size: 8–11px depending on density. Never 12px or larger — that's headline territory.

### 7.3 Deltas

Inline next to a primary number, smaller, color-coded:

```tsx
<span className="text-[10px] font-medium ml-1.5 text-[var(--color-survive)]">+14 wk</span>
```

`--color-survive` for positive, `--color-sink` for negative. Always with a sign character (`+`, `-`).

### 7.4 Count-ups on viewport entry

For "stat reveal" sections (Proof, dashboards), wire `useInView` to `useCountUp` with a 1200ms duration. Stagger via `transitionDelay` if you have multiple counters in a row:

```tsx
const { ref, inView } = useInView<HTMLElement>({ threshold: 0.3 });
const value = useCountUp(14203, { start: inView, duration: 1200 });
```

### 7.5 Currencies, percentages, time

- Currency: prefix with `$`, suffix with `k`/`M` for round denominations.
- Percentage: integer + smaller `%` glyph at `--color-ink-muted`.
- Days: integer + lowercase `d` (e.g., `14d`).
- Median labels go *above* the number in mono uppercase eyebrow style.

---

## 8. Copy voice

Concrete rules derived from the landing page copy. Apply to every new headline, button, and label.

1. **Use numbers as hooks.** Hero headline is `342 applications in. 4 offers out.` — no adjectives, just two numbers contrasting. Section headlines that have a number should foreground it.
2. **Imperative second-person.** `Start tracking`, `Move it through the stages`, `Read the honest math`. Never `you can`, `we help you`, `our platform offers`.
3. **Ban marketing adjectives.** No `powerful`, `amazing`, `revolutionary`, `seamless`, `effortless`, `enterprise-grade`, `cutting-edge`. If a word would fit on a SaaS landing page from 2018, cut it.
4. **Editorial interruption is rare and earned.** The dark `<HowItWorks>` interrupt is the only place where the page goes black and uses giant type. Use that pattern only when the content genuinely warrants a frame change.
5. **Mono for labels and timestamps, sans for everything else.** A timestamp like `Last updated 14d ago` is mono. A subhead like `Pick up where you left off.` is sans.
6. **Punctuation matters.** Sentences end in periods (the hero literally has two periods in a 6-word headline). Use em-dashes for editorial asides (`—`), not en-dashes or hyphens.

---

## 9. What's deliberately banned

Permanently removed from MKVDATA. If any of these creep back in, the new code is wrong, not the guide.

- ❌ Cyberpunk neon (cyan `#00d4ff`, neon orange, neon purple)
- ❌ Glow shadows (`shadow-[0_0_16px_rgba(0,212,255,0.2)]` and friends)
- ❌ Serif display faces (DM Serif Display, Playfair, Bodoni, etc.)
- ❌ Gradient borders / `gradient-border-card` / `gradient-text` / `gradient-bg`
- ❌ Animated grid backgrounds, ambient mesh, scanlines
- ❌ Scrolling tickers, marquee text
- ❌ Floating HUD panels with neon edges
- ❌ Section-index labels like `01 / Overview` in accent color
- ❌ Brand mark `MKV<span class="text-accent">DATA</span>` (single-word treatment with split coloring)
- ❌ "Terminal" copy metaphors (`Enter Terminal`, `Initialize your analytics terminal`, `Sign in to access your terminal`)
- ❌ Width/height/top/left animations
- ❌ Loops where the user can perceive the reset

---

## 10. File & directory layout

Established structure under `lib/`, `components/`, and `app/`. New components should slot into this layout.

```
lib/
  motion/
    easings.ts                # Pure easing functions + CSS bezier strings
    easings.test.ts
    use-in-view.ts            # IntersectionObserver scroll-reveal hook
    use-count-up.ts           # rAF count-up hook + pure computeCountUpValue
    use-count-up.test.ts
  landing/
    company-templates.ts      # 30 real company names for demo data
    constants.ts              # HERO_STAGES, HERO_BASELINE_COUNTS, METRIC_STRIP,
                              #   PROOF_COUNTERS, ROTATING_CAPTIONS, ANATOMY_STAGES
    pipeline-schedule.ts      # 90s deterministic hero schedule + SVG path defs
    pipeline-schedule.test.ts # Count-conservation invariant test

components/
  landing/
    nav.tsx                   # <LandingNav>
    anatomy.tsx               # <Anatomy>
    intelligence.tsx          # <Intelligence> (composes 3 features)
    intelligence-feature.tsx  # <IntelligenceFeature> primitive
    how-it-works.tsx          # <HowItWorks> dark interrupt
    how-it-works-slide.tsx    # <HowItWorksSlide> primitive
    proof.tsx                 # <Proof> with CountUp counters
    cta.tsx                   # <LandingCTA>
    footer.tsx                # <LandingFooter>
    hero/
      pipeline.tsx            # <HeroPipeline> orchestrator
      sankey-ribbons.tsx      # <SankeyRibbons> SVG background
      stage-column.tsx        # <StageColumn> primitive  ← reusable
      company-card.tsx        # <CompanyCard> primitive  ← reusable (forwardRef)
      flying-card.tsx         # <FlyingCard> overlay
      drop-off-tray.tsx       # <DropOffTray> primitive  ← reusable
      metric-strip.tsx        # <MetricStrip>            ← reusable
      use-pipeline-state.ts   # Reducer + hook + tests
      use-pipeline-state.test.ts
      use-flight-path.ts      # rAF SVG path-following hook (hero only)
  auth/
    auth-shell.tsx            # <AuthShell> 60/40 split layout
    ambient-pipeline.tsx      # <AmbientPipeline> static decorative panel
    rotating-caption.tsx      # <RotatingCaption> 8s cycler
```

### 10.1 Where to put new components for the authed-app rework

- **Page-level shells, layouts, and dashboard wrappers** → `components/app/` (new directory).
- **Reusable building blocks** that aren't already in `components/landing/hero/` → `components/app/primitives/` (or import from the existing hero primitives where appropriate).
- **Pure logic and hooks** → `lib/app/` (mirroring `lib/landing/`).
- **Tests** → colocated with the file, `*.test.ts` next to the source.

The authed app pages currently live under `app/(app)/app/*` and import the old MKVDATA-styled primitives from `components/sidebar-nav.tsx`, `components/ui/*`, `components/application-detail-drawer.tsx`, etc. **All of those will be replaced** by the rework. Do not extend them.

---

## 11. Quick-reference checklist for new pages

Before opening a PR for a new page, verify:

- [ ] Only `Inter` and `JetBrains Mono` fonts. No Geist, no DM Serif, no system fallbacks except in motion/SSR boundaries.
- [ ] All numbers use `font-mono tabular-nums`.
- [ ] All labels/eyebrows are `font-mono uppercase` with 0.10–0.14em tracking.
- [ ] No color outside the 9-token palette.
- [ ] Borders are hairline `border border-[var(--color-line)]` (or dashed for "container that holds dynamic items").
- [ ] Any animation respects `prefers-reduced-motion`.
- [ ] Any animation uses `transform` or `opacity` only (or, for SVG ambient layers, `stroke-width` with explicit sign-off).
- [ ] Anything that loops is authored so the seam is not perceivable.
- [ ] Reusing `MetricStrip`, `StageColumn`, `CompanyCard`, `DropOffTray`, or `AuthShell` where the visual goal matches.
- [ ] Copy passes the "no marketing adjectives" sniff test.
- [ ] No reference to `bg-surface-0`, `text-accent`, `gradient-*`, `ambient-mesh`, `grid-bg`, or `section-index` anywhere.
