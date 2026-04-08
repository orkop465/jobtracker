'use client';

import { HowItWorksSlide } from './how-it-works-slide';

function AddAppVisual() {
  return (
    <div className="bg-[rgba(250,250,247,0.05)] border border-[rgba(250,250,247,0.1)] rounded-md p-4 backdrop-blur-sm">
      <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[rgba(250,250,247,0.5)] mb-2">
        Quick add
      </div>
      <div className="space-y-2 font-mono text-[11px]">
        <div className="flex gap-2 items-center">
          <span className="text-[rgba(250,250,247,0.35)] w-14">Company</span>
          <span className="text-[var(--color-canvas)]">Linear</span>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-[rgba(250,250,247,0.35)] w-14">Role</span>
          <span className="text-[var(--color-canvas)]">Product Eng</span>
        </div>
      </div>
    </div>
  );
}

function ResumeVisual() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {['A', 'B'].map((v, i) => (
        <div
          key={v}
          className={[
            'border border-[rgba(250,250,247,0.15)] rounded-md p-3 bg-[rgba(250,250,247,0.04)]',
            i === 1 && 'border-[var(--color-survive)]',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[rgba(250,250,247,0.5)]">
            Version {v}
          </div>
          <div className="text-[var(--color-canvas)] text-[10px] mt-1">resume-{v.toLowerCase()}.pdf</div>
          {i === 1 && <div className="text-[var(--color-survive)] text-[14px] mt-1 text-right">✓</div>}
        </div>
      ))}
    </div>
  );
}

function KanbanVisual() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {['Applied', 'Screen', 'Interview'].map((col, i) => (
        <div
          key={col}
          className="border border-[rgba(250,250,247,0.15)] rounded-md p-2 bg-[rgba(250,250,247,0.04)] min-h-[60px]"
        >
          <div className="font-mono text-[7px] uppercase tracking-[0.12em] text-[rgba(250,250,247,0.5)] mb-1">
            {col}
          </div>
          {i === 1 && (
            <div className="bg-[rgba(250,250,247,0.1)] rounded px-1.5 py-1 text-[8px] text-[var(--color-canvas)]">
              Linear
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MathVisual() {
  return (
    <div className="text-right">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[rgba(250,250,247,0.5)]">
        Conversion
      </div>
      <div className="text-[48px] font-semibold tabular-nums text-[var(--color-canvas)] tracking-[-0.03em]">
        1.2<span className="text-[24px] text-[rgba(250,250,247,0.5)]">%</span>
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[var(--color-ink)] text-[var(--color-canvas)]">
      <div className="max-w-[1240px] mx-auto">
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-[rgba(250,250,247,0.5)] px-8 pt-20 pb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-canvas)]" />
          How it actually works
        </div>

        <HowItWorksSlide
          number="01"
          headline="Drop in an application."
          sub="Any source — LinkedIn, a referral, a cold email, a career fair."
          visual={<AddAppVisual />}
        />
        <HowItWorksSlide
          number="02"
          headline="Attach the resume you sent."
          sub="Version as many as you want. The tool learns which one gets callbacks."
          visual={<ResumeVisual />}
        />
        <HowItWorksSlide
          number="03"
          headline="Move it through the stages."
          sub="Ten real stages, from Applied to Offer. One click per transition. The pipeline updates itself."
          visual={<KanbanVisual />}
        />
        <HowItWorksSlide
          number="04"
          headline="Read the honest math."
          sub="Conversion per stage, days lost in each bottleneck, which source is lying to you. No filter."
          visual={<MathVisual />}
        />
      </div>
    </section>
  );
}
