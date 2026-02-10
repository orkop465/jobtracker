import { auth } from "@/auth";
import Link from "next/link";

export default async function AnalyticsPage() {
  const session = await auth();

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Analytics</h1>
      <div style={{ opacity: 0.85, marginBottom: 18 }}>
        Signed in as <b>{session?.user?.email ?? "unknown"}</b>
      </div>

      <p>
        Next Phase 4 step: response rate + time-in-stage queries from your status events.
      </p>

      <div style={{ marginTop: 18 }}>
        <Link href="/app">Back to dashboard</Link>
      </div>
    </main>
  );
}
