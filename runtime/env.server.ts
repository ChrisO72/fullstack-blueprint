import "dotenv/config";
import type { z } from "zod";

export function readEnvironment<T>(schema: z.ZodType<T>): T {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    // Report field names, never input values or connection credentials.
    const fields = result.error.issues.map((issue) => issue.path.join(".") || "environment");
    throw new Error(`Invalid environment configuration: ${[...new Set(fields)].join(", ")}`);
  }
  return result.data;
}
