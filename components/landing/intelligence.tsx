'use client';

import { IntelligenceFeature } from './intelligence-feature';

// Mini-viz: Source effectiveness bar chart
function SourceViz() {
  const sources = [
    { name: 'LinkedIn', rate: 0.12 },
    { name: 'Referral', rate: 0.42, winner: true },
    { name: 'Recruiter outreach', rate: 0.28 },
    { name: 'Company site', rate: 0.18 },
    { name: 'Job board', rate: 0.09 },
  ];
  return (
    <div className="space-y-3">
      {sources.map((s) => (
        <div key={s.name} className="grid grid-cols-[140px_1fr_auto] items-center gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
            {s.name}
          </span>
          <div className="h-2 bg-[var(--color-line-subtle)] rounded-full overflow-hidden">
            <div
              className={s.winner ? 'h-full bg-[var(--color-survive)]' : 'h-full bg-[var(--color-ink)] opacity-85'}
              style={{ width: `${s.rate * 100}%`, transition: 'width 640ms cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
          </div>
          <span className="font-mono text-[12px] text-[var(--color-ink)] tabular-nums">
            {Math.round(s.rate * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// Mini-viz: Resume A/B
function ResumeViz() {
  return (
    <div className="grid grid-cols-2 gap-6">
      {[
        { label: 'Version A', filename: 'senior-swe-v4.pdf', rate: 14, winner: false },
        { label: 'Version B', filename: 'senior-swe-v5.pdf', rate: 28, winner: true },
      ].map((r) => (
        <div
          key={r.label}
          className={[
            'border border-[var(--color-line)] rounded-md p-4 bg-white',
            r.winner && '-translate-y-[2px] shadow-[0_6px_16px_rgba(0,0,0,0.06)] border-[var(--color-survive-soft)]',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            {r.label}
          </div>
          <div className="text-[13px] text-[var(--color-ink)] mt-1 truncate">{r.filename}</div>
          <div className="mt-3 flex items-center gap-2">
            <span className="font-mono text-[20px] tabular-nums text-[var(--color-ink)]">{r.rate}</span>
            <span className="font-mono text-[9px] uppercase text-[var(--color-ink-muted)]">response</span>
            {r.winner && (
              <span className="ml-auto text-[12px] text-[var(--color-survive)]">✓</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Mini-viz: Velocity bottleneck
function BottleneckViz() {
  const segments = [
    { label: 'Applied', days: 5 },
    { label: 'Screen', days: 3 },
    { label: 'R1', days: 6 },
    { label: 'R2', days: 17, bottleneck: true },
    { label: 'R3', days: 7 },
    { label: 'Offer', days: 2 },
  ];
  const total = segments.reduce((s, x) => s + x.days, 0);
  return (
    <div>
      <div className="flex h-10 rounded-md overflow-hidden border border-[var(--color-line)]">
        {segments.map((s) => (
          <div
            key={s.label}
            className={[
              'flex items-center justify-center font-mono text-[10px] tabular-nums',
              s.bottleneck ? 'bg-[rgba(154,52,18,0.14)] text-[var(--color-sink)]' : 'bg-white text-[var(--color-ink-muted)]',
            ].join(' ')}
            style={{ width: `${(s.days / total) * 100}%` }}
          >
            {s.days}d
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
        {segments.map((s) => (
          <span key={s.label} className={s.bottleneck ? 'text-[var(--color-sink)]' : ''}>
            {s.label}
          </span>
        ))}
      </div>
      <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-sink)]">
        ← Bottleneck detected
      </div>
    </div>
  );
}

export function Intelligence() {
  return (
    <section className="py-16 bg-[var(--color-canvas)]">
      <div className="max-w-[1160px] mx-auto px-6">
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink)]" />
          Intelligence
        </div>
        <h2 className="text-[44px] leading-[1.05] font-semibold tracking-[-0.02em] text-[var(--color-ink)] mb-12 max-w-[680px]">
          What your spreadsheet can&rsquo;t tell you.
        </h2>

        <IntelligenceFeature
          headline="Your spreadsheet can't show you which channel is lying to you."
          caption="Referrals convert 8× better than LinkedIn. We do the math."
          viz={<SourceViz />}
        />
        <IntelligenceFeature
          headline="You don't have one resume. You have versions. They don't perform the same."
          caption="Version B. +14% response. Run two, stop guessing."
          viz={<ResumeViz />}
          reverse
        />
        <IntelligenceFeature
          headline={'Every day you sit in "Interview Round 2" is a day you\'re not closing.'}
          caption="Find the stage where your search loses the most days. Then go fix it."
          viz={<BottleneckViz />}
        />
      </div>
    </section>
  );
}
