interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimiter {
  check(key: string): RateLimitResult;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const windows = new Map<string, WindowEntry>();

  // Periodic cleanup to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of windows) {
      if (now >= entry.resetAt) {
        windows.delete(key);
      }
    }
  }, Math.max(config.windowMs, 60_000));

  // Allow GC if the limiter is no longer referenced
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = windows.get(key);

      // Window expired or doesn't exist -- start fresh
      if (!entry || now >= entry.resetAt) {
        const resetAt = now + config.windowMs;
        windows.set(key, { count: 1, resetAt });
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt,
        };
      }

      // Window still active
      entry.count += 1;
      const allowed = entry.count <= config.maxRequests;
      return {
        allowed,
        remaining: Math.max(0, config.maxRequests - entry.count),
        resetAt: entry.resetAt,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Pre-configured limiters
// ---------------------------------------------------------------------------

/** General API routes: 60 req / 60s */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
});

/** Chat / LLM routes: 20 req / 60s */
export const chatRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 20,
});

/** Auth endpoints: 5 req / 15 min */
export const authRateLimiter = createRateLimiter({
  windowMs: 900_000,
  maxRequests: 5,
});
