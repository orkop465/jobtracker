# Auth Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OWASP-compliant registration flow with email verification — generic identical responses for all outcomes, no user-enumeration vectors, throttled email sending.

**Architecture:** Registration creates a pending user (`emailVerified: null`) and sends a verification email. The response is always `200 {ok: true}` regardless of outcome (new user, duplicate, validation failure). Verification links hit `GET /api/auth/verify?token=...` which activates the account and redirects to login. Credentials login is gated on `emailVerified !== null`. Existing users who re-register get a "you already have an account" email. Unverified users who re-register get a fresh verification email + password update. All paths are timing-equalized with bcrypt work.

**Tech Stack:** Next.js 16 App Router, NextAuth v5, Prisma 7 (PostgreSQL), bcrypt, nodemailer, vitest

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `lib/email.ts` | Email transport — console in dev, SMTP in prod |
| Create | `lib/auth/verification.ts` | Token generation, creation, consumption |
| Create | `lib/auth/verification.test.ts` | Unit tests for token generation |
| Create | `app/api/auth/verify/route.ts` | GET handler for email verification links |
| Modify | `app/api/register/route.ts` | Verification-aware registration |
| Modify | `auth.ts:76-109` | Gate credentials login on `emailVerified` |
| Create | `app/(auth)/register/register-client.tsx` | Client component for register form + "check email" state |
| Modify | `app/(auth)/register/page.tsx` | Server component wrapper (session redirect) |
| Modify | `app/(auth)/login/login-client.tsx:28-68` | Verified banner, 429 handling, verify hint |
| Modify | `lib/rate-limit.ts:18-23` | Tighten register bucket to 5/10min |
| Modify | `vitest.config.ts:8` | Add `lib/auth/**/*.test.ts` to include |

---

### Task 1: Install nodemailer + update vitest config

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.ts:8`

- [ ] **Step 1: Install nodemailer**

```bash
npm install nodemailer && npm install -D @types/nodemailer
```

- [ ] **Step 2: Update vitest include pattern**

In `vitest.config.ts`, change the `include` array to also cover `lib/auth/`:

```typescript
include: ['lib/**/*.test.ts', 'components/**/*.test.ts'],
```

No change needed — `lib/**/*.test.ts` already covers `lib/auth/verification.test.ts`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add nodemailer for transactional email"
```

---

### Task 2: Email module

**Files:**
- Create: `lib/email.ts`

- [ ] **Step 1: Create the email module**

```typescript
// lib/email.ts
import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function getTransport(): nodemailer.Transporter | null {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "noreply@mkvdata.com";
  const transport = getTransport();

  if (!transport) {
    console.log(
      `\n📧 Email (dev mode):\n  To: ${options.to}\n  Subject: ${options.subject}\n  Body:\n${options.text}\n`,
    );
    return;
  }

  await transport.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/email.ts
git commit -m "feat: add email transport module (console in dev, SMTP in prod)"
```

---

### Task 3: Verification module + tests (TDD)

**Files:**
- Create: `lib/auth/verification.test.ts`
- Create: `lib/auth/verification.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/auth/verification.test.ts
import { describe, it, expect } from "vitest";
import { generateToken, TOKEN_EXPIRY_MS } from "./verification";

describe("generateToken", () => {
  it("returns a URL-safe base64 string", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns 43-character string (256 bits in base64url)", () => {
    const token = generateToken();
    expect(token).toHaveLength(43);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("TOKEN_EXPIRY_MS", () => {
  it("is 24 hours in milliseconds", () => {
    expect(TOKEN_EXPIRY_MS).toBe(24 * 60 * 60 * 1000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/auth/verification.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the verification module**

```typescript
// lib/auth/verification.ts
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/** 256-bit cryptographically random URL-safe token. */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Create a verification token for the given email.
 * Deletes any prior tokens for the same email first.
 */
export async function createVerificationToken(email: string): Promise<string> {
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  const token = generateToken();
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + TOKEN_EXPIRY_MS),
    },
  });
  return token;
}

/**
 * Consume a verification token. Returns the email (identifier) if valid,
 * null if missing or expired. Deletes the token in either case.
 */
export async function consumeVerificationToken(
  token: string,
): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });
  if (!record) return null;

  // Always delete — whether expired or valid, the token is single-use.
  await prisma.verificationToken.delete({ where: { token } });

  if (record.expires < new Date()) return null;
  return record.identifier;
}

