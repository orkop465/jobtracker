import { handlers } from "@/auth";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const { GET: authGet, POST: authPost } = handlers;

export const GET = authGet;

// Rate-limit credentials login attempts only. The credentials callback URL
// pattern is /api/auth/callback/credentials — that's the only path that hits
// authorize(). Everything else (OAuth callbacks, CSRF, session) goes
// straight through to NextAuth.
export async function POST(req: NextRequest) {
  if (req.url.includes("/api/auth/callback/credentials")) {
    const rl = checkRateLimit(req, "credentials");
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSeconds) },
        }
      );
    }
  }
  return authPost(req);
}
