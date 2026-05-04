import { auth } from "@/auth";
import { isAdmin } from "@/lib/auth/admin";
import { NextResponse } from "next/server";

export interface AdminContext {
  userId: string;
  email: string;
}

export async function requireAdmin(): Promise<
  | { ok: true; ctx: AdminContext }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!isAdmin(session)) {
    // 404 — don't advertise the route to non-admins.
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return {
    ok: true,
    ctx: {
      userId: session!.user!.id as string,
      email: session!.user!.email as string,
    },
  };
}
