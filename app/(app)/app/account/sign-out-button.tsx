"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="px-4 py-2 text-sm font-medium rounded-lg bg-negative-muted text-negative border border-negative/20 hover:bg-negative/20 transition-colors cursor-pointer"
    >
      Sign out
    </button>
  );
}
