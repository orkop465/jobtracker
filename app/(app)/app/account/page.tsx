import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function AccountPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
        <div>Unauthorized</div>
      </main>
    );
  }

  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { provider: true },
  });
  const linkedProviders = accounts.map((a) => a.provider);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Account</h1>
      <div style={{ opacity: 0.85 }}>
        Signed in as <b>{session.user?.email ?? "unknown"}</b>
      </div>

      <div style={{ marginTop: 14 }}>
        Signed-in provider: {linkedProviders.length ? linkedProviders.join(", ") : "unknown"}
      </div>
      <div style={{ marginTop: 10, opacity: 0.85 }}>
        Provider linking is currently disabled. Google and GitHub are treated as separate
        accounts.
      </div>

      <div style={{ marginTop: 18 }}>
        <Link href="/app">Back to dashboard</Link>
      </div>
    </main>
  );
}
