import { afterEach, describe, expect, it, vi } from "vitest";
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
  readonly keys: string[] = [];
  private readonly counters = new Map<string, { count: number; expiresAt: number }>();

  async increment(key: string, windowSeconds: number) {
    this.keys.push(key);
    const now = Date.now();
    const current = this.counters.get(key);
    const counter =
      !current || current.expiresAt <= now
        ? { count: 0, expiresAt: now + windowSeconds * 1_000 }
        : current;

    counter.count += 1;
    this.counters.set(key, counter);

    return {
      count: counter.count,
      retryAfterSeconds: Math.max(1, Math.ceil((counter.expiresAt - now) / 1_000)),
    };
  }
}

afterEach(() => {
  vi.useRealTimers();
});

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

  it("allows requests again after the fixed window expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-12T12:00:00Z"));

    const limiter = createAuthRateLimiter({
      store: new MemoryRateLimitStore(),
      keySecret: KEY_SECRET,
      policies: testPolicies(),
    });
    const input = { action: "login" as const, account: "user@example.com" };

    await expect(limiter(input)).resolves.toEqual({ allowed: true });
    await expect(limiter(input)).resolves.toEqual({ allowed: false, retryAfterSeconds: 60 });

    vi.advanceTimersByTime(60_000);
    await expect(limiter(input)).resolves.toEqual({ allowed: true });
  });

  it("stores no raw account identifiers", async () => {
    const store = new MemoryRateLimitStore();
    const limiter = createAuthRateLimiter({
      store,
      keySecret: KEY_SECRET,
      policies: testPolicies(),
    });
    await limiter({
      action: "login",
      account: "private@example.com",
    });

    expect(store.keys).toHaveLength(1);
    expect(store.keys.join(" ")).not.toContain("private@example.com");
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
