'use client';

import React, { useRef, useState, useEffect } from 'react';

// --- useInView hook ---

function useInView(ref: React.RefObject<HTMLElement | null>, opts: IntersectionObserverInit = { threshold: 0.25 }): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect(); }
    }, opts);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return inView;
}

// --- AnimatedNumber ---

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;
    const t0 = performance.now();
    const dur = 1200;
    let raf: number;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return <span ref={ref}>{display}</span>;
}

// --- Data ---

interface ResumeData {
  id: string;
  handle: string;
  role: string;
  yoe: number;
  rating: number;
  votes: number;
  tags: string[];
  callbacks: number;
  excerpt: string;
  color: string;
}

const RESUMES: ResumeData[] = [
  { id: 'r1', handle: 'anon-wolf-42', role: 'Senior SWE', yoe: 8, rating: 4.9, votes: 214, tags: ['Backend', 'Distributed'], callbacks: 17, excerpt: 'Led migration of 400+ microservices with zero downtime; cut p99 latency 62%.', color: 'oklch(0.62 0.15 40)' },
  { id: 'r2', handle: 'anon-fern-09', role: 'Product Manager', yoe: 5, rating: 4.7, votes: 188, tags: ['Growth', 'B2C'], callbacks: 12, excerpt: 'Shipped paywall redesign driving +14% conversion and $8M incremental ARR.', color: 'oklch(0.52 0.10 150)' },
  { id: 'r3', handle: 'anon-hawk-71', role: 'Data Scientist', yoe: 3, rating: 4.8, votes: 156, tags: ['ML', 'Experimentation'], callbacks: 9, excerpt: 'Built causal inference pipeline used across 40+ experiments; published internal playbook.', color: 'oklch(0.55 0.12 230)' },
  { id: 'r4', handle: 'anon-pine-55', role: 'Staff Engineer', yoe: 11, rating: 4.9, votes: 271, tags: ['Infra', 'Leadership'], callbacks: 22, excerpt: 'Technical lead on platform serving 40M daily users; mentored 6 senior engineers to staff.', color: 'oklch(0.50 0.13 320)' },
  { id: 'r5', handle: 'anon-otter-18', role: 'Design Engineer', yoe: 4, rating: 4.6, votes: 103, tags: ['Frontend', 'Motion'], callbacks: 8, excerpt: 'Built the design system used across 30+ product surfaces; shipped motion spec adopted company-wide.', color: 'oklch(0.62 0.17 25)' },
  { id: 'r6', handle: 'anon-lynx-03', role: 'ML Engineer', yoe: 6, rating: 4.8, votes: 197, tags: ['LLM', 'Applied'], callbacks: 14, excerpt: 'Fine-tuned production LLM saving $1.2M/yr; contributor on 3 open-source projects.', color: 'oklch(0.55 0.12 35)' },
];

// --- Stars ---

function Stars({ n }: { n: number }) {
  const full = Math.floor(n);
  const frac = n - full;
  return (
    <span className="stars" aria-label={`${n} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = i < full ? 1 : (i === full ? frac : 0);
        return (
          <span key={i} className="star">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1l1.55 3.14 3.45.5-2.5 2.44.59 3.42L6 8.9 2.91 10.5l.59-3.42L1 4.64l3.45-.5L6 1z"
                stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round"
                fill={fill > 0.5 ? 'currentColor' : 'none'} />
            </svg>
          </span>
        );
      })}
    </span>
  );
}

// --- ResumeMini ---

function ResumeMini({ color }: { color: string }) {
  return (
    <div className="resume-mini" style={{ '--rc': color } as React.CSSProperties}>
      <div className="rm-top">
        <div className="rm-name" />
        <div className="rm-meta" />
      </div>
      <div className="rm-section">
        <div className="rm-h" />
        <div className="rm-l" style={{ width: '92%' }} />
        <div className="rm-l" style={{ width: '78%' }} />
        <div className="rm-l" style={{ width: '86%' }} />
      </div>
      <div className="rm-section">
        <div className="rm-h" />
        <div className="rm-l" style={{ width: '88%' }} />
        <div className="rm-l" style={{ width: '72%' }} />
      </div>
      <div className="rm-section">
        <div className="rm-h" />
        <div className="rm-l" style={{ width: '94%' }} />
      </div>
    </div>
  );
}

// --- ResumeCard ---

function ResumeCard({ resume, featured }: { resume: ResumeData; featured: boolean }) {
  return (
    <div className={`resume-card ${featured ? 'is-featured' : ''}`}>
      <div className="resume-card-preview">
        <ResumeMini color={resume.color} />
        <div className="resume-card-redacted mono">{'\u25CF'} REDACTED</div>
      </div>
      <div className="resume-card-body">
        <div className="resume-card-head">
          <div>
            <div className="resume-card-role">{resume.role}</div>
            <div className="resume-card-handle mono">{resume.handle} {'\u00B7'} {resume.yoe}y exp</div>
          </div>
          <div className="resume-card-rating">
            <Stars n={resume.rating} />
            <span className="resume-card-votes mono">{resume.votes}</span>
          </div>
        </div>
        <div className="resume-card-excerpt">{'\u201C'}{resume.excerpt}{'\u201D'}</div>
        <div className="resume-card-tags">
          {resume.tags.map(t => <span key={t} className="resume-tag">{t}</span>)}
        </div>
        <div className="resume-card-foot">
          <span className="resume-card-callbacks mono">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 6l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {resume.callbacks} callbacks logged
          </span>
        </div>
      </div>
    </div>
  );
}

// --- MarketplaceSection ---

export function MarketplaceSection() {
  return (
    <div className="marketplace">
      <div className="marketplace-chrome">
        <div className="marketplace-chrome-left">
          <span className="chrome-title">maakavoda.app/market <span className="chrome-sep">/</span> Top-rated this week</span>
        </div>
        <div className="marketplace-chrome-right">
          <span className="marketplace-sort mono">sorted by rating {'\u2193'}</span>
        </div>
      </div>

      <div className="marketplace-banner">
        <div className="mb-stat">
          <span className="mb-stat-value"><AnimatedNumber value={12847} /></span>
          <span className="mb-stat-label">resumes shared</span>
        </div>
        <div className="mb-stat">
          <span className="mb-stat-value"><AnimatedNumber value={100} />%</span>
          <span className="mb-stat-label">anonymous</span>
        </div>
        <div className="mb-stat">
          <span className="mb-stat-value"><AnimatedNumber value={342} />k</span>
          <span className="mb-stat-label">ratings given</span>
        </div>
        <div className="mb-stat">
          <span className="mb-stat-value"><AnimatedNumber value={6} />{'\u00A0'}min</span>
          <span className="mb-stat-label">avg. review time</span>
        </div>
      </div>

      <div className="marketplace-grid">
        {RESUMES.map((r, i) => (
          <ResumeCard key={r.id} resume={r} featured={i === 0} />
        ))}
      </div>

      <div className="marketplace-footnote">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1l6 11H1L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M7 6v3M7 10.5v0.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Every upload is auto-scanned for names, companies and PII before it goes live. Uploads are 100% anonymous {'\u2014'} no exceptions.
      </div>
    </div>
  );
}
