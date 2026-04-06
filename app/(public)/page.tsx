import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-0 flex flex-col relative overflow-x-hidden">
      {/* Ambient mesh background */}
      <div className="ambient-mesh" />
      <div className="fixed inset-0 pointer-events-none z-0 grid-bg opacity-20" />

      {/* Nav — ultra-minimal */}
      <nav className="relative z-50 px-8 py-6 flex justify-between items-center max-w-[1400px] mx-auto w-full">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-3 h-3 bg-accent animate-glow-pulse" />
          <span className="font-data text-sm tracking-[0.2em] font-medium text-text-primary uppercase">
            MKVDATA
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="font-data text-[11px] text-text-secondary hover:text-text-primary uppercase tracking-widest transition-colors hidden sm:block"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="font-data text-[11px] uppercase tracking-widest text-accent border border-accent/30 px-6 py-3 hover:bg-accent hover:text-surface-0 transition-all duration-300 flex items-center gap-2"
          >
            Enter Terminal
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 7h12M8 2l5 5-5 5" />
            </svg>
          </Link>
        </div>
      </nav>

      {/* HERO — asymmetric, editorial */}
      <section className="relative min-h-[88vh] flex items-center pt-10 pb-24 overflow-hidden">
        {/* Giant decorative number */}
        <div className="absolute -right-[8%] top-[5%] text-[35vw] font-display text-text-muted/[0.04] leading-none select-none pointer-events-none z-0">
          01
        </div>

        <div className="max-w-[1400px] mx-auto px-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10">
          {/* Left — editorial typography */}
          <div className="lg:col-span-6 flex flex-col items-start pt-8">
            <div className="flex items-center gap-4 mb-8">
              <span className="h-px w-8 bg-orange" />
              <span className="font-data text-[10px] text-orange tracking-[0.3em] uppercase">
                System Initiated
              </span>
            </div>

            <h1 className="font-display text-6xl md:text-7xl lg:text-[5.5rem] leading-[0.95] text-text-primary -ml-0.5">
              Your career<br />
              pipeline,{" "}
              <span className="gradient-text-subtle">quantified</span>
              <span className="text-accent">.</span>
            </h1>

            <p className="mt-10 text-lg text-text-secondary max-w-xl font-light leading-relaxed">
              Stop submitting resumes into the void. Deploy precision analytics
              to map your market, track conversion velocity, and optimize every
              application with data.
            </p>

            <div className="mt-12 flex flex-wrap items-center gap-6">
              <Link
                href="/register"
                className="group relative bg-accent text-surface-0 font-data text-[11px] uppercase tracking-widest px-8 py-4 overflow-hidden font-bold"
              >
                <span className="relative z-10">Initialize Scan</span>
                <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0" />
              </Link>
              <Link
                href="/login"
                className="font-data text-[11px] text-text-secondary hover:text-text-primary uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                View Dashboard
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M1 5h8M5 1l4 4-4 4" />
                </svg>
              </Link>
            </div>

            {/* Micro-stats below hero */}
            <div className="mt-20 grid grid-cols-3 gap-8 border-t border-text-muted/30 pt-8 w-full max-w-xl">
              {[
                { label: "PIPELINE STAGES", value: "10" },
                { label: "CONVERSION", value: "Real-time" },
                { label: "UPTIME SLA", value: "99.9" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-data text-[9px] text-text-muted mb-2 tracking-widest">
                    {stat.label}
                  </div>
                  <div className="font-display text-2xl text-text-primary">
                    {stat.value}
                    {stat.label === "UPTIME SLA" && (
                      <span className="text-accent">%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating HUD panels */}
          <div className="lg:col-span-6 relative min-h-[550px] hidden lg:flex items-center justify-end">
            {/* Back floating panel */}
            <div className="absolute right-[18%] top-[8%] w-64 h-64 border border-purple/20 bg-surface-1/80 backdrop-blur-md animate-float-delayed z-0 p-5 flex flex-col justify-between">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-purple/50">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              <div>
                <div className="font-data text-[9px] text-text-secondary tracking-widest mb-1">MARKET SENTIMENT</div>
                <div className="font-display text-3xl text-text-primary">Bullish</div>
                <div className="mt-3 flex gap-1 h-7 items-end">
                  {[30, 50, 40, 80, 100, 90].map((h, i) => (
                    <div key={i} className="flex-1 bg-purple" style={{ height: `${h}%`, opacity: 0.2 + (i * 0.16) }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Main glass panel */}
            <div className="gradient-border-card w-full max-w-[460px] animate-float shadow-2xl shadow-accent/10 z-10">
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-white/5 py-3 px-5 bg-black/20">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 bg-negative/80" />
                  <div className="w-2.5 h-2.5 bg-warning/80" />
                  <div className="w-2.5 h-2.5 bg-positive/80" />
                </div>
                <div className="font-data text-[9px] tracking-widest text-text-muted uppercase select-none">
                  Terminal.exe — MKVDATA
                </div>
              </div>

              {/* Panel body */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-7">
                  <div>
                    <div className="font-data text-[10px] text-accent mb-1 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute h-full w-full bg-accent opacity-75" />
                        <span className="relative h-2 w-2 bg-accent" />
                      </span>
                      LIVE PIPELINE
                    </div>
                    <h3 className="font-display text-2xl text-text-primary">Active Reqs</h3>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-4xl text-text-primary">42</div>
                    <div className="font-data text-[10px] text-positive mt-1">+14% WoW</div>
                  </div>
                </div>

                {/* Data grid */}
                <div className="grid grid-cols-2 gap-px bg-white/5 border border-white/5 mb-6">
                  {[
                    { label: "Interviews", value: "08", color: "text-text-primary" },
                    { label: "Offers Pending", value: "02", color: "text-orange" },
                    { label: "Response Rate", value: "28.4%", color: "text-text-primary" },
                    { label: "Conv. Velocity", value: "14d", color: "text-text-primary" },
                  ].map((cell) => (
                    <div key={cell.label} className="bg-surface-0/80 p-4">
                      <div className="font-data text-[9px] text-text-muted uppercase mb-1.5">{cell.label}</div>
                      <div className={`font-data text-lg ${cell.color}`}>{cell.value}</div>
                    </div>
                  ))}
                </div>

                {/* Funnel visualization */}
                <div className="space-y-3">
                  <div className="font-data text-[9px] text-text-secondary tracking-widest flex justify-between uppercase">
                    <span>Funnel Drop-off</span>
                    <span className="text-text-primary">Analyzing...</span>
                  </div>
                  {[
                    { color: "bg-accent", width: "100%" },
                    { color: "bg-orange", width: "48%" },
                    { color: "bg-purple", width: "12%" },
                  ].map((bar, i) => (
                    <div key={i} className="w-full bg-black/40 h-1">
                      <div className={`h-full ${bar.color}`} style={{ width: bar.width }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DATA TICKER */}
      <div className="w-full border-y border-white/[0.06] bg-black/40 backdrop-blur-sm overflow-hidden py-3 relative z-20">
        <div className="animate-ticker">
          {[0, 1].map((set) => (
            <div key={set} className="flex items-center gap-10 px-6 shrink-0 font-data text-[10px] tracking-widest text-text-secondary uppercase">
              <span><span className="text-accent">PIPELINE:</span> 10-STAGE</span>
              <span className="w-1.5 h-1.5 bg-text-muted" />
              <span><span className="text-text-primary">FUNNELS:</span> REAL-TIME</span>
              <span className="w-1.5 h-1.5 bg-text-muted" />
              <span><span className="text-orange">A/B TESTING:</span> PER-RESUME</span>
              <span className="w-1.5 h-1.5 bg-text-muted" />
              <span><span className="text-text-primary">VELOCITY:</span> 12-WEEK ROLLING</span>
              <span className="w-1.5 h-1.5 bg-text-muted" />
              <span><span className="text-purple">ALERTS:</span> SMART DETECTION</span>
              <span className="w-1.5 h-1.5 bg-text-muted" />
              <span><span className="text-accent">SOURCE TRACKING:</span> MULTI-CHANNEL</span>
              <span className="w-1.5 h-1.5 bg-text-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES — editorial numbered cards */}
      <section className="py-28 relative z-10 w-full max-w-[1400px] mx-auto px-8">
        {/* Section header */}
        <div className="mb-20 flex flex-col md:flex-row justify-between items-end gap-8 border-b border-text-muted/20 pb-8">
          <div>
            <div className="section-index text-accent mb-4">02 / Architecture</div>
            <h2 className="font-display text-5xl md:text-6xl text-text-primary">
              Terminal Capabilities
            </h2>
          </div>
          <p className="text-text-secondary max-w-sm text-sm font-light">
            A dense, high-leverage toolset to execute your career search with
            mathematical precision.
          </p>
        </div>

        {/* 3-column cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children">
          {[
            {
              num: "01",
              title: "Pipeline Analysis",
              desc: "Visualize your entire application lifecycle. Track statuses across 10 stages, identify bottlenecks, and calculate your exact conversion ratio.",
              accentColor: "text-accent",
              borderColor: "border-accent/30",
              bgColor: "bg-accent/5",
              bars: [
                { h: "30%", color: "bg-accent/60" },
                { h: "55%", color: "bg-accent/70" },
                { h: "20%", color: "bg-accent/50" },
                { h: "80%", color: "bg-white" },
              ],
            },
            {
              num: "02",
              title: "Response Velocity",
              desc: "Measure temporal distance between application and engagement. Filter by source, company, or role to optimize your targeting strategy.",
              accentColor: "text-orange",
              borderColor: "border-orange/30",
              bgColor: "bg-orange/5",
              bars: [
                { h: "60%", color: "bg-orange/50" },
                { h: "30%", color: "bg-orange/40" },
                { h: "90%", color: "bg-orange" },
                { h: "45%", color: "bg-white/60" },
              ],
            },
            {
              num: "03",
              title: "Resume Intelligence",
              desc: "A/B test your resume versions with real conversion data. Track which documents generate callbacks and optimize your positioning.",
              accentColor: "text-purple",
              borderColor: "border-purple/30",
              bgColor: "bg-purple/5",
              bars: [
                { h: "40%", color: "bg-purple/40" },
                { h: "70%", color: "bg-purple/60" },
                { h: "50%", color: "bg-purple" },
                { h: "85%", color: "bg-white/70" },
              ],
            },
          ].map((card) => (
            <div key={card.num} className="gradient-border-card p-8 lg:p-10 group overflow-hidden relative">
              {/* Decorative number */}
              <div className="absolute -right-4 -top-8 text-[9rem] font-display text-white/[0.02] pointer-events-none transition-transform duration-700 group-hover:-translate-y-4">
                {card.num}
              </div>

              <div className="relative z-10 h-full flex flex-col">
                <div className={`w-12 h-12 border ${card.borderColor} flex items-center justify-center mb-8 ${card.bgColor}`}>
                  <span className={`font-data text-sm font-bold ${card.accentColor}`}>{card.num}</span>
                </div>
                <h3 className="font-display text-2xl lg:text-3xl text-text-primary mb-4">
                  {card.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-10 flex-grow">
                  {card.desc}
                </p>

                {/* Mini visualization */}
                <div className="bg-surface-0/80 p-4 border border-white/5">
                  <div className="font-data text-[8px] text-text-muted uppercase mb-3 text-right tracking-widest">
                    Throughput Matrix
                  </div>
                  <div className="flex items-end gap-2 h-14">
                    {card.bars.map((bar, i) => (
                      <div key={i} className={`flex-1 ${bar.color} transition-all duration-300`} style={{ height: bar.h }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TELEMETRY SECTION */}
      <section className="py-24 border-y border-white/5 bg-surface-1/30 relative z-10">
        <div className="max-w-[1400px] mx-auto px-8 w-full flex flex-col lg:flex-row gap-16 items-center">
          {/* Left — editorial text */}
          <div className="lg:w-1/3">
            <div className="section-index text-purple mb-4">03 / Telemetry</div>
            <h2 className="font-display text-4xl text-text-primary mb-6">
              Every variable,<br />indexed.
            </h2>
            <div className="space-y-3 font-data text-[11px] text-text-secondary uppercase">
              {[
                { label: "Source Effectiveness", status: "Active", color: "text-text-primary" },
                { label: "Salary Benchmarking", status: "Active", color: "text-text-primary" },
                { label: "Resume A/B Testing", status: "Active", color: "text-text-primary" },
                { label: "Smart Follow-ups", status: "Monitoring", color: "text-orange" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between border-b border-white/5 pb-3">
                  <span>{row.label}</span>
                  <span className={row.color}>{row.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — dense data grid */}
          <div className="lg:w-2/3 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 border border-white/5">
            {[
              { label: "TRACKING", value: "10-Stage", serif: true },
              { label: "ANALYTICS", value: "Real-time", color: "text-accent" },
              { label: "RESUMES", value: "A/B Test", serif: true },
              { label: "SYS_STATUS", value: "OPTIMAL", dot: true },
              { label: "VELOCITY", value: "12-Week", serif: true },
              { label: "SOURCES", value: "Multi-ch", color: "text-orange" },
              { label: "ALERTS", value: "Smart", color: "text-purple" },
              { label: "EXPORT", value: "CSV/API", serif: true },
            ].map((cell) => (
              <div key={cell.label} className="bg-surface-0 p-5 flex flex-col justify-between aspect-square hover:bg-surface-1 transition-colors">
                <div className="font-data text-[9px] text-text-muted tracking-widest">{cell.label}</div>
                <div className={`${cell.serif ? "font-display text-xl" : "font-data text-sm"} ${cell.color ?? "text-text-primary"} flex items-center gap-2`}>
                  {cell.dot && <span className="w-2 h-2 bg-positive" />}
                  {cell.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-36 relative z-10 overflow-hidden flex items-center justify-center text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-accent/[0.06] blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-3xl mx-auto px-8 relative">
          <h2 className="font-display text-5xl md:text-7xl text-text-primary mb-10 leading-[0.95]">
            Stop guessing.<br />
            <span className="gradient-text">Start knowing.</span>
          </h2>
          <p className="font-data text-[11px] text-text-secondary uppercase tracking-[0.2em] mb-12">
            Your next career move, powered by data.
          </p>
          <Link
            href="/register"
            className="group relative inline-flex items-center justify-center p-px overflow-hidden bg-surface-0 font-data text-[12px] uppercase tracking-widest text-text-primary shadow-[0_0_40px_-10px_rgba(0,212,255,0.4)]"
          >
            <span className="absolute w-full h-full bg-gradient-to-br from-accent via-orange to-purple group-hover:from-orange group-hover:via-purple group-hover:to-accent transition-all duration-700" />
            <span className="relative px-10 py-4 bg-surface-0 group-hover:bg-transparent group-hover:text-surface-0 font-bold flex items-center gap-3 transition-all duration-300">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="1" y="1" width="14" height="12" rx="1" />
                <path d="M1 4h14" />
                <path d="M4 7h3M4 9.5h5" />
              </svg>
              Access Terminal
            </span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black/40 relative z-20">
        <div className="max-w-[1400px] mx-auto px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-4 font-data text-[10px] text-text-muted uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <span className="text-accent">&copy; {new Date().getFullYear()} MKVDATA.</span>
            <span>All rights reserved.</span>
          </div>
          <div className="flex items-center gap-2">
            SYS_VER: <span className="text-text-primary">v4.2.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
