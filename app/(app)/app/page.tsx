import Link from "next/link";
import { auth } from "@/auth";

export default async function AppHome() {
  const session = await auth();

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Dashboard</h1>
      <div style={{ opacity: 0.85, marginBottom: 18 }}>
        Signed in as <b>{session?.user?.email ?? "unknown"}</b>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/app/applications">Applications</Link>
        <Link href="/app/resumes">Resumes</Link>
        <Link href="/app/analytics">Analytics</Link>
      </div>
    </main>
  );
}
