// In-process per-IP fixed-window rate limiter for sensitive auth endpoints.
//
// Trade-off: this lives in process memory, so on Cloud Run with multiple
// instances each replica enforces its own counter. That makes a determined
// distributed attacker harder to stop, but it still meaningfully raises the
// cost of casual brute-force / enumeration from a single source. For
// production-grade limits across replicas, swap the in-memory Map for a
// Redis-backed counter (e.g. @upstash/ratelimit) — the public surface of
// `checkRateLimit` is intentionally kept narrow so that swap is mechanical.

type Bucket = "register" | "credentials";

interface BucketConfig {
  limit: number;
  windowMs: number;
}

const CONFIG: Record<Bucket, BucketConfig> = {
  // 5 register attempts per IP per 10 minutes (each triggers an email).
  register: { limit: 5, windowMs: 10 * 60 * 1000 },
  // 10 credentials login attempts per IP per minute.
  credentials: { limit: 10, windowMs: 60 * 1000 },
};

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Light periodic cleanup to keep the Map from growing unbounded under load.
// Runs at most once per minute and only when the map is non-trivial.
let lastCleanupAt = 0;
function maybeCleanup(now: number) {
  if (store.size < 1024) return;
  if (now - lastCleanupAt < 60_000) return;
  lastCleanupAt = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

function clientIp(req: Request): string {
  // Cloud Run sits behind Google's front-end, which sets X-Forwarded-For.
  // We take the first (left-most) entry, which is the original client IP.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(req: Request, bucket: Bucket): RateLimitResult {
  const cfg = CONFIG[bucket];
  const now = Date.now();
  maybeCleanup(now);

  const key = `${bucket}:${clientIp(req)}`;
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + cfg.windowMs });
    return { ok: true, remaining: cfg.limit - 1, retryAfterSeconds: 0 };
  }

  if (entry.count >= cfg.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return {
    ok: true,
    remaining: cfg.limit - entry.count,
    retryAfterSeconds: 0,
  };
}
