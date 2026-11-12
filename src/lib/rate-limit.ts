const WINDOW_MS = 60_000;
const MAX_REQUESTS = 45;

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateGlobal {
  __cpRateBuckets?: Map<string, Bucket>;
}

function buckets(): Map<string, Bucket> {
  const store = globalThis as unknown as RateGlobal;
  if (!store.__cpRateBuckets) store.__cpRateBuckets = new Map();
  return store.__cpRateBuckets;
}

export function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfter: number;
} {
  const map = buckets();
  const now = Date.now();
  const bucket = map.get(key);

  if (!bucket || bucket.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfter: 0 };
}
