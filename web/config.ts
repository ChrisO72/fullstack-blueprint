import { z } from "zod";
import { nodeEnvironment } from "~/runtime/config";

export const webEnvSchema = z.object({
  NODE_ENV: nodeEnvironment,
  APP_URL: z.url(),
  REDIS_URL: z.url(),
  RATE_LIMIT_KEY_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  REFRESH_SECRET: z.string().min(32),
});
