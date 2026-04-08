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

      {/* Main breathing ribbon — background mass. Single ink gradient; the
          previous "survive" overlay was removed because at 26px stroke across
          900 horizontal units it read as a green bar rather than a ribbon. */}
      <path
        d="M 100 150 C 300 150 500 150 700 150 S 900 150 990 150"
        stroke="url(#ribbon-main)"
        strokeLinecap="round"
        fill="none"
        style={{
          ['--breathe-min' as string]: '64px',
          ['--breathe-max' as string]: '78px',
          animation: 'ribbon-breathe 8s ease-in-out infinite',
          strokeWidth: '72px',
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
