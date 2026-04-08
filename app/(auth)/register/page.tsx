'use client';

import { signIn } from 'next-auth/react';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      <path d="M9 0C4.03 0 0 4.03 0 9c0 3.978 2.579 7.35 6.154 8.543.45.083.614-.195.614-.433 0-.214-.008-.78-.012-1.531-2.503.544-3.032-1.206-3.032-1.206-.41-1.04-1-1.317-1-1.317-.816-.558.062-.546.062-.546.903.063 1.378.927 1.378.927.803 1.375 2.107.978 2.62.748.082-.581.314-.978.571-1.203-1.999-.227-4.1-1-4.1-4.449 0-.983.351-1.786.927-2.416-.093-.228-.402-1.143.088-2.382 0 0 .756-.242 2.475.923A8.63 8.63 0 019 4.363c.765.004 1.535.103 2.254.303 1.718-1.165 2.472-.923 2.472-.923.491 1.24.182 2.154.09 2.382.577.63.925 1.433.925 2.416 0 3.458-2.104 4.219-4.11 4.441.324.278.612.828.612 1.668 0 1.203-.011 2.175-.011 2.471 0 .24.162.52.619.432C15.424 16.347 18 12.975 18 9c0-4.97-4.03-9-9-9z" />
    </svg>
  );
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Preserved register flow: POST /api/register, then signIn('credentials').
  // Only the visual layer changes.
  async function onRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    setBusy(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.error ?? 'Registration failed.');
      return;
    }

    await signIn('credentials', { email, password, callbackUrl: '/app' });
  }

  return (
    <AuthShell>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)] mb-4">
        Create account
      </div>
      <h1 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.01em] text-[var(--color-ink)] mb-2">
        Start tracking.
      </h1>
      <p className="text-[14px] text-[var(--color-ink-muted)] mb-8">
        Your pipeline starts with one application.
      </p>

      <form onSubmit={onRegister} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-ink-muted)] mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="w-full h-11 px-3.5 border border-[var(--color-line)] rounded-md text-[14px] text-[var(--color-ink)] bg-[var(--color-surface)] placeholder:text-[var(--color-ink-muted)] transition-[border-color] duration-[180ms] focus:outline-none focus:border-[var(--color-ink)] focus-ring"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-ink-muted)] mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="Minimum 8 characters"
            className="w-full h-11 px-3.5 border border-[var(--color-line)] rounded-md text-[14px] text-[var(--color-ink)] bg-[var(--color-surface)] placeholder:text-[var(--color-ink-muted)] transition-[border-color] duration-[180ms] focus:outline-none focus:border-[var(--color-ink)] focus-ring"
          />
        </div>
        {err && <div className="text-[11px] text-[var(--color-sink)]">{err}</div>}
        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 bg-[var(--color-ink)] text-[var(--color-canvas)] rounded-md text-[14px] font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-line)]" />
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
          Or continue with
        </span>
        <div className="flex-1 h-px bg-[var(--color-line)]" />
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/app' })}
          className="w-full h-12 flex items-center justify-center gap-2.5 border border-[var(--color-line)] rounded-md text-[13px] text-[var(--color-ink)] bg-[var(--color-surface)] hover:bg-[var(--color-canvas)] transition-colors"
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => signIn('github', { callbackUrl: '/app', prompt: 'login' })}
          className="w-full h-12 flex items-center justify-center gap-2.5 border border-[var(--color-line)] rounded-md text-[13px] text-[var(--color-ink)] bg-[var(--color-surface)] hover:bg-[var(--color-canvas)] transition-colors"
        >
          <GitHubIcon />
          Continue with GitHub
        </button>
      </div>

      <div className="mt-8 text-center text-[12px] text-[var(--color-ink-muted)]">
        Already have an account?{' '}
        <Link href="/login" className="underline hover:text-[var(--color-ink)]">
          Sign in →
        </Link>
      </div>
    </AuthShell>
  );
}
