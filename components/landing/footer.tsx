'use client';

import { useCallback } from 'react';

export function LandingFooter() {
  const handleAnchorClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  return (
    <footer>
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-col">
            <a className="logo" href="#" style={{ marginBottom: '12px' }}>
              <span className="logo-mark"></span>
              Maakavoda
            </a>
            <p style={{ fontSize: '13.5px', color: 'var(--ink-3)', maxWidth: '30ch', margin: 0 }}>
              A scrum-style job tracker for technical people who{'\u2019'}d rather optimize than speculate.
            </p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><a href="#demo" onClick={handleAnchorClick}>The board</a></li>
              <li><a href="#stages" onClick={handleAnchorClick}>Pipeline</a></li>
              <li><a href="#analytics" onClick={handleAnchorClick}>Analytics</a></li>
              <li><a href="#marketplace" onClick={handleAnchorClick}>Resume market</a></li>
              <li><a href="#">Roadmap</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <ul>
              <li><a href="#">Changelog</a></li>
              <li><a href="#">Comp database</a></li>
              <li><a href="#">Templates</a></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-base">
          <span>{'\u00A9'} 2026 Maakavoda Labs {'\u2014'} Made for technical job hunters.</span>
          <span className="mono" style={{ fontSize: '12px' }}>v1.4.2 {'\u00B7'} uptime 99.98%</span>
        </div>
      </div>
    </footer>
  );
}
