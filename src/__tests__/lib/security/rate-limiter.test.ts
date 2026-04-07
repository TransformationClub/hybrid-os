import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/lib/security/rate-limiter";

describe("createRateLimiter", () => {
  it("allows requests within the limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });
    const result = limiter.check("user-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests that exceed the limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });

    limiter.check("user-1"); // 1
    limiter.check("user-1"); // 2
    limiter.check("user-1"); // 3

    const result = limiter.check("user-1"); // 4 -- should be blocked
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("treats different keys independently", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });

    limiter.check("user-a"); // 1 for a
    limiter.check("user-a"); // 2 for a

    const blockedA = limiter.check("user-a"); // 3 for a -- blocked
    expect(blockedA.allowed).toBe(false);

    const allowedB = limiter.check("user-b"); // 1 for b -- allowed
    expect(allowedB.allowed).toBe(true);
    expect(allowedB.remaining).toBe(1);
  });

  it("decreases remaining count with each request", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });

    const r1 = limiter.check("key");
    expect(r1.remaining).toBe(4);

    const r2 = limiter.check("key");
    expect(r2.remaining).toBe(3);

    const r3 = limiter.check("key");
    expect(r3.remaining).toBe(2);

    const r4 = limiter.check("key");
    expect(r4.remaining).toBe(1);

    const r5 = limiter.check("key");
    expect(r5.remaining).toBe(0);
  });

  it("includes a resetAt timestamp in the future", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });
    const before = Date.now();
    const result = limiter.check("key");
    expect(result.resetAt).toBeGreaterThanOrEqual(before + 60_000);
  });
});
