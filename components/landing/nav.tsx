'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <nav className="nav">
      <div className="wrap nav-inner">
        <a
          className={`logo logo-morph${scrolled ? ' is-scrolled' : ''}`}
          href="#"
          aria-label="Maakavoda Data"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        >
          <span className="logo-mark"></span>
          <span className="logo-text" aria-hidden="true">
            <span className="logo-letter logo-keep">M</span>
            <span className="logo-letter logo-fade">A</span>
            <span className="logo-letter logo-fade">A</span>
            <span className="logo-letter logo-keep">K</span>
            <span className="logo-letter logo-fade">A</span>
            <span className="logo-letter logo-keep">V</span>
            <span className="logo-letter logo-fade">O</span>
            <span className="logo-letter logo-fade">D</span>
            <span className="logo-letter logo-fade">A</span>
            <span className="logo-letter logo-gap">{'\u00A0'}</span>
            <span className="logo-letter logo-keep">D</span>
            <span className="logo-letter logo-keep">A</span>
            <span className="logo-letter logo-keep">T</span>
            <span className="logo-letter logo-keep">A</span>
          </span>
        </a>
        <div className="nav-links">
          <a href="#board" onClick={handleAnchorClick}>Board</a>
          <a href="#stages" onClick={handleAnchorClick}>Pipeline</a>
          <a href="#analytics" onClick={handleAnchorClick}>Analytics</a>
          <a href="#marketplace" onClick={handleAnchorClick}>Resume market</a>
          <a href="#">Changelog</a>
        </div>
        <div className="nav-cta">
          <Link href="/login" className="btn btn-ghost">Sign in</Link>
          <Link href="/register" className="btn btn-primary">Get started</Link>
        </div>
      </div>
    </nav>
  );
}
