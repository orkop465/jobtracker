import type { Session } from "next-auth";

export function isAdmin(session: Session | null | undefined): boolean {
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email);
}
