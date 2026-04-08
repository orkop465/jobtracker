# Landing + Auth Frontend Rework — Design Spec

**Date:** 2026-04-07
**Status:** Brainstorm complete, awaiting plan
**Scope:** Public landing page (`/`) + auth pages (`/login`, `/register`)
**Follow-up:** A `STYLE-GUIDE.md` will be derived from this work and used to drive a separate spec covering the authed app pages.

---

## 1. Context

JobTracker (currently branded **MKVDATA**) is a Next.js 16 / React 19 / Tailwind v4 / Prisma 7 personal job-application tracker positioned as a product for others to use. The current frontend is a "cyberpunk terminal" — deep navy backgrounds, neon cyan/orange/purple accents, HUD panels, scrolling tickers, DM Serif Display + Geist Mono, ambient meshes, gradient borders.

The user wants a **full pivot** to a calm, editorial, Emil-Kowalski-polish aesthetic: warm off-white canvas, restrained palette, type-led hierarchy, motion that earns its place, and a homepage *animated, alive, and obsessively focused on the hiring pipeline as the product's central story*.

The brand name **MKVDATA** stays.

## 2. Goals & Non-Goals

### Goals

1. Rework `/`, `/login`, `/register` so they feel calm, premium, data-honest, and demonstrably alive — without the cyberpunk-terminal chrome.
2. Make the **hiring pipeline** the unmistakable hero of the landing page, expressed as a **continuously animated visualization** that showcases what the product actually does without requiring marketing copy to explain it.
3. Establish a visual system (palette, typography, spacing, motion vocabulary, components) that will be codified into a `STYLE-GUIDE.md` artifact at the end of this work and used to drive subsequent reworks of the authed app pages.
4. Zero new dependencies. All motion built with React state + native CSS transitions + `requestAnimationFrame` for SVG path-following.
5. Full `prefers-reduced-motion` respect.

### Non-goals

- Reworking authed app pages (`/app`, `/app/applications`, `/app/analytics`, `/app/resumes`, `/app/account`) — handled in a follow-up spec that consumes `STYLE-GUIDE.md`.
- Backend / API / schema changes. Landing data is fully synthetic. NextAuth, OAuth providers, `/api/register`, and Prisma models are untouched.
- Internationalization, blog, docs, marketing routes other than `/`.
- A/B testing, telemetry instrumentation, transactional email templates.
- Real aggregate-user counters on landing — hardcoded for now, easy to wire up later.

## 3. Approved Decisions (from brainstorm)

| # | Decision | Choice |
|---|---|---|
| 1 | Direction | **Full pivot.** Throw out MKVDATA cyberpunk-terminal. Start from a clean editorial/Emil base. |
| 2 | Audience | **Real product, marketing landing page** for strangers. Conversion is the goal. |
| 3 | Pipeline visualization concept | **Fusion of A (Sankey flow) + B (Kanban with motion).** Kanban columns are the structure; cards physically fly between columns along visible ribbon paths. |
| 4 | Scope & phasing | **Landing + auth pages first** as one spec. Authed app pages in a follow-up spec, driven by a `STYLE-GUIDE.md` derived from this shipped work. |
| 5 | Brand name | **Keep MKVDATA.** |
| 6 | Landing page sections (post-hero) | **Anatomy → Intelligence → How it actually works → Proof → CTA.** "Honesty" interrupt cut; "How it actually works" added as a typographic dark interrupt. |
| 7 | Hero data source | **Fully synthetic, hardcoded.** Loop must be invisible — no perceivable reset. |
| 8 | Mobile hero treatment | **Vertical rail.** Five-column kanban becomes a top-down stations list on phones. |
| 9 | Typography | **Inter (sans) + JetBrains Mono (data).** No serif anywhere. |
| 10 | Palette | **Warm off-white canvas, ink black, single survive-green accent.** No cyan/orange/purple. |
| 11 | New dependencies | **None.** All motion built with React state + CSS + rAF. |

## 4. Visual System

### 4.1 Palette

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#FAFAF7` | Page background — warm off-white, not pure |
| `surface` | `#FFFFFF` | Card / stage column backgrounds |
| `ink` | `#0A0A0A` | Primary text, strong borders, CTA fill |
| `ink-muted` | `#737373` | Secondary text, labels, meta |
| `line` | `#E7E7E2` | Default borders, dividers |
| `line-subtle` | `#ECECEC` | Inner card borders, micro-dividers |
| `survive` | `#15803D` | Offer column, positive deltas, "make it" accent |
| `survive-soft` | `#ECFDF5` | Offer column background tint |
| `sink` | `#9A3412` | Negative deltas only — used sparingly |

No additional accents. No dark mode for landing/auth (the authed app may use a darker treatment in the follow-up spec).

### 4.2 Typography

- **Display / headings:** `Inter` 600. Tracking `-0.02em` at 40px+, `-0.01em` at 24–39px. Tabular numerics enabled on all numeric displays.
- **Body:** `Inter` 400. 15px / line-height 1.55.
- **Data / labels / stage names / counters:** `JetBrains Mono` 500. Uppercase, tracking `0.12em` at 9–10px. Every label, stat, timestamp, and counter on the site uses mono.
- **No serif anywhere.**

Both fonts loaded via `next/font/google`, latin subset, `display: 'swap'`, exposed as `--font-inter` and `--font-jetbrains-mono`.

