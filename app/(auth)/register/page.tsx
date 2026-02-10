"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setBusy(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.error ?? "Registration failed.");
      return;
    }

    // Auto-login
    await signIn("credentials", { email, password, callbackUrl: "/app" });
  }

  return (
    <main style={{ maxWidth: 420, margin: "60px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Create account</h1>

      <form onSubmit={onRegister} style={{ display: "grid", gap: 10 }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label>
          Password (min 8 chars)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <button type="submit" disabled={busy} style={{ padding: "10px 12px" }}>
          {busy ? "Creating..." : "Create account"}
        </button>

        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </form>

      <div style={{ marginTop: 14 }}>
        Already have an account? <Link href="/login">Log in</Link>
      </div>
    </main>
  );
}
