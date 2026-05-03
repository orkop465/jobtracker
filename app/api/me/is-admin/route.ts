import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/auth/admin";

export async function GET(req: NextRequest) {
  const session = await auth();
  const ok = isAdmin(session);
  const url = new URL(req.url);
  // Caller's own email + the configured allowlist size — never anyone
  // else's data — so the admin can debug a mismatched ADMIN_EMAILS.
  if (url.searchParams.get("debug") === "1" && session?.user?.id) {
    const allowlist = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return NextResponse.json({
      isAdmin: ok,
      youAre: session.user.email ?? null,
      allowlistSize: allowlist.length,
      allowlistMatchesYou: allowlist.includes(
        (session.user.email ?? "").toLowerCase().trim(),
      ),
    });
  }
  return NextResponse.json({ isAdmin: ok });
}