/**
 * Send a verification email with a one-time link.
 * Fire-and-forget safe — call without await from route handlers
 * so email latency doesn't leak into response timing.
 */
export async function sendVerificationEmail(
  email: string,
  origin: string,
): Promise<void> {
  const token = await createVerificationToken(email);
  const verifyUrl = `${origin}/api/auth/verify?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Verify your MKVDATA account",
    text: [
      "Welcome to MKVDATA!",
      "",
      "Click the link below to verify your email address:",
      verifyUrl,
      "",
      "This link expires in 24 hours.",
      "",
      "If you didn't create an account, you can safely ignore this email.",
    ].join("\n"),
  });
}

/**
 * Send an informational email to an already-registered user.
 * Tells them they already have an account without exposing this fact in the UI.
 */
export async function sendExistingAccountEmail(
  email: string,
  origin: string,
): Promise<void> {
  const loginUrl = `${origin}/login`;

  await sendEmail({
    to: email,
    subject: "Sign in to MKVDATA",
    text: [
      "Someone (hopefully you) tried to create a new account with this email address.",
      "",
      "You already have an account. Sign in here:",
      loginUrl,
      "",
      "If this wasn't you, you can safely ignore this email.",
    ].join("\n"),
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/auth/verification.test.ts
```

Expected: PASS (3 tests). The tests only exercise the pure `generateToken` function, not the prisma-dependent functions.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/verification.ts lib/auth/verification.test.ts
git commit -m "feat: add email verification token module with tests"
```

---

### Task 4: Rewrite register API

**Files:**
- Modify: `app/api/register/route.ts`
- Modify: `lib/rate-limit.ts:18-23`

- [ ] **Step 1: Tighten register rate limit**

In `lib/rate-limit.ts`, change the register bucket from 10 to 5 attempts per 10 minutes since each attempt now triggers an email:

```typescript
// Before:
register: { limit: 10, windowMs: 10 * 60 * 1000 },

// After:
register: { limit: 5, windowMs: 10 * 60 * 1000 },
```

- [ ] **Step 2: Rewrite the register route**

Replace the entire contents of `app/api/register/route.ts`:

```typescript
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  sendVerificationEmail,
  sendExistingAccountEmail,
} from "@/lib/auth/verification";

// OAuth synthetic email namespace — credentials users must never register here.
const RESERVED_EMAIL_PATTERN = /@oauth\.local$/i;

// Loose RFC-ish email shape.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// OWASP: always return the same response shape. The client shows a
// generic "check your email" message regardless of what happened.
const GENERIC_OK = { ok: true };

// Fire-and-forget email helper — decouples email latency from response
// timing so an attacker can't distinguish "sent email" from "didn't send".
function emailBackground(fn: () => Promise<void>) {
  fn().catch((err) => console.error("Background email failed:", err));
}

