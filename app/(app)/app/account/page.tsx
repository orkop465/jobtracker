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
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Account</h1>
        <p className="text-sm text-text-muted mt-1">
          Signed in as <span className="text-text-primary font-medium">{session.user?.email ?? "unknown"}</span>
        </p>
      </div>

      <div className="bg-surface-1 border border-border rounded-xl p-5 space-y-4">
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">Auth Provider</p>
          <p className="text-sm text-text-primary capitalize">
            {linkedProviders.length ? linkedProviders.join(", ") : "Credentials"}
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs text-text-muted mb-3">
            Provider linking is currently disabled. Google and GitHub are treated as separate accounts.
          </p>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
