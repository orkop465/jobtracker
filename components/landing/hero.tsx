'use client';

import Link from 'next/link';

export function Hero() {
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      {/* Pinned cards — floating in hero right, outside the text column */}
      <div className="hero-pins" aria-hidden="true">
        <div className="hero-pin pin-a">
          <span className="pin-tape"></span>
          <div className="pin-eyebrow">Offer {'\u00B7'} Anthropic</div>
          <div className="pin-title">Applied ML <em>Engineer</em></div>
          <div className="pin-meta">data_v2 {'\u00B7'} 32 days in pipeline</div>
        </div>
        <div className="hero-pin pin-b">
          <span className="pin-tape"></span>
          <div className="pin-eyebrow">This week</div>
          <div className="pin-stat">
            <span className="pin-num">18<em>%</em></span>
            <span className="pin-lbl">response rate <span className="pin-delta">+4</span></span>
          </div>
          <div className="pin-meta">Across 14 applications</div>
        </div>
        <div className="hero-pin pin-c">
          <span className="pin-tape"></span>
          <div className="pin-eyebrow">Resume {'\u00B7'} anon-pine-55</div>
          <div className="pin-title">Staff SWE {'\u00B7'} <em>{'\u2605'} 4.9</em></div>
          <div className="pin-meta">271 ratings {'\u00B7'} 22 callbacks</div>
        </div>
      </div>

      <div className="hero-top reveal in">
        <div className="hero-tag">
          <span className="hero-tag-dot">LIVE</span>
          <span>Spring{'\u00A0'}{'\u2019'}26 cohort is open {'\u2014'} you got this.</span>
        </div>
        <h1>Your job search,<br />on <em>rails</em>.</h1>
        <p className="hero-sub">
          Maakavoda is a scrum-style board for your job hunt. Move every role through the pipeline by hand, then watch the board turn itself into <strong>real analytics</strong> {'\u2014'} so every week of searching gets sharper than the last.
        </p>
        <div className="hero-cta">
          <Link href="/register" className="btn btn-primary btn-lg">
            Start tracking {'\u2014'} it{'\u2019'}s free forever
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <a href="#analytics" className="btn btn-outline btn-lg" onClick={handleAnchorClick}>See the analytics</a>
        </div>
        <div className="hero-meta">
          <div className="hero-meta-item">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7.5l3 3 7-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Always free
          </div>
          <div className="hero-meta-item">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7.5l3 3 7-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Your data, exportable as CSV
          </div>
          <div className="hero-meta-item hero-meta-third">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7.5l3 3 7-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            3,400+ offers tracked this month
          </div>
        </div>
      </div>
    </>
  );
}