### 4.3 Spacing & Layout

- Spacing scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96` (Tailwind 1, 2, 3, 4, 6, 8, 12, 16, 24)
- Container max-widths: standard `1160px`, hero `1240px`
- Side padding: `24px` desktop, `18px` mobile
- Radii: `4px` chips, `6px` cards/inputs, `10px` large panels. No rounded-full except live-pulse dot.

### 4.4 Motion Principles

1. **All loops must be seamless.** A visitor watching for 60 seconds must never see the animation jump back to start. Achieved via steady-state simulation (cards rotate identities) or sine-cycle continuity (ribbons). Any animation that *can't* be made seamless gets cut.
2. **Transform + opacity only.** No animated `width`/`height`/`left`/`top`. Hardware-accelerated.
3. **Easing tokens:**
   - Entrances: `--ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1)`
   - Loops: `--ease-in-out-cubic: cubic-bezier(0.65, 0, 0.35, 1)`
4. **Duration tokens:**
   - `--dur-micro: 180ms`
   - `--dur-standard: 280ms`
   - `--dur-entrance: 480ms`
   - `--dur-hero-reveal: 640ms`
   - Ambient loops: `8–12s`
5. **`prefers-reduced-motion`:** full collapse to opacity-only fades; no transforms, no `setInterval`, no `rAF`. Hero collapses to a static snapshot.

## 5. Landing Page Architecture (`/`)

Top-to-bottom layout. Each section's specific motion respects the principles above.

### 5.1 Nav (sticky)

- `64px` tall, `canvas` background, `backdrop-blur(8px)`
- `1px line` bottom border appears only after scroll > 8px
- Brand mark: solid black dot (`●`, doubles as live-pulse with a 3s glow cycle) + `MKVDATA` wordmark
- Links: `How it works · The 10 stages · Sign in`
- CTA button: `ink` filled, `surface` text, label `Start tracking →`
- **Mobile:** hamburger reveals drawer with the same links + a full-width CTA pinned at the bottom

### 5.2 Hero (the kanban + Sankey fusion)

> **Amended** after the first round of visual feedback. Key changes: the
> drop-off tray was replaced with a 6th "Closed" column; new cards
> materialize inside the Applied column instead of sliding in from
> off-screen; each column arrival / departure fires a floating +1 / −1
> sprite; the green "survive" ribbon overlay was removed (it read as a
> solid bar rather than a ribbon at 26px × 900px).

The visual centerpiece. Full width up to `1240px`. Desktop `min-height: 88vh`, mobile: inner kanban is `min-width: 780px` inside an `overflow-x-auto` container so it scrolls horizontally rather than cramming.

**Layout (desktop):**

```
[ ●  Live pipeline · last 90 days ]
"342 applications in.
 4 offers out."                                    [Start tracking →]
[Watch your search move. Every card is a real company...]

[ TOTAL · RESPONSE · ACTIVE · VELOCITY · OFFERS ]   ← metric strip

