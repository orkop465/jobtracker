'use client';

import Link from 'next/link';

export function CTASection() {
  return (
    <div className="cta-card">
      <div className="cta-card-inner">
        <h2 className="section-title" style={{ maxWidth: '18ch', marginBottom: '12px' }}>
          The <em>best</em> search<br />is an organized one.
        </h2>
        <p className="section-desc" style={{ marginBottom: '24px' }}>
          Spin up a board in under a minute. Drop your first role in, move it across the pipeline, and let the numbers start building.
        </p>
        <div className="hero-cta">
          <Link href="/register" className="btn btn-primary btn-lg">
            Start tracking
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/register" className="btn btn-outline btn-lg">Talk to us</Link>
        </div>
      </div>
      <div className="cta-card-visual">
        <div className="cta-mini-board"></div>
      </div>
    </div>
  );
}
