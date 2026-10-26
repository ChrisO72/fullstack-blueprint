import { z } from "zod";

// Compose passes optional values as empty strings; treat them like omitted dotenv values.
export const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
export const nodeEnvironment = z.enum(["development", "production", "test"]).default("development");
