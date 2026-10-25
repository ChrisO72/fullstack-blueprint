import { z } from "zod";
export const workerEnvSchema = z.object({ REDIS_URL: z.url() });
