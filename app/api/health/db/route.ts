import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public health probe — must NEVER leak internal error details (connection
// strings, hostnames, Prisma stack traces) to unauthenticated callers.
// The full error is logged server-side for operators to inspect via
// Cloud Logging.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[health/db] database probe failed", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
