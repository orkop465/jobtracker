"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      style={{ marginTop: 12, padding: "8px 12px" }}
    >
      Sign out
    </button>
  );
}
