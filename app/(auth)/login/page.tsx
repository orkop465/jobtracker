'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { AuthShell } from '@/components/auth/auth-shell';
import { RotatingCaption } from '@/components/auth/rotating-caption';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Get CSRF token from NextAuth
      const csrfRes = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfRes.json();

      // POST credentials to NextAuth
      const res = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken, email, password, redirect: 'false' }),
        redirect: 'manual',
      });

      if (res.ok || res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
        window.location.href = '/app';
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Invalid email or password.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell sideHeadline="Board &middot; live preview">
      <RotatingCaption style="mixed" />

      <h1 className="auth-title">Welcome <em>back</em>.</h1>
      <p className="auth-subtitle">
        Move your pipeline forward. We kept your board warm.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <div className="auth-field-wrap">
            <input
              className="auth-input"
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@domain.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="auth-field">
          <div className="auth-label-row">
            <label className="auth-label" htmlFor="password">Password</label>
            <Link className="auth-link" href="/forgot">Forgot?</Link>
          </div>
          <input
            className="auth-input"
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div
            className="auth-error"
            style={{
              color: 'var(--clay)',
              fontSize: '13px',
              padding: '8px 12px',
              background: 'var(--clay-soft)',
              borderRadius: '3px',
            }}
          >
            {error}
          </div>
        )}

        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Signing in\u2026' : (
            <>
              Sign in
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </button>
      </form>

      <div className="auth-divider">or continue with</div>

      <div className="auth-social">
        <button
          type="button"
          className="auth-social-btn"
          onClick={() => signIn('google', { callbackUrl: '/app' })}
        >
          <svg width="16" height="16" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.87 2.68-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z" />
            <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 013.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 00.96 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z" />
          </svg>
          Google
        </button>
        <button
          type="button"
          className="auth-social-btn"
          onClick={() => signIn('github', { callbackUrl: '/app' })}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 00-2.53 15.59c.4.07.55-.17.55-.38v-1.33c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.81.06 1.23.83 1.23.83.72 1.22 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.77-.2-3.64-.88-3.64-3.95 0-.87.31-1.58.82-2.14-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.66 7.66 0 014 0c1.52-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.14 0 3.07-1.87 3.75-3.65 3.94.29.25.54.74.54 1.5v2.22c0 .21.15.46.55.38A8 8 0 008 0z" />
          </svg>
          GitHub
        </button>
      </div>

      <p className="auth-foot">
        No account yet? <Link href="/register">Start a board &rarr;</Link>
      </p>
    </AuthShell>
  );
}
