import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    REFRESH_SECRET: z.string().min(32, "REFRESH_SECRET must be at least 32 characters"),
    LETTERMINT_API_KEY: z.string().min(1),
    MAIL_FROM: z.string().min(1),
    APP_URL: z.url(),
    S3_REGION: z.string().min(1).default("eu-central-1"),
    S3_BUCKET: z.string().min(3),
    S3_ENDPOINT: z.url().optional(),
    S3_FORCE_PATH_STYLE: z.stringbool().default(false),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  })
  .superRefine((values, context) => {
    if (Boolean(values.S3_ACCESS_KEY_ID) !== Boolean(values.S3_SECRET_ACCESS_KEY)) {
      context.addIssue({
        code: "custom",
        message: "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be provided together",
        path: ["S3_ACCESS_KEY_ID"],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  throw new Error("Invalid environment variables. See errors above.");
}

export const env = parsed.data;
