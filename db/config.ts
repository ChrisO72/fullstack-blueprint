import { z } from "zod";
export const databaseEnvSchema = z.object({ DATABASE_URL: z.url() });
