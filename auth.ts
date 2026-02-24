import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";

import { prisma } from "@/lib/prisma";

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

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

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
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (!session.user) return session;
      if (token?.id) (session.user as any).id = String(token.id);
      return session;
    },
  },
});
