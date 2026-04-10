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
