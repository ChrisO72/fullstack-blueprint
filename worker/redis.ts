import type { RedisOptions } from "bullmq";
import { env } from "./env.server";

export const redisConnection = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
} satisfies RedisOptions;
