import { describe, expect, it, vi } from "vitest";
import {
  createAuthRateLimiter,
  createRateLimitResponse,
  type AuthRateLimitPolicies,
  type RateLimitStore,
} from "~/lib/rate-limit.server";

const KEY_SECRET = "test-rate-limit-key-secret-with-at-least-32-characters";

function testPolicies(limit = 1): AuthRateLimitPolicies {
  const policy = { limit, windowSeconds: 60 };
  return {
    login: policy,
    signup: policy,
    "password-reset": policy,
    resend: policy,
  };
}

class MemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, number>();

  async increment(key: string, windowSeconds: number) {
    const count = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, count);
    return { count, retryAfterSeconds: windowSeconds };
  }
}

describe("auth rate limiter", () => {
  it("shares allowed and blocked account counters across limiter instances", async () => {
    const store = new MemoryRateLimitStore();
    const options = {
      store,
      keySecret: KEY_SECRET,
      policies: testPolicies(),
    };
    const firstInstance = createAuthRateLimiter(options);
    const secondInstance = createAuthRateLimiter(options);

    await expect(firstInstance({ action: "login", account: "User@example.com" })).resolves.toEqual({
      allowed: true,
    });
    await expect(
      secondInstance({ action: "login", account: " user@example.com " }),
    ).resolves.toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("fails open and logs once when Redis is unavailable", async () => {
    const onStoreError = vi.fn();
    const failingStore: RateLimitStore = {
      increment: vi.fn().mockRejectedValue(new Error("Redis unavailable")),
    };
    const limiter = createAuthRateLimiter({
      store: failingStore,
      keySecret: KEY_SECRET,
      policies: testPolicies(),
      onStoreError,
    });

    await expect(
      limiter({
        action: "password-reset",
        account: "private@example.com",
      }),
    ).resolves.toEqual({ allowed: true });
    expect(onStoreError).toHaveBeenCalledOnce();
  });

  it("returns generic retry timing without setting cookies", async () => {
    const response = createRateLimitResponse(42.2);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("43");
    expect(response.headers.get("Set-Cookie")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      formError: "Too many requests. Please try again later.",
    });
  });
});