export async function POST(req: Request) {
  const rl = checkRateLimit(req, "register");
  if (!rl.ok) {
    await bcrypt.hash("timing-equalizer", 12);
    return NextResponse.json(GENERIC_OK);
  }

  try {
    const body = await req.json().catch(() => null);
    const emailRaw = body?.email;
    const password = body?.password;
    const email =
      typeof emailRaw === "string" ? emailRaw.toLowerCase().trim() : "";
    const origin = new URL(req.url).origin;

    // --- Input validation (generic response, no leak) ---
    const inputInvalid =
      !email ||
      !EMAIL_SHAPE.test(email) ||
      RESERVED_EMAIL_PATTERN.test(email) ||
      typeof password !== "string" ||
      password.length < 8;

    if (inputInvalid) {
      await bcrypt.hash("timing-equalizer", 12);
      return NextResponse.json(GENERIC_OK);
    }

    // --- Check for existing account ---
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (!existing.emailVerified && existing.passwordHash) {
        // Unverified credentials account — update password + resend verification.
        const passwordHash = await bcrypt.hash(password, 12);
        await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash },
        });
        emailBackground(() => sendVerificationEmail(email, origin));
      } else {
        // Verified or OAuth account — inform via email, don't reveal in UI.
        await bcrypt.hash("timing-equalizer", 12);
        emailBackground(() => sendExistingAccountEmail(email, origin));
      }
      return NextResponse.json(GENERIC_OK);
    }

    // --- New user — create pending account + send verification ---
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { email, passwordHash } });
    emailBackground(() => sendVerificationEmail(email, origin));

    return NextResponse.json(GENERIC_OK);
  } catch {
    return NextResponse.json(GENERIC_OK);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/register/route.ts lib/rate-limit.ts
git commit -m "feat: OWASP-compliant register with email verification

Generic 200 response for all outcomes. New accounts are pending
until verified via email link. Re-registration of unverified
accounts resends verification. Existing accounts get an
informational email. Rate limit tightened to 5/10min."
```

---

### Task 5: Verification endpoint

**Files:**
- Create: `app/api/auth/verify/route.ts`

- [ ] **Step 1: Create the verification route**

```typescript
// app/api/auth/verify/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeVerificationToken } from "@/lib/auth/verification";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?verifyError=invalid", url.origin));
  }

  const email = await consumeVerificationToken(token);

  if (!email) {
    return NextResponse.redirect(
      new URL("/login?verifyError=expired", url.origin),
    );
  }

  // Activate the account. updateMany so it's a no-op if already verified
  // (idempotent) or if the user was deleted in the meantime (no throw).
  await prisma.user.updateMany({
    where: { email, emailVerified: null },
    data: { emailVerified: new Date() },
  });

  return NextResponse.redirect(new URL("/login?verified=true", url.origin));
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/verify/route.ts
git commit -m "feat: add GET /api/auth/verify endpoint for email verification"
```

---

### Task 6: Gate credentials login on emailVerified

**Files:**
- Modify: `auth.ts:76-109`

- [ ] **Step 1: Add emailVerified check to authorize()**

In `auth.ts`, inside the `Credentials` provider's `authorize` function, after the existing password check and before the return, add the emailVerified gate. The full authorize function becomes:

```typescript
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.toLowerCase().trim()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          await bcrypt.compare(password || "x", TIMING_EQUALIZER_HASH);
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });

        const hashToCompare = user?.passwordHash ?? TIMING_EQUALIZER_HASH;
        const ok = await bcrypt.compare(password, hashToCompare);

        if (!user?.passwordHash || !ok) return null;

        // Block unverified credentials accounts. This check happens AFTER
        // bcrypt.compare so the timing is already equalized.
        if (!user.emailVerified) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
```

The only new line is `if (!user.emailVerified) return null;` after the password check at line ~101.

- [ ] **Step 2: Commit**

```bash
git add auth.ts
git commit -m "feat: gate credentials login on emailVerified"
```

---

### Task 7: Rewrite register page

**Files:**
- Create: `app/(auth)/register/register-client.tsx`
- Modify: `app/(auth)/register/page.tsx`

- [ ] **Step 1: Create the client component**

The register page transitions from a form to a "check your email" confirmation after submission. Client-side validation prevents submission if password < 8 chars. OAuth buttons remain available in both states.

```typescript
// app/(auth)/register/register-client.tsx
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

export default function RegisterClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    if (password.length < 8) {
      setErr('Password must be at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      // OWASP: always show the same confirmation regardless of outcome.
      setSubmitted(true);
    } catch {
      setErr('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      {submitted ? (
        <>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)] mb-4">
            Check your email
          </div>
          <h1 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.01em] text-[var(--color-ink)] mb-2">
            Check your email for next steps.
          </h1>
          <p className="text-[14px] text-[var(--color-ink-muted)] mb-8">
            We sent a verification link to{' '}
            <span className="font-mono text-[13px] text-[var(--color-ink)]">{email}</span>.
            Check your inbox and spam folder.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setPassword('');
            }}
            className="text-[12px] text-[var(--color-ink-muted)] underline hover:text-[var(--color-ink)]"
          >
            Use a different email
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-line)]" />
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
              Or continue with
            </span>
            <div className="flex-1 h-px bg-[var(--color-line)]" />
          </div>
        </>
      ) : (
        <>
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
              {busy ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-line)]" />
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
              Or continue with
            </span>
            <div className="flex-1 h-px bg-[var(--color-line)]" />
          </div>
        </>
      )}

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
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
}
```

- [ ] **Step 2: Rewrite the server page component**

Replace the entire contents of `app/(auth)/register/page.tsx` with a server component that redirects logged-in users (matching the login page pattern):

```typescript
// app/(auth)/register/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import RegisterClient from "./register-client";

