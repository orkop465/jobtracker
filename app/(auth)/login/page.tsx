"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

function LoginContent() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") ?? "/app";
  const oauthError = sp.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCredentials(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setBusy(false);

    if (!res?.ok) {
      setErr("Invalid email or password.");
      return;
    }

    window.location.href = res.url ?? callbackUrl;
  }

  return (
    <main style={{ maxWidth: 420, margin: "60px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Log in</h1>

      {oauthError === "OAuthAccountNotLinked" && (
        <div style={{ color: "crimson", marginBottom: 12 }}>
          This email is already registered with a different sign-in method. Sign in with your
          existing method first, then link GitHub from Account settings.
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        <button onClick={() => signIn("google", { callbackUrl })}>Continue with Google</button>
        <button onClick={() => signIn("github", { callbackUrl, prompt: "login" })}>
          Continue with GitHub
        </button>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <form onSubmit={onCredentials} style={{ display: "grid", gap: 10 }}>
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
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <button type="submit" disabled={busy} style={{ padding: "10px 12px" }}>
          {busy ? "Logging in..." : "Log in"}
        </button>

        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </form>

      <div style={{ marginTop: 14 }}>
        No account? <Link href="/register">Create one</Link>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 420, margin: "60px auto", padding: 16 }}>Loading...</main>}>
      <LoginContent />
    </Suspense>
  );
}
