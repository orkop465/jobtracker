'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={[
        'sticky top-0 z-50 h-16 px-6 flex items-center justify-between bg-[var(--color-canvas)]',
        'backdrop-blur-[8px] transition-[border-color] duration-[280ms]',
        scrolled ? 'border-b border-[var(--color-line)]' : 'border-b border-transparent',
      ].join(' ')}
    >
      <Link href="/" className="flex items-center gap-2.5">
        <span
          className="w-2 h-2 rounded-full bg-[var(--color-ink)]"
          style={{ animation: 'live-dot 3s ease-in-out infinite' }}
        />
        <span className="font-mono text-[12px] tracking-[0.14em] uppercase font-semibold text-[var(--color-ink)]">
          MKVDATA
        </span>
      </Link>
      <div className="hidden md:flex items-center gap-6 font-mono text-[11px] text-[var(--color-ink-muted)]">
        <a href="#how-it-works" className="hover:text-[var(--color-ink)] transition-colors">
          How it works
        </a>
        <a href="#anatomy" className="hover:text-[var(--color-ink)] transition-colors">
          The 10 stages
        </a>
        <Link href="/login" className="hover:text-[var(--color-ink)] transition-colors">
          Sign in
        </Link>
      </div>
      <Link
        href="/register"
        className="bg-[var(--color-ink)] text-[var(--color-canvas)] px-3 py-1.5 rounded-[5px] text-[11px] font-medium hover:bg-black transition-colors"
      >
        Start tracking →
      </Link>
    </nav>
  );
}
