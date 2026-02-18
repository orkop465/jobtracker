import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LinkAccounts from "./link-accounts";

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
        Linked providers: {linkedProviders.length ? linkedProviders.join(", ") : "none"}
      </div>

      <LinkAccounts linkedProviders={linkedProviders} />

      <div style={{ marginTop: 18 }}>
        <Link href="/app">Back to dashboard</Link>
      </div>
    </main>
  );
}
