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
