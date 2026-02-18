import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Next.js 16+: middleware.ts was renamed to proxy.ts.
// Protect /app/* and redirect unauthenticated users to /login.
export const proxy = auth((req) => {
  if (req.auth?.user) return NextResponse.next();

  const loginUrl = new URL("/login", req.nextUrl.origin);
  loginUrl.searchParams.set("callbackUrl", req.nextUrl.href);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/app/:path*"],
};
