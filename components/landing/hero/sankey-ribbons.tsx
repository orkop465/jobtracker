'use client';

import { PATH_DEFINITIONS } from '@/lib/landing/pipeline-schedule';

/**
 * Hero background ribbons + hidden flight path definitions.
 * Ribbons breathe via CSS keyframe animation (see globals.css: @keyframes ribbon-breathe).
 *
 * The hidden path defs are queried by the HeroPipeline orchestrator at mount
 * time via `querySelectorAll('[data-path-name]')` so flying cards can call
 * `path.getPointAtLength()` on them.
 */
export function SankeyRibbons() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1000 300"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="ribbon-main" x1="0" x2="1">
          <stop offset="0" stopColor="var(--color-ink)" stopOpacity="0.09" />
          <stop offset="1" stopColor="var(--color-ink)" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* Main breathing ribbon — background mass spanning the 5 active stages
          (Applied → Offer). Stops short of the Closed column (x=917) so the
          ribbon visually represents the *active flow*, not the terminal bucket.
          The previous "survive" overlay was removed because at 26px stroke
          across 900 horizontal units it read as a green bar rather than a
          ribbon. */}
      <path
        d="M 83 150 C 250 150 417 150 583 150 S 750 150 820 150"
        stroke="url(#ribbon-main)"
        strokeLinecap="round"
        fill="none"
        style={{
          ['--breathe-min' as string]: '60px',
          ['--breathe-max' as string]: '72px',
          animation: 'ribbon-breathe 8s ease-in-out infinite',
          strokeWidth: '66px',
        }}
      />

      {/* Hidden flight path definitions — invisible, queried by orchestrator. */}
      <g opacity="0">
        {Object.entries(PATH_DEFINITIONS).map(([name, d]) => (
          <path key={name} data-path-name={name} d={d} />
        ))}
      </g>
    </svg>
  );
}
