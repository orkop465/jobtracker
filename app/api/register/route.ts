import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

// OAuth synthetic email namespace — credentials users must never register here.
const RESERVED_EMAIL_PATTERN = /@oauth\.local$/i;

// Loose RFC-ish email shape.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const rl = checkRateLimit(req, "register");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const emailRaw = body?.email;
    const password = body?.password;
    const email =
      typeof emailRaw === "string" ? emailRaw.toLowerCase().trim() : "";

    if (
      !email ||
      !EMAIL_SHAPE.test(email) ||
      RESERVED_EMAIL_PATTERN.test(email)
    ) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    // Check for existing account
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    // Create user — immediately verified, no email flow
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, passwordHash },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
