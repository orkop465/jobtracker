'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { RotatingCaption } from '@/components/auth/rotating-caption';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    // Simulate sending — matches static HTML behavior
    setTimeout(() => {
      setSubmitting(false);
      setSent(true);
    }, 700);
  }

  return (
    <AuthShell sideHeadline="Your board &middot; still here" showBoard={true}>
      <RotatingCaption style="editorial" />

      <h1 className="auth-title">Reset your <em>key</em>.</h1>
      <p className="auth-subtitle">
        Type the email attached to your board. We&rsquo;ll send a one-time link that expires in 30 minutes.
      </p>

      {!sent && (
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email on file</label>
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

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Sending\u2026' : (
              <>
                Send recovery link
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </form>
      )}

      {sent && (
        <div className="forgot-success is-shown">
          <strong>Link sent.</strong> Check your inbox at <strong>{email}</strong> &mdash; we&rsquo;ll have it there within a minute. Link expires in 30 minutes for safety.
        </div>
      )}

      <div className="forgot-steps">
        <div className="forgot-step">
          <span className="forgot-step-num">01</span>
          <span>We email you a <strong>one-time link</strong>. No passwords leave your inbox.</span>
        </div>
        <div className="forgot-step">
          <span className="forgot-step-num">02</span>
          <span>You pick a <strong>new password</strong> &mdash; or set up passkey if you prefer.</span>
        </div>
        <div className="forgot-step">
          <span className="forgot-step-num">03</span>
          <span>Your board is <strong>exactly where you left it</strong>. Nothing is deleted.</span>
        </div>
      </div>

      <p className="auth-foot" style={{ marginTop: '24px' }}>
        Remembered it? <Link href="/login">Back to sign in &rarr;</Link>
      </p>
    </AuthShell>
  );
}
