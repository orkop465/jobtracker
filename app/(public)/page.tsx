import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      {/* Nav */}
      <header className="w-full border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-text-primary font-semibold tracking-tight">
            <span className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-sm font-bold text-surface-0 shadow-[0_0_16px_rgba(45,212,191,0.25)]">
              JT
            </span>
            <span className="text-base">JobTracker</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-surface-0 hover:bg-accent-hover transition-colors shadow-[0_1px_12px_rgba(45,212,191,0.2)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="relative max-w-2xl mx-auto text-center py-20 lg:py-32">
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[120px] pointer-events-none" />

          <p className="text-xs font-medium text-accent uppercase tracking-[0.2em] mb-4 relative">
            Your job search command center
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary tracking-tight leading-[1.1] mb-6 relative">
            Track applications.{" "}
            <span className="text-accent">Land more offers.</span>
          </h1>

          <p className="text-base sm:text-lg text-text-secondary max-w-lg mx-auto mb-10 leading-relaxed relative">
            Stop losing track of where you applied. JobTracker gives you a structured pipeline,
            resume management, and the analytics to optimize every step of your search.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap relative">
            <Link
              href="/register"
              className="px-6 py-3 text-sm font-semibold rounded-lg bg-accent text-surface-0 hover:bg-accent-hover transition-all shadow-[0_2px_20px_rgba(45,212,191,0.2)] hover:shadow-[0_4px_28px_rgba(45,212,191,0.3)]"
            >
              Start Tracking Free
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 text-sm font-medium rounded-lg bg-surface-2 text-text-primary border border-border hover:bg-surface-3 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto w-full pb-20 lg:pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative bg-surface-1 border border-border rounded-xl p-6 noise-texture">
              <div className="w-10 h-10 rounded-lg bg-info-muted flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-info">
                  <path d="M3 5.5h14M3 10h14M3 14.5h9" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-2">Track Applications</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Company, role, status, salary, contacts, notes, job descriptions. Every detail in one place with a 10-stage pipeline.
              </p>
            </div>

            <div className="relative bg-surface-1 border border-border rounded-xl p-6 noise-texture">
              <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <path d="M4 16V9M10 16V4M16 16V11" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-2">Analyze Performance</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Response rates, conversion funnels, source effectiveness, resume performance, and velocity trends. Know what works.
              </p>
            </div>

            <div className="relative bg-surface-1 border border-border rounded-xl p-6 noise-texture">
              <div className="w-10 h-10 rounded-lg bg-positive-muted flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-positive">
                  <path d="M5 2h7l5 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" />
                  <path d="M12 2v5h5" />
                  <path d="M8 11h4M8 14h2" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-2">Manage Resumes</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Upload versions, attach to applications, and see which resume gets the best response rates.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} JobTracker. Built for job seekers.</p>
      </footer>
    </div>
  );
}