┌────────────────────────────────────────────────────────────────────┐
│ Applied   Screen   Interview   Final   Offer   Closed              │
│  ┌───┐    ┌───┐    ┌───┐       ┌───┐   ┌───┐   ┌───┐               │
│  │ A │    │ E │    │ J │       │ M │   │ O │   │ -X̶- │ ← dimmed,  │
│  │ B │    │ F │    │ K │       │ N │   │ P │   │ -Ȳ- │   line-    │
│  │ C │←──→│ G │    │ L │←──→...│   │   │   │   │ -Z̄- │   through  │
│  │ D │    │ H │    │   │       │   │   │   │   │     │            │
│  └───┘    └───┘    └───┘       └───┘   └───┘   └───┘               │
│  ━━━━━━━ single ink breathing ribbon spans the 5 active ━━━━        │
│   (no green overlay; Closed column sits outside the ribbon layer)  │
└────────────────────────────────────────────────────────────────────┘
```

**Content:**

- Live-pulse eyebrow: `● [LIVE PIPELINE · LAST 90 DAYS]` (mono, ink-muted)
- Headline: `"342 applications in."` (line 1, ink) + `"4 offers out."` (line 2, ink-muted, italic-style not actual italic). 64px desktop / 40px mobile, Inter 600, tracking `-0.03em`, line-height `1.05`
- Sub-paragraph: 14–15px ink-muted, max-width 520px
- CTA button: `Start tracking →` (right-aligned on desktop, below headline on mobile)
- Metric strip: 5 cells, mono labels above big numbers, dividers between
  - `TOTAL APPLIED: 342 +14 wk`
  - `RESPONSE RATE: 25.4%`
  - `ACTIVE PIPELINE: 62 +3`
  - `MEDIAN VELOCITY: 14d`
  - `OFFERS: 4 +1` (survive color)
- 6 stage columns: `Applied · Screen · Interview · Final · Offer · Closed`. The five active stages are the 10-stage schema collapsed for the hero; the Closed column is the terminal bucket for retired applications (rejected / withdrawn / ghosted, rendered as a single "closed" state in the hero).
- Each column header: stage name (mono, uppercase) + live count (mono, larger)
- On every column event, a floating **+1 / −1 sprite** rises above the header for 900ms (green for arrivals, sink-color for departures), keyed by timestamp so each event re-triggers the `float-up` keyframe.
- Closed column is visually distinct: dashed border, muted text, cards rendered with `opacity-50` + `line-through` on the company name. Flights still land there via the existing `applied-dropoff` / `screen-dropoff` / `interview-dropoff` / `final-dropoff` SVG paths.

**Demo data (real company names, public, generic):** Linear · Stripe · Figma · Vercel · Notion · Raycast · Supabase · Retool · Resend · Sanity · Cal.com · Clerk · Neon · Browser Co · Arc · Anthropic · OpenAI · Coinbase · Ramp · Mercury · Datadog · GitHub · Plausible · PostHog · Sentry · Replicate · Modal · Replit · Liveblocks · Ably. Demo data only — no claim of who applied where.

**Mobile hero:**

> Amendment: the 90° vertical-rail design was dropped in the first revision. The hero now renders the same 6-column kanban on all viewports, wrapped in `overflow-x-auto` with an inner `min-width: 780px`. On mobile, users scroll the hero horizontally to see all six columns. This preserves the identity of the centerpiece and avoids a second layout to maintain.

The `+1` / `−1` sprites, the fade-up entrance for new cards, and the breathing ribbon are shared across desktop and mobile. The Closed column is visible on both.

### 5.3 Anatomy section · "Ten stages between 'applied' and 'hired'"

> **Amended** after the first round of visual feedback. Percentages were
> unclear and not mathematically self-consistent; they are now labelled
> "advance rate" and calibrated so the product across active stages
> matches the hero's `4 offers / 342 applications = 1.17%` ratio.

- `py-32`, canvas background
- Eyebrow: `● STAGE BY STAGE` (mono, ink-muted)
- h2: `"Ten stages between 'applied' and 'hired'. You've been tracking three."` (44px Inter 600)
- Supporting paragraph: a short explainer naming what the percentages mean — "Each percentage is the median advance rate — the share of applications at that stage that made it to the next one. Multiplied across every active stage it compounds to roughly 1.2% — the actual yield of most job searches."
- Below: horizontal strip of 10 stage cards, one per stage in the schema
  - Stages split into 3 variants:
    - **advance** (6 cards): Applied 25% · Recruiter Screen 60% · OA 55% · Interview R1 55% · Interview R2 58% · Interview R3 45%. Each shows the big percentage, a mono "advance rate" eyebrow underneath, and "~Nd typical" days below.
    - **end** (1 card): Offer — survive-tinted background, green ✓ instead of a percentage, "end of pipeline" eyebrow, "~2d to decide" days.
    - **closed** (3 cards): Rejected · Withdrawn · Ghosted — dashed border, 60% opacity, no percentage, "closed" eyebrow (vocabulary parity with the hero's Closed column).
- Layout: `grid-cols-2 sm:grid-cols-5 lg:grid-cols-10` — 2 cards per row on narrow mobile, 5 at tablet, 10 across on desktop. Same eight-per-row horizontal scroll fallback on xs.

**Motion:**

- On scroll into view, cards fade up in sequence with `80ms` stagger, `480ms` ease-out-quart
- Hover: card raises `-4px` translate-y over `200ms`, neighbors dim to `0.6` opacity over `200ms`

### 5.4 Intelligence section · "What your spreadsheet can't tell you"

`py-32`, canvas background. Three feature blocks stacked vertically (NOT a 3-column grid), each block taking the full container. Layout per block: left `1/3` text + right `2/3` live mini-viz.

**Block 4a · Source effectiveness**
- Headline: `"Your spreadsheet can't show you which channel is lying to you."`
- Caption: `"Referrals convert 8× better than LinkedIn. We do the math."`
- Viz: horizontal bar chart, 5 sources (LinkedIn / Referral / Recruiter outreach / Company site / Job board), bars fill on scroll into view, the leader (Referral at 42%) gets `survive` fill, others stay `ink` at 0.85 opacity

**Block 4b · Resume A/B**
- Headline: `"You don't have one resume. You have versions. They don't perform the same."`
- Caption: `"Version B. +14% response. Run two, stop guessing."`
- Viz: two resume mock-cards side by side (label, filename, file glyph), each with a response-rate chip below. Winner card is `-2px` raised with shadow + small `survive` checkmark animating in on scroll-into-view

**Block 4c · Velocity bottleneck**
- Headline: `"Every day you sit in 'Interview Round 2' is a day you're not closing."`
- Caption: `"Find the stage where your search loses the most days. Then go fix it."`
- Viz: horizontal segmented bar, 5 segments = 5 stages, segment width = average days-in-stage. The longest segment (Interview R2 → R3 at 17 days) gets a soft `sink` tint and a `BOTTLENECK` mono label

**Motion:**

- Each block animates when it enters the viewport (`IntersectionObserver`)
- Bars grow from `width: 0` via `transform: scaleX()` over `640ms` ease-out-quart
- Numeric values CountUp from 0 in sync with the bar growth
- Ordering: viz first, then text (text was already visible, viz fills in)

### 5.5 How it actually works · the dark interrupt

> **Amended** after the first round of visual feedback. The giant number no
> longer translate-x animates on scroll-in (it was reading as a layout
> stutter), and the visual moved from the bottom-right corner of the slide
> to sit next to the headline in a proper 2-column grid.

The page's only dark section. **4 full-viewport scroll-driven slides on a sustained `ink` background.**

- Background `ink` (#0A0A0A), text `canvas` (#FAFAF7)
- Each slide is `min-height: 80vh`
- Eyebrow once, at the top of slide 01 only: `● HOW IT ACTUALLY WORKS`
- Each slide layout (desktop):
  ```
  [ 01 ]  ← giant mono number, top-left, static watermark (no animation)

    +-------------------------------+----------------------+
    |  Drop in an application.      |                      |
    |  Any source — LinkedIn,       |     [tiny visual]    |
    |  a referral, a cold email.    |                      |
    +-------------------------------+----------------------+
     ^ left column: 1fr              ^ right column: 360px
  ```
  - Outer container: `max-w-[1160px]` centered, `grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 lg:gap-16 items-center`
  - Mobile stacks the grid: headline + sub first, visual below.

**Slide content:**

| # | Headline | Sub | Visual |
|---|---|---|---|
| 01 | `Drop in an application.` | Any source — LinkedIn, a referral, a cold email, a career fair. | Micro-mock of the Quick Add form with one field appearing to type itself |
| 02 | `Attach the resume you sent.` | Version as many as you want. The tool learns which one gets callbacks. | Two resume thumbnails side by side, one subtly winning (small green check animates in) |
| 03 | `Move it through the stages.` | Ten real stages, from Applied to Offer. One click per transition. The pipeline updates itself. | A single card sliding from one column to the next in a tiny 3-column micro-kanban |
| 04 | `Read the honest math.` | Conversion per stage, days lost in each bottleneck, which source is lying to you, which resume is lying to you. No filter. | A micro-line chart or single conversion-rate number that ticks |

**Motion:**

- Giant number: **static**, opacity `0.35`, no translate animation. Acts as a decorative watermark anchored to the top-left regardless of scroll position.
- Headline: opacity `0 → 1` + small translate-y `8px → 0` over `640ms` ease-out-quart when the slide enters the viewport.
- Sub copy: opacity `0 → 1` over `280ms`, delayed `240ms` after the headline.
- Visual: opacity `0 → 1` over `480ms`, delayed `320ms`. No translate (it's sitting in a grid cell; animating position would reintroduce the same layout-drift problem the number used to have).
- **Mobile:** same timings, headline scales down to the lower end of `clamp(40px, 6vw, 80px)`.

**Section ends with the canvas returning to light at slide 04's bottom edge.** No animated transition between dark and light — a hard cut, intentional.

### 5.6 Proof · aggregate counters

- `py-32`, canvas background
- One row of 4 big-type counters
  - `14,203 / APPS TRACKED`
  - `1,247 / OFFERS LANDED`
  - `28 / MEDIAN DAYS TO OFFER`
  - `$127k / MEDIAN COMP`
- Numbers: 64px Inter 600, ink color
- Labels below: mono 10px uppercase, ink-muted, tracking `0.12em`
- Caption above row: `● ACROSS EVERY USER` (mono eyebrow)

**Motion:**

- On scroll into view, each number CountUps from 0 to target over `1.2s`, `120ms` stagger between counters
- Below the row, an 80%-width divider draws left-to-right via `transform: scaleX(0 → 1)` over `800ms`

**Note:** these numbers are hardcoded in `lib/landing/constants.ts`. They're written as if real to set the tone for when they become real. Trivial to swap to a live API later.

### 5.7 CTA section

- `py-40`, canvas background, centered, single focus
- Headline: `"Start with one application."` (44px Inter 600)
- Button: `Start tracking →` (ink fill, surface text, 18px font, 18px 32px padding, 6px radius)
- Microcopy: `Free while it's in beta.` (mono 11px, ink-muted, below button)
- No form inline — clicking the button goes to `/register`

