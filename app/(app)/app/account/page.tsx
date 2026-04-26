import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import SignOutButton from "./sign-out-button";

export default async function AccountPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="text-center py-20 text-text-muted">Unauthorized</div>
    );
  }

  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { provider: true },
  });
  const linkedProviders = accounts.map((a) => a.provider);

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-white/5">
        <div className="section-index text-accent mb-2">05 / Settings</div>
        <h1 className="text-2xl font-display text-text-primary">Account</h1>
        <p className="font-data text-[9px] text-text-muted mt-1 uppercase tracking-widest">
          Signed in as <span className="text-text-primary">{session.user?.email ?? "unknown"}</span>
        </p>
      </div>

      <div className="gradient-border-card p-6 space-y-5">
        <div>
          <p className="font-data text-[9px] font-medium text-text-muted uppercase tracking-widest mb-2">Auth Provider</p>
          <p className="text-sm text-text-primary capitalize font-data">
            {linkedProviders.length ? linkedProviders.join(", ") : "Credentials"}
          </p>
        </div>

        <div className="border-t border-white/5 pt-5">
          <p className="text-xs text-text-muted mb-4 font-data">
            Provider linking is currently disabled. Google and GitHub are treated as separate accounts.
          </p>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
