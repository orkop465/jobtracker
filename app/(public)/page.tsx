import { LandingNav } from '@/components/landing/nav';
import { HeroPipeline } from '@/components/landing/hero/pipeline';
import { MetricStrip } from '@/components/landing/hero/metric-strip';
import { Anatomy } from '@/components/landing/anatomy';
import { Intelligence } from '@/components/landing/intelligence';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Proof } from '@/components/landing/proof';
import { LandingCTA } from '@/components/landing/cta';
import { LandingFooter } from '@/components/landing/footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <LandingNav />

      {/* Hero */}
      <section className="py-16 lg:py-24">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] mb-5 flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[var(--color-survive)]"
              style={{ animation: 'live-dot 3s ease-in-out infinite' }}
            />
            Live pipeline · last 90 days
          </div>
          <h1 className="text-[clamp(40px,6vw,64px)] leading-[1.05] font-semibold tracking-[-0.03em] text-[var(--color-ink)] mb-3">
            342 applications in.
            <br />
            <span className="text-[var(--color-ink-muted)]">4 offers out.</span>
          </h1>
          <p className="text-[15px] text-[var(--color-ink-muted)] max-w-[520px] leading-[1.55] mb-10">
            Watch your search move. Every card you see is a real company in a real stage. This is what
            your pipeline actually does — in motion, to scale, with the drop-off you&rsquo;d rather not look at.
          </p>
          <MetricStrip />
          <HeroPipeline />
        </div>
      </section>

      <Anatomy />
      <Intelligence />
      <HowItWorks />
      <Proof />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
