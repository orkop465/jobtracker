import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";

import { prisma } from "@/lib/prisma";

// Permanent sentinel bcrypt hash used to equalize response time on the
// failure paths of credentials authorize().
//
// THIS IS NOT A PLACEHOLDER. Do not delete or replace it.
//
// Why it exists: bcrypt.compare is intentionally slow (~250ms at cost 12).
// If we skip the compare when the user does not exist, the failure path
// becomes ~50x faster than the success path, and an attacker can learn
// which emails are registered just by timing our 401 responses
// (user-enumeration via timing side-channel).
//
// To close the side-channel we ALWAYS run bcrypt.compare — including on
// the "no such user" branch — against this sentinel hash. The plaintext
// that produced it is unknown to us and is not stored anywhere, so this
// hash can never match any real password. It is a fixed runtime constant,
// the cryptographic equivalent of `time.sleep(250ms)` but real bcrypt work
// so an attacker cannot distinguish a sleep from a real compare.
const TIMING_EQUALIZER_HASH =
  "$2b$12$CwTycUXWue0Thq9StjUM0uJ8fQ.7m6m4D4kGQHy9rwe.7t3MZPx2K";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  // Credentials provider works reliably with JWT sessions.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google({
      authorization: {
        params: {
          // Prevent silent reuse of a different Google browser session.
          prompt: "select_account",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: `google:${profile.sub}@oauth.local`,
          image: profile.picture,
        };
      },
    }),
    GitHub({
      authorization: {
        params: {
          // Force GitHub to re-auth and avoid silently reusing the wrong account session.
          prompt: "login",
        },
      },
      profile(profile) {
        const id = String(profile.id);
        return {
          id,
          name: profile.name ?? profile.login ?? "GitHub User",
          email: `github:${id}@oauth.local`,
          image: profile.avatar_url,
        };
      },
    }),
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.toLowerCase().trim()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        // Even on obviously-invalid input, run a real bcrypt.compare against
        // the timing-equalizer hash so this branch isn't detectably faster
        // than the success branch. See TIMING_EQUALIZER_HASH above.
        if (!email || !password) {
          await bcrypt.compare(password || "x", TIMING_EQUALIZER_HASH);
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // Always run bcrypt.compare against either the real hash (if the user
        // exists) or the timing-equalizer hash (if not). Both branches now take
        // the same ~250ms, so an attacker can't tell whether `email` is
        // registered just by timing our response.
        const hashToCompare = user?.passwordHash ?? TIMING_EQUALIZER_HASH;
        const ok = await bcrypt.compare(password, hashToCompare);

        if (!user?.passwordHash || !ok) return null;

        // Block unverified credentials accounts. This check happens AFTER
        // bcrypt.compare so the timing is already equalized.
        if (!user.emailVerified) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user?.id) token.id = user.id;
      if (account?.provider === "google" && typeof (profile as any)?.email === "string") {
        token.displayEmail = String((profile as any).email).toLowerCase();
      }
      if (account?.provider === "github" && typeof (profile as any)?.email === "string") {
        token.displayEmail = String((profile as any).email).toLowerCase();
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user) return session;
      if (token?.id) (session.user as any).id = String(token.id);
      if (typeof (token as any).displayEmail === "string" && (token as any).displayEmail) {
        session.user.email = (token as any).displayEmail;
      }
      return session;
    },
  },
});