**Motion:**

- Button has an ambient `box-shadow` pulse: `0 0 0 0 rgba(10,10,10,0)` → `0 0 0 6px rgba(10,10,10,0.08)` → back, `2.8s` cycle, seamless (sine-driven so there's no reset point)

### 5.8 Footer

- `py-12`, line top border
- Single row, mono `11px`, ink-muted
  - Left: `● MKVDATA — Your pipeline, quantified.`
  - Center: `Terms · Privacy · GitHub`
  - Right: `v4.2.1`

## 6. Hero Choreography (the seamless loop)

### 6.1 Core principle

The hero runs as a **continuous steady-state simulation**, not a repeating animation. Departures and arrivals are balanced on every axis. There's no t=0 to return to; the system is never in a "starting position." This is how the invisible-loop constraint is structurally enforced rather than merely hidden.

### 6.2 Loop mechanics

1. **Card pool.** 30 company+role templates predefined in `lib/landing/company-templates.ts`. At any given time ~16 are visible across the 5 columns + drop-off tray. The other 14 are pending entry.
2. **Transition schedule.** A deterministic, stochastic-feeling schedule drives transitions. Every `2–4s` (jittered within bounds, but the jitter is part of the static schedule — no runtime randomness) one transition fires. The schedule is **90 seconds long**. At t=90 the system state is structurally identical to t=0 (same column populations, same counts) but no individual card is in the same position — the identities have rotated through the pool. The schedule then repeats. Because no individual card is where it was 90 seconds ago, the viewer can't see a "rewind."
3. **Inflow/outflow balance over the 90s cycle** (shipped version):
   - 10 cards enter at Applied. They materialize **inside** the column via a `.card-enter` fade-up animation (`fade-up 480ms ease-out-quart both`). They do NOT fly in from off-screen — the previous design did, and it read as "weird" in user feedback because the entry motion didn't match the inter-column transit motion.
   - 9 cards move from active stages to the Closed column via existing SVG drop paths (`applied-dropoff` / `screen-dropoff` / `interview-dropoff` / `final-dropoff`). There, they're appended to a ring-buffer list of up to 6 visible cards in the Closed column, with dimmed styling and line-through company names.
   - 6 cards progress Applied → Screen → Interview, 4 continue to Final, 2 reach Offer (per the schedule's authored counts).
   - 1 bookkeeping transition at the seam drains the offer count back to baseline via a hidden `offer → inflow` entry.
   - Aggregate counts for the five active stages return exactly to baseline at t=90.
4. **Count tickers.** The 6 displayed stage counts tick when transitions fire. In addition to the existing color flash on the count text itself, a floating **`+1` / `−1` sprite** rises above the column header for 900ms (`float-up` keyframe, survive color for arrivals, sink color for departures) so the user can see the event even if they're not tracking the exact number. The sprite is keyed by timestamp so each event re-mounts it and retriggers the animation.

### 6.3 Per-transition animation

Fires every 2–4s. Total visual duration ~1080ms.

```
t=0ms      Card border pulses survive-green for 120ms ("I'm leaving" signal)
t=120ms    Card detaches: z-index raise, scale 1 → 1.04, shadow grows.
           Position becomes absolute, set to source coordinates.
t=160ms    Card begins curved path to destination column along an SVG path.
           Path duration: 640ms, eased via --ease-in-out-cubic.
           Position computed each rAF frame via path.getPointAtLength().
t=800ms    Card arrives at destination column's tail position.
           Scale 1.04 → 1, shadow fades, z-index drops.
t=800ms    Destination column count flashes +1 in survive-green
           (240ms hold, 160ms fade to default).
t=800ms    Source column count flashes −1 in ink-muted
           (240ms hold, 160ms fade to default).
t=960ms    Card settles into destination layout position, border returns to line.
```

**SVG paths:** the realistic transition graph is sparse — cards move forward one stage at a time, or drop off to the reject tray. That gives:
- Forward: `applied → screen`, `screen → interview`, `interview → final`, `final → offer` (4 paths)
- Drop-off: `applied → dropoff`, `screen → dropoff`, `interview → dropoff`, `final → dropoff` (4 paths)
- Optional skip: `applied → interview` (recruiter bypasses screen) — 1 path

Total: ~9 named paths. Each is a static `<path>` rendered hidden inside the hero SVG. The transitioning card uses `path.getPointAtLength(t * path.getTotalLength())` per frame to derive `(x, y)`. Exact `d=""` coordinates are authored in the plan phase alongside column layout (see §10.5).

### 6.4 Ribbon breathing

Independent of card transitions. The single background ink ribbon dilates stroke-width on an `8s` sine cycle:
- Main flow: `72 → 78 → 72` px

A sine wave is inherently periodic, so there's no seam. Opacity stays fixed.

> **Amendment.** The spec originally also specified a secondary "survive" green ribbon overlay at stroke-width `26 → 28 → 26`. It was removed in the first visual revision because at 26px stroke across ~900 horizontal units it rendered as a flat green bar through the middle of the board rather than a ribbon. Only the ink gradient ribbon remains.

### 6.5 Closed column (was: Drop-off pour)

When a card's transition target is the Closed column (internal name `dropoff`), it follows one of the existing drop-off SVG paths (`applied-dropoff` etc.) that bend downward and to the right. On arrival, the card is appended to the Closed column's ring buffer and rendered in dimmed, line-through style. The buffer caps at 6 visible cards — oldest falls off the top as new ones arrive.

> **Amendment.** The spec originally specified a horizontal drop-off tray below the 5 active columns with chip-format strike-through cards. In the first visual revision this was replaced with a proper 6th column ("Closed") sitting after Offer, so the dropped cards share the kanban metaphor rather than sitting in a separate visual region. The closed count displays in the column header; the `+1` sprite fires on arrival the same as any other column.

### 6.6 Initial load choreography (one-time, 0–1500ms)

```
0–200ms     Canvas fade-in
200–480ms   Headline reveal:
              "342 applications in." → translate-y 12px + opacity 0 → 1
              180ms gap
              "4 offers out." → same animation
            (Inter 600, --dur-hero-reveal duration each)
480–720ms   Metric strip draws in:
              Each cell's underline sweeps left-to-right (scaleX 0 → 1)
              Numbers CountUp from 0 (--dur-hero-reveal)
720–960ms   Stage columns fade up in sequence, 60ms stagger per column
960–1200ms  Cards populate columns (fade + scale 0.96 → 1)
1200ms      Sankey ribbons fade in to full opacity
1500ms      First steady-state transition fires; loop begins
```

After 1500ms, the hero is in steady-state forever. No reset, no replay, no loop boundary visible.

### 6.7 Mobile hero choreography (vertical rail)

- No flying cards
- A single soft `survive-green` "pulse dot" travels *down* the vertical rail every `6s`, passing each station and making its count flash briefly
- The pulse reaches the Offer station at the bottom and fades out
- A new pulse fades in at Applied at the top on the same `6s` cycle, but the fade-in of the new pulse overlaps the fade-out of the old, so there's never a gap and never an obvious reset
- Counter behavior: same as desktop — each station's count occasionally ticks ±1 with a survive-green flash, returning to baseline over the cycle
- Drop-off: not shown on mobile

### 6.8 Reduced-motion treatment

When `prefers-reduced-motion: reduce`:

- Hero collapses to a **static snapshot**: all cards in their baseline positions, counts at baseline values, ribbons visible but not breathing
- No card transitions, no counter ticks, no pulses, no breathing ribbons
- No `setInterval`, no `rAF` — zero motion CPU
- Initial load still happens but uses opacity only (no transforms)
- The hero is still legible and still communicates the pipeline; it's just frozen

## 7. Auth Pages (`/login`, `/register`)

### 7.1 Shared layout

Split screen, **60/40 desktop**, stacked on mobile.

```
+------------------------+---------------+
|                        |               |
|  Left panel            |  Right panel  |
|  (ambient pipeline)    |  (form)       |
|  60% width             |  40% width    |
|                        |               |
+------------------------+---------------+
```

### 7.2 Left panel — "ambient pipeline"

- `canvas` background, full height
- Wordmark `● MKVDATA` top-left, `24px` padding
- Centered: a **scaled-down, simplified version of the hero kanban** — 5 columns, ~3 cards per column, same steady-state transition system but at half speed (new transition every `4–6s` instead of `2–4s`) so it doesn't distract from the form
- Below the mini-kanban: one mono caption that rotates between a fixed set of stats every `8s`, crossfading. Fixed width so nothing shifts. Captions:
  - `14,203 applications tracked`
  - `1,247 offers landed`
  - `28 days median to offer`
  - `Referrals convert 8× better than LinkedIn`
  - `Resume A/B testing built in`
- Same synthetic data as hero
- **Mobile:** left panel becomes a `180px` tall strip above the form, showing only the metric strip (no kanban — not enough space)

### 7.3 Right panel — form

- `surface` background, full height, centered form max-width `360px`
- Form structure:
  - Eyebrow: `SIGN IN` / `CREATE ACCOUNT` (mono 10px uppercase tracking 0.12em ink-muted)
  - h1: `"Welcome back."` / `"Start tracking."` (32px Inter 600)
  - Subcopy: 14px ink-muted, one line
  - Inputs: 1px line border, 6px radius, 44px height, 14px font, 12px 14px padding
    - Focus state: border transitions to `ink` over 180ms, 2px focus ring outside in `ink` at 8% alpha
  - Labels: mono 10px uppercase tracking 0.1em, positioned **above** inputs, ink-muted color
  - Primary button: ink fill, 14px font, full width, 48px height, ambient pulse (same as landing CTA)
  - OAuth buttons (GitHub, Google): 1px line border, surface fill, icon left, text center, same height/radius as primary
  - "Or continue with" divider: thin line with mono 9px uppercase label centered
  - Footer link: `Don't have an account? Create one →` / `Already have an account? Sign in →` (12px ink-muted, underline on hover)

### 7.4 Auth motion

- On load: right panel fades in first (320ms), then left panel mini-kanban fades up (480ms, delayed 120ms)
- Left panel steady-state simulation begins at 800ms
- Form validation errors appear below inputs: 10px font, sink color, translate-y 4px fade-in 180ms
- Input border pulses sink once on submit-with-error
- Button states: disabled lowers opacity to 0.5; loading replaces button text with a 16px centered spinner rotating 800ms/turn
- `prefers-reduced-motion`: left panel becomes static snapshot; form animations collapse to opacity-only

### 7.5 Auth correctness & a11y

- Tab order is form-first, not left-panel-first
- Left panel gets `aria-hidden="true"` — it's atmosphere, not content
- Inputs have real `<label>` elements even though they're styled as eyebrows above
- All NextAuth / OAuth / `/api/register` plumbing stays exactly as-is. Only the visual layer is reworked.

## 8. Implementation Approach

### 8.1 Dependencies

**No new dependencies.** All motion built with React state + native CSS transitions + `requestAnimationFrame` for SVG path-following. No `framer-motion`, no `gsap`.

### 8.2 File-system changes

```
app/
  (public)/
    page.tsx                    [REWRITTEN]
  (auth)/
    login/page.tsx              [REWRITTEN]
    login/login-client.tsx      [REWRITTEN]
    register/page.tsx           [REWRITTEN]
  globals.css                   [REWRITTEN — new tokens, motion vars]
  layout.tsx                    [UPDATED — fonts]

components/
  landing/                      [NEW]
    nav.tsx
    hero/
      pipeline.tsx              # <HeroPipeline> — state machine + viz
      stage-column.tsx
      company-card.tsx
      flying-card.tsx
      sankey-ribbons.tsx
      metric-strip.tsx
      drop-off-tray.tsx
      use-pipeline-state.ts     # the reducer hook
      use-flight-path.ts        # rAF + getPointAtLength path follower
    anatomy.tsx                 # <TenStagesStrip>
    intelligence.tsx
    intelligence-feature.tsx
    how-it-works.tsx            # the dark interrupt
    how-it-works-slide.tsx
    proof.tsx                   # <ProofCounters>
    cta.tsx
    footer.tsx
  auth/                         [NEW]
    auth-shell.tsx              # split layout
    ambient-pipeline.tsx        # half-speed mini-kanban
    rotating-caption.tsx

lib/
  landing/                      [NEW]
    company-templates.ts        # 30 real companies
    pipeline-schedule.ts        # 90s deterministic transition schedule + SVG path defs
    constants.ts                # metric strip baseline, proof counters, captions
  motion/                       [NEW]
    use-in-view.ts              # IntersectionObserver hook
    use-count-up.ts             # CountUp hook
    easings.ts                  # exported cubic-bezier strings
```

### 8.3 What's removed from `globals.css`

- `.ambient-mesh`, `.grid-bg`, `.gradient-border-card`, `.grid-lines`, `.terminal-cursor`, `.glass-panel`, `.gradient-text`, `.gradient-text-subtle`, `.gradient-bg`, `.section-index`
- All float / ticker / glow / blink-cursor / bar-grow keyframes
- All `--color-surface-*` deep-navy tokens
- `--color-accent` cyan, `--color-orange`, `--color-purple`, `--color-positive`, `--color-negative`, `--color-info`, `--color-warning`
- `.auth-container` radial gradient

### 8.4 New `globals.css` token surface

```css
@theme inline {
  --color-canvas: #fafaf7;
  --color-surface: #ffffff;
  --color-ink: #0a0a0a;
  --color-ink-muted: #737373;
  --color-line: #e7e7e2;
  --color-line-subtle: #ececec;
  --color-survive: #15803d;
  --color-survive-soft: #ecfdf5;
  --color-sink: #9a3412;

  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains-mono);

  --ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out-cubic: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-micro: 180ms;
  --dur-standard: 280ms;
  --dur-entrance: 480ms;
  --dur-hero-reveal: 640ms;
}
```

Plus the existing `tabular-nums`, `focus-ring`, and any keyframes specifically introduced by the new design (e.g., `count-flash-positive`, `count-flash-negative`, `ribbon-breathe`, `pulse-soft`).

### 8.5 Font swap

In `app/layout.tsx`: `Geist Sans + Geist Mono + DM Serif Display` → `Inter + JetBrains Mono`. Both via `next/font/google`, latin subset, `display: 'swap'`. CSS variables `--font-inter`, `--font-jetbrains-mono`. Removed: `--font-dm-serif`.

### 8.6 Hero state machine shape

```ts
type CardId = string;
type ColumnId = "applied" | "screen" | "interview" | "final" | "offer" | "dropoff";

interface PipelineState {
  cards: Record<CardId, {
    template: number;          // index into COMPANY_TEMPLATES
    column: ColumnId;
    index: number;             // position within column
  }>;
  flying: Array<{
    cardId: CardId;
    from: ColumnId;
    to: ColumnId;
    pathName: string;
    startedAt: number;
  }>;
  counts: Record<ColumnId, number>;
  cycleStartedAt: number;      // ms timestamp
}

type Action =
  | { type: "tick"; now: number }
  | { type: "fireTransition"; cardId: CardId; from: ColumnId; to: ColumnId; pathName: string }
  | { type: "completeTransition"; cardId: CardId };
```

A single `setInterval(50ms)` dispatches `tick`. The reducer reads the deterministic `pipeline-schedule.ts` to know which transitions are due and fires them. **No randomness at runtime** — the schedule is fixed at module load, so initial state matches between SSR and hydration. The schedule's 90-second cycle is computed by taking `(now - cycleStartedAt) % 90000` and looking up the active transitions.

### 8.7 Flying card path-following

For each in-flight card, an `rAF` loop computes its position via:

```ts
const t = clamp((now - flight.startedAt) / 640, 0, 1);
const eased = easeInOutCubic(t);
const point = pathRef.current.getPointAtLength(eased * pathRef.current.getTotalLength());
cardRef.current.style.transform = `translate(${point.x}px, ${point.y}px) scale(${1 + 0.04 * (1 - Math.abs(eased - 0.5) * 2)})`;
```

When `t === 1`, dispatch `completeTransition`. The card is removed from the `flying` overlay and added back to its destination column's normal layout.

### 8.8 Counter ticker

For Proof + metric strip CountUp on viewport-enter: `useCountUp(target, duration)` hook using `rAF` to interpolate, returning the current value as a tabular-numeric string.

For per-stage `+1/−1` flashes during hero transitions: just a state update + a `240ms` color flash via CSS class. The digit value flips instantly — tabular monospace makes the flip visually invisible.

### 8.9 Performance budget

| Metric | Target |
|---|---|
| Landing page JS (gzipped) | ≤ 90kb |
| LCP (Fast 3G) | < 2.0s |
| CLS | 0 |
| Hero animation FPS (M1 Air) | 60 sustained |
| Hero animation FPS (mid-2019 i5) | ≥ 50 sustained |
| `prefers-reduced-motion` overhead | 0 (no rAF, no setInterval) |

**CLS = 0** because:
- All numeric displays use tabular monospace (no width shift)
- The metric strip has fixed column widths
- Hero column heights are fixed at viewport-load size
- Proof counters reserve their max-width-of-final-value width

### 8.10 What's NOT touched

- `prisma/schema.prisma`
- `app/api/*` (any route)
- `app/(app)/app/**/*` (all authed pages)
- `auth.ts`, NextAuth config, OAuth providers, `/api/register` route
- `components/ui/{button,input,card,select,modal,toast,...}` — these stay; the auth forms reuse `Button` and `Input` (their styling updates automatically via the `globals.css` token swap)
- `cloudbuild.yaml`, `Dockerfile`, deployment infra

## 9. Acceptance Criteria

A reviewer (or the next plan-writer) can verify the spec is satisfied by checking:

### 9.1 Visual

- [ ] No cyan, orange, purple, neon, or saturated cyberpunk tones anywhere on `/`, `/login`, `/register`
- [ ] No DM Serif Display, no Geist anywhere — only Inter + JetBrains Mono
- [ ] No ambient mesh, no grid background, no scrolling ticker, no floating HUD panels, no gradient borders
- [ ] Every numeric display uses tabular monospace (counts, %, $, days)
- [ ] Every label/eyebrow uses mono uppercase with 0.12em tracking
- [ ] The `● MKVDATA` wordmark appears exactly once in nav and once in footer. (The `●` glyph alone may appear as a live-pulse eyebrow decorator on any section — it's a shared motif, not a second brand mark.)

### 9.2 Hero motion

- [ ] After initial load, cards visibly move between columns every 2–4 seconds
- [ ] Stage counters flash +1/−1 on arrivals/departures
- [ ] Sankey ribbons visibly breathe on an 8s cycle
- [ ] Drop-off tray receives strike-through chips that recycle without growing the tray
- [ ] **Watching the hero for 120 seconds reveals no perceivable reset point** (the steady-state simulation works as designed)
- [ ] Headline `342 applications in. 4 offers out.` is exactly that copy
- [ ] CLS during hero load is 0
- [ ] Hero runs at ≥ 50 fps on a mid-2019 i5

### 9.3 Reduced motion

- [ ] With `prefers-reduced-motion: reduce` set, the hero is a static snapshot — no card movements, no count flashes, no breathing ribbons, no ambient pulses anywhere on the page
- [ ] No `setInterval` or `rAF` loops are running in reduced-motion mode (verifiable via DevTools performance tab)
- [ ] The page is still fully legible and the pipeline metaphor is still communicated in reduced-motion mode

### 9.4 Sections

- [ ] Landing page has exactly these sections in order: Nav · Hero · Anatomy · Intelligence · How it actually works · Proof · CTA · Footer
- [ ] Anatomy section shows all 10 stages from the schema, with the 3 terminal outcomes (Rejected/Withdrawn/Ghosted) at 60% opacity
- [ ] Intelligence section has 3 vertically-stacked feature blocks (NOT a 3-column grid), each with text on the left and live mini-viz on the right
- [ ] "How it actually works" section is on `ink` background, contains 4 scroll-driven slides with giant mono numbers (01–04) and Inter 600 verb headlines
- [ ] Proof section has exactly 4 counters with CountUp animation on scroll-into-view

### 9.5 Auth pages

- [ ] `/login` and `/register` use the split 60/40 layout with ambient pipeline on the left
- [ ] Mobile auth pages stack the form below a 180px metric strip
- [ ] Forms use `Inter` + `JetBrains Mono`, line borders, ink fill primary buttons
- [ ] All NextAuth + OAuth + `/api/register` functionality continues to work unchanged
- [ ] Auth forms' tab order is form-first; left panel has `aria-hidden="true"`
- [ ] Reduced-motion respected on auth pages (left panel static, form fades only)

### 9.6 Implementation hygiene

- [ ] No new npm dependencies added
- [ ] All animation transforms are GPU-eligible (translate / scale / opacity / box-shadow only)
- [ ] No randomness at runtime in the hero schedule (SSR/hydration match)
- [ ] Old MKVDATA-specific CSS (ambient mesh, gradient borders, etc.) is fully removed from `globals.css`
- [ ] `STYLE-GUIDE.md` is generated as the final task of this spec's plan and lands in the same PR

## 10. Open Decisions Deferred to Plan Phase

These weren't worth slowing the brainstorm for, but the plan-writer should pick a position:

1. **Where exactly does `STYLE-GUIDE.md` live?** Probably `docs/superpowers/STYLE-GUIDE.md` to sit next to specs, but `docs/style-guide.md` or `STYLE-GUIDE.md` at repo root are fine. Plan-writer picks.
2. **Anatomy section glyphs.** Each of the 10 stage cards needs a small SVG glyph. The plan should include either a list of inline SVG glyphs to ship or a decision to use simple geometric shapes. No external icon library.
3. **Exact 30 company templates.** A starter list is given in §5.2; the plan can curate the final list and the role assigned to each.
4. **Initial transition schedule generation.** The 90-second schedule needs to be authored. The plan should specify whether to hand-write it (recommended for full control) or generate it via a one-shot script the plan-writer commits.
5. **Sankey ribbon path coordinates.** The hero needs concrete `<path d="...">` strings for both the static ribbons and the 30 flight paths between columns. The plan should produce these alongside the column layout.
6. **Mobile breakpoint thresholds.** Tailwind defaults are fine (`sm: 640`, `md: 768`, `lg: 1024`); the plan should document which exact breakpoint switches the hero from kanban to vertical rail.

---

## Appendix · Brainstorm artifacts

The following mockups were used during the brainstorm and are preserved in the project's `.superpowers/brainstorm/` directory (not committed):

- `pipeline-concept.html` — initial 4-option exploration of pipeline visualization concepts (Sankey / Kanban / Rail / Reveal)
- `pipeline-fusion.html` — the approved A+B fusion mockup of the hero
- `landing-structure.html` — the proposed full landing page section structure
- `mobile-hero.html` — the 3-option mobile hero exploration
