export function LandingFooter() {
  return (
    <footer className="py-12 border-t border-[var(--color-line)] bg-[var(--color-canvas)]">
      <div className="max-w-[1160px] mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 font-mono text-[11px] text-[var(--color-ink-muted)]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink)]" />
          <span>MKVDATA — Your pipeline, quantified.</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/terms" className="hover:text-[var(--color-ink)] transition-colors">Terms</a>
          <a href="/privacy" className="hover:text-[var(--color-ink)] transition-colors">Privacy</a>
          <a href="https://github.com" className="hover:text-[var(--color-ink)] transition-colors">GitHub</a>
        </div>
        <div>v4.2.1</div>
      </div>
    </footer>
  );
}
