"use client";

import { signIn, signOut } from "next-auth/react";

type Props = {
  linkedProviders: string[];
};

export default function LinkAccounts({ linkedProviders }: Props) {
  const hasGoogle = linkedProviders.includes("google");
  const hasGithub = linkedProviders.includes("github");

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/app/account" })}
        disabled={hasGoogle}
        style={{ padding: "8px 12px" }}
      >
        {hasGoogle ? "Google linked" : "Link Google"}
      </button>

      <button
        type="button"
        onClick={() => signIn("github", { callbackUrl: "/app/account", prompt: "login" })}
        disabled={hasGithub}
        style={{ padding: "8px 12px" }}
      >
        {hasGithub ? "GitHub linked" : "Link GitHub"}
      </button>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        style={{ padding: "8px 12px" }}
      >
        Sign out
      </button>
    </div>
  );
}
