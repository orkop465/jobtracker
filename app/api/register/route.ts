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
