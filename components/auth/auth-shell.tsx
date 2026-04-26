'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { MiniBoard } from './mini-board';


interface AuthShellProps {
  children: ReactNode;
  sideHeadline?: string;
  showBoard?: boolean;
}

/**
 * Two-panel auth layout: form (left) + decorative side panel (right).
 * Side panel hidden on mobile (<960px via CSS).
 */
export function AuthShell({ children, sideHeadline = 'Board \u00b7 live preview', showBoard = true }: AuthShellProps) {
  return (
    <div className="auth-page">
      {/* LEFT: FORM */}
      <div className="auth-main">
        <Link className="auth-logo" href="/">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="2" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" transform="rotate(45 11 11)" />
            <rect x="7" y="7" width="8" height="8" rx="1" fill="currentColor" transform="rotate(45 11 11)" />
          </svg>
          Maakavoda <em>data</em>
        </Link>

        <div className="auth-body">
          {children}
        </div>

        <div className="auth-smallprint">
          <span>&copy; Maakavoda Data 2026</span>
          <span>All data yours &middot; <a href="#" style={{ color: 'inherit' }}>Export anytime</a></span>
        </div>
      </div>

      {/* RIGHT: SIDE PANEL */}
      <aside className="auth-side" aria-hidden="true">
        <div className="auth-side-head">
          <span style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', letterSpacing: '0.14em', color: 'oklch(1 0 0 / 0.45)', textTransform: 'uppercase' }}>
            {sideHeadline}
          </span>
          <Link className="auth-side-back" href="/">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M7 3L3 5l4 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to marketing
          </Link>
        </div>

        {showBoard && <MiniBoard />}

        <div className="auth-testimonial">
          <div className="auth-testimonial-mark">&ldquo;</div>
          <p className="auth-testimonial-quote"></p>
          <div className="auth-testimonial-who">
            <span className="auth-testimonial-avatar"></span>
            <span><strong className="auth-testimonial-who-name" style={{ color: 'var(--ink)' }}></strong> &middot; <span className="auth-testimonial-who-role"></span></span>
          </div>
        </div>
      </aside>
    </div>
  );
}
