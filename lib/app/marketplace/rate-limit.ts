// Per-user, per-bucket fixed-window in-memory rate limiter.
// Single Cloud Run instance assumption per the spec; move to a shared
// store (Redis) when horizontal scale-out happens.

type Bucket = "rating" | "submission";

const CONFIG: Record<Bucket, { limit: number; windowMs: number }> = {
  rating: { limit: 60, windowMs: 60 * 60 * 1000 },
  submission: { limit: 10, windowMs: 60 * 60 * 1000 },
};

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

let lastCleanupAt = 0;
function maybeCleanup(now: number) {
  if (store.size < 1024) return;
  if (now - lastCleanupAt < 60_000) return;
  lastCleanupAt = now;
  for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkUserRateLimit(userId: string, bucket: Bucket): RateLimitResult {
  const cfg = CONFIG[bucket];
  const now = Date.now();
  maybeCleanup(now);

  const key = `${bucket}:${userId}`;
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
  return { ok: true, remaining: cfg.limit - entry.count, retryAfterSeconds: 0 };
}