export default async function RegisterPage() {
  const session = await auth();
  if (session) redirect("/app");
  return <RegisterClient />;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/register/register-client.tsx app/(auth)/register/page.tsx
git commit -m "feat: register page with email verification UX

Form transitions to 'check your email' confirmation on submit.
Client-side password validation (8 char min). OAuth buttons remain
available. Server component redirects authenticated users."
```

---

### Task 8: Update login page

**Files:**
- Modify: `app/(auth)/login/login-client.tsx:28-68`

- [ ] **Step 1: Add verified banner, verify error handling, 429 handling, and static verify hint**

In `app/(auth)/login/login-client.tsx`, update the `LoginContent` function. The changes are:

1. Read `verified` and `verifyError` from search params (alongside existing `error`)
2. Handle 429 from the credentials callback fetch
3. Add a static "Just registered?" hint below the form
4. Show banners for verification success/failure

Replace the `LoginContent` function body:

```typescript
function LoginContent() {
  const sp = useSearchParams();
  const callbackUrl = sp.get('callbackUrl') ?? '/app';
  const oauthError = sp.get('error');
  const verified = sp.get('verified') === 'true';
  const verifyError = sp.get('verifyError');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCredentials(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const csrfRes = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfRes.json();

      const callbackRes = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken, email, password }),
        redirect: 'manual',
      });

      if (callbackRes.status === 429) {
        setErr('Too many login attempts. Please try again later.');
        return;
      }

      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      if (session?.user) {
        window.location.href = callbackUrl;
        return;
      }
      setErr('Invalid email or password.');
    } catch {
      setErr('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)] mb-4">
        Sign in
      </div>
      <h1 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.01em] text-[var(--color-ink)] mb-2">
        Welcome back.
      </h1>
      <p className="text-[14px] text-[var(--color-ink-muted)] mb-8">
        Pick up where you left off.
      </p>

      {verified && (
        <div className="mb-5 px-3 py-2.5 border border-[var(--color-survive)] bg-[var(--color-survive-soft)] text-[11px] text-[var(--color-survive)] rounded-md">
          Email verified. You can now sign in.
        </div>
      )}

      {verifyError === 'expired' && (
        <div className="mb-5 px-3 py-2.5 border border-[var(--color-line)] bg-[var(--color-canvas)] text-[11px] text-[var(--color-sink)] rounded-md">
          Verification link expired or already used. Please register again to get a new link.
        </div>
      )}

      {verifyError === 'invalid' && (
        <div className="mb-5 px-3 py-2.5 border border-[var(--color-line)] bg-[var(--color-canvas)] text-[11px] text-[var(--color-sink)] rounded-md">
          Invalid verification link. Please register again to get a new link.
        </div>
      )}

      {oauthError === 'OAuthAccountNotLinked' && (
        <div className="mb-5 px-3 py-2.5 border border-[var(--color-line)] bg-[var(--color-canvas)] text-[11px] text-[var(--color-sink)] rounded-md">
          This provider account is attached to a different app account. Use the same provider you originally used.
        </div>
      )}

      <form onSubmit={onCredentials} className="space-y-5">
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
            autoComplete="current-password"
            required
            placeholder="Your password"
            className="w-full h-11 px-3.5 border border-[var(--color-line)] rounded-md text-[14px] text-[var(--color-ink)] bg-[var(--color-surface)] placeholder:text-[var(--color-ink-muted)] transition-[border-color] duration-[180ms] focus:outline-none focus:border-[var(--color-ink)] focus-ring"
          />
        </div>
        {err && <div className="text-[11px] text-[var(--color-sink)]">{err}</div>}
        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 bg-[var(--color-ink)] text-[var(--color-canvas)] rounded-md text-[14px] font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-3 text-[11px] text-[var(--color-ink-muted)]">
        Just registered? Check your inbox for a verification link before signing in.
      </div>

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
          onClick={() => signIn('google', { callbackUrl })}
          className="w-full h-12 flex items-center justify-center gap-2.5 border border-[var(--color-line)] rounded-md text-[13px] text-[var(--color-ink)] bg-[var(--color-surface)] hover:bg-[var(--color-canvas)] transition-colors"
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => signIn('github', { callbackUrl, prompt: 'login' })}
          className="w-full h-12 flex items-center justify-center gap-2.5 border border-[var(--color-line)] rounded-md text-[13px] text-[var(--color-ink)] bg-[var(--color-surface)] hover:bg-[var(--color-canvas)] transition-colors"
        >
          <GitHubIcon />
          Continue with GitHub
        </button>
      </div>

      <div className="mt-8 text-center text-[12px] text-[var(--color-ink-muted)]">
        No account?{' '}
        <Link href="/register" className="underline hover:text-[var(--color-ink)]">
          Create one
        </Link>
      </div>
    </AuthShell>
  );
}
```

Note: The `redirect: 'manual'` on the credentials callback fetch prevents the browser from auto-following the 302, allowing us to read the 429 status. NextAuth's callback will still set the session cookie via the redirect response.

**Important:** After adding `redirect: 'manual'`, the callback response is an opaque redirect. The session cookie is still set because `fetch` with `redirect: 'manual'` returns the response including `Set-Cookie` headers that the browser processes. We then check `GET /api/auth/session` as before to verify the session was created.

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/login/login-client.tsx
git commit -m "feat: login page handles verification banners and 429 rate limit

Shows success banner after email verification, error banners for
expired/invalid tokens. Handles 429 from rate-limited credentials
callback. Adds static hint about checking inbox after registration."
```

