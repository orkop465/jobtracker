import Link from 'next/link';

export function LandingCTA() {
  return (
    <section className="py-40 bg-[var(--color-canvas)]">
      <div className="max-w-[720px] mx-auto px-6 text-center">
        <h2 className="text-[44px] leading-[1.1] font-semibold tracking-[-0.02em] text-[var(--color-ink)] mb-10">
          Start with one application.
        </h2>
        <Link
          href="/register"
          className="inline-block bg-[var(--color-ink)] text-[var(--color-canvas)] px-8 py-[18px] rounded-md text-[18px] font-medium hover:bg-black transition-colors"
          style={{ animation: 'pulse-soft 2.8s ease-in-out infinite' }}
        >
          Start tracking →
        </Link>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
          Free while it&rsquo;s in beta.
        </p>
      </div>
    </section>
  );
}
