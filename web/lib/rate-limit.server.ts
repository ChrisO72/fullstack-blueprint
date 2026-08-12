import { createHmac } from "node:crypto";
import Redis from "ioredis";
import { env } from "~/env.server";
import { createLogger } from "~/observability/logger.server";

const logger = createLogger("web");

export type AuthRateLimitAction = "login" | "signup" | "password-reset" | "resend";

type RateLimitRule = {
  limit: number;
  windowSeconds: number;
};

export type AuthRateLimitPolicies = Record<AuthRateLimitAction, RateLimitRule>;

export type RateLimitStore = {
  increment(
    key: string,
    windowSeconds: number,
  ): Promise<{
    count: number;
    retryAfterSeconds: number;
  }>;
};

type CreateAuthRateLimiterOptions = {
  store: RateLimitStore;
  keySecret: string;
  policies?: AuthRateLimitPolicies;
  onStoreError?: (error: unknown) => void;
};

type CheckAuthRateLimitInput = {
  action: AuthRateLimitAction;
  account: string;
};

export type AuthRateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export const AUTH_RATE_LIMIT_POLICIES: AuthRateLimitPolicies = {
  login: { limit: 10, windowSeconds: 15 * 60 },
  signup: { limit: 5, windowSeconds: 60 * 60 },
  "password-reset": { limit: 3, windowSeconds: 60 * 60 },
  resend: { limit: 3, windowSeconds: 60 * 60 },
};

const INCREMENT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
local ttl = redis.call("TTL", KEYS[1])

if count == 1 or ttl < 0 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end

return { count, ttl }
`;

let redisClient: Redis | undefined;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      connectTimeout: 1_000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    redisClient.on("error", () => undefined);
  }

  return redisClient;
}

const redisRateLimitStore: RateLimitStore = {
  async increment(key, windowSeconds) {
    const result: unknown = await getRedisClient().eval(
      INCREMENT_SCRIPT,
      1,
      key,
      windowSeconds.toString(),
    );

    if (
      !Array.isArray(result) ||
      result.length !== 2 ||
      typeof result[0] !== "number" ||
      typeof result[1] !== "number"
    ) {
      throw new Error("Unexpected Redis rate-limit response");
    }

    return {
      count: result[0],
      retryAfterSeconds: Math.max(1, result[1]),
    };
  },
};

function rateLimitKey(secret: string, action: AuthRateLimitAction, account: string): string {
  const digest = createHmac("sha256", secret).update(account).digest("hex");
  return `auth-rate-limit:${action}:account:${digest}`;
}

export function createAuthRateLimiter({
  store,
  keySecret,
  policies = AUTH_RATE_LIMIT_POLICIES,
  onStoreError,
}: CreateAuthRateLimiterOptions) {
  return async function checkAuthRateLimit({
    action,
    account,
  }: CheckAuthRateLimitInput): Promise<AuthRateLimitResult> {
    const policy = policies[action];
    const key = rateLimitKey(keySecret, action, account.trim().toLowerCase());

    try {
      const counter = await store.increment(key, policy.windowSeconds);
      if (counter.count <= policy.limit) return { allowed: true };
      return {
        allowed: false,
        retryAfterSeconds: counter.retryAfterSeconds,
      };
    } catch (error) {
      onStoreError?.(error);
      return { allowed: true };
    }
  };
}

export function createRateLimitResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { formError: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": Math.ceil(retryAfterSeconds).toString() },
    },
  );
}

export const checkAuthRateLimit = createAuthRateLimiter({
  store: redisRateLimitStore,
  keySecret: env.RATE_LIMIT_KEY_SECRET,
  onStoreError: (error) => {
    logger.error("auth.rate_limit.store_unavailable", error, { failMode: "open" });
  },
});
