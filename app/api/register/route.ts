import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

// Reserved namespace for provider-internal synthetic emails created by the
// OAuth profile() callbacks in auth.ts. A credentials user must NEVER be
// allowed to register inside this namespace, otherwise they could preempt or
// lock out an OAuth identity (e.g. github:<KNOWN_VICTIM_ID>@oauth.local).
const RESERVED_EMAIL_PATTERN = /@oauth\.local$/i;

// Loose RFC-ish email shape. We do real validation by attempting to parse;
// this just rejects obviously malformed strings before we touch the DB.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  // Rate limit BEFORE any database work to make brute-force enumeration
  // and signup spam expensive.
  const rl = checkRateLimit(req, "register");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const emailRaw = body?.email;
    const password = body?.password;

    const email = typeof emailRaw === "string" ? emailRaw.toLowerCase().trim() : "";

    // Validate inputs. We deliberately return a generic 200 { ok: true }
    // for *all* failure modes below to prevent user-enumeration via the
    // response status. The client can verify success by attempting to sign
    // in immediately afterward (which is what register-page already does).
    const inputInvalid =
      !email ||
      !EMAIL_SHAPE.test(email) ||
      RESERVED_EMAIL_PATTERN.test(email) ||
      typeof password !== "string" ||
      password.length < 8;

    if (inputInvalid) {
      // Run a real bcrypt.hash so this branch takes ~250ms like a successful
      // create. Otherwise an attacker can distinguish "invalid input" from
      // "already registered" from "newly created" purely by response timing.
      // The plaintext used here is irrelevant — the hash is discarded.
      await bcrypt.hash("timing-equalizer", 12);
      return NextResponse.json({ ok: true });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Same timing-equalizer work as a successful create. We MUST NOT skip
      // this — without it, "email already in use" responds in ~5ms and a real
      // create responds in ~250ms, leaking which emails are registered.
      await bcrypt.hash("timing-equalizer", 12);
      return NextResponse.json({ ok: true });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { email, passwordHash } });

    return NextResponse.json({ ok: true });
  } catch {
    // Generic failure — never leak internal error details from the auth surface.
    return NextResponse.json({ ok: true });
  }
}