---

### Task 9: Backfill existing users

**Files:**
- None (one-off database command)

Any existing users with a `passwordHash` but `emailVerified = null` were created before this verification flow existed. They should be grandfathered in as verified so they can still log in.

- [ ] **Step 1: Run backfill command**

When the database is available, run this Prisma command to verify existing credential users:

```bash
npx prisma db execute --stdin <<'SQL'
UPDATE "User"
SET "emailVerified" = NOW()
WHERE "passwordHash" IS NOT NULL
  AND "emailVerified" IS NULL;
SQL
```

Or via a one-off Node script if Prisma CLI is unavailable:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.updateMany({
  where: { passwordHash: { not: null }, emailVerified: null },
  data: { emailVerified: new Date() },
}).then(r => { console.log('Updated', r.count, 'users'); p.\$disconnect(); });
"
```

This is a **one-time operation** — no migration file needed since the schema hasn't changed.

---

### Task 10: End-to-end verification checklist

Run through each flow manually to verify correctness:

- [ ] **10a: Fresh registration (happy path)**
  1. Visit `/register`
  2. Enter a new email + password (8+ chars)
  3. Submit — page transitions to "Check your email for next steps."
  4. Check console for dev-mode email log with verification URL
  5. Visit the verification URL
  6. Redirected to `/login?verified=true` — green banner shows "Email verified."
  7. Sign in with the same email/password — redirected to `/app`

- [ ] **10b: Registration with short password**
  1. Visit `/register`
  2. Enter email + 7-char password
  3. Submit — client-side error "Password must be at least 8 characters."
  4. No network request made (check DevTools)

- [ ] **10c: Duplicate registration (verified account)**
  1. Register and verify an account (complete 10a)
  2. Go to `/register` again with the same email
  3. Submit — page shows "Check your email" (same as success)
  4. Console shows "already registered" email, NOT a verification email

- [ ] **10d: Duplicate registration (unverified account)**
  1. Register a new email but do NOT click the verification link
  2. Go to `/register` again with the same email and a DIFFERENT password
  3. Submit — page shows "Check your email" (same as success)
  4. Console shows a NEW verification email with a new token
  5. Click the new verification link — account verified
  6. Sign in with the SECOND password (not the first)

- [ ] **10e: Expired verification token**
  1. Register a new email, copy the verification URL
  2. Manually delete the token from the DB or wait for expiry
  3. Visit the verification URL
  4. Redirected to `/login?verifyError=expired` — error banner shows

- [ ] **10f: Login before verification**
  1. Register a new email but do NOT verify
  2. Go to `/login`, enter the same email + password
  3. See "Invalid email or password." (no hint about verification status)

- [ ] **10g: OAuth still works**
  1. Click "Continue with Google" on `/login` or `/register`
  2. Complete OAuth flow — redirected to `/app`
  3. No verification email needed

- [ ] **10h: Rate limiting**
  1. Submit `/api/register` 6 times rapidly from the same IP
  2. 6th request still returns `200 {ok: true}` (no leak)
  3. But console does NOT show an email for the 6th attempt (rate limited)

- [ ] **10i: 429 on login**
  1. Attempt credentials login 11 times rapidly
  2. After 10 attempts, see "Too many login attempts. Please try again later."

- [ ] **10j: Authenticated redirect**
  1. While logged in, visit `/register` — redirected to `/app`
  2. While logged in, visit `/login` — redirected to `/app`
