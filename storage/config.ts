import { z } from "zod";
import { optionalString } from "~/runtime/config";

export const storageEnvSchema = z
  .object({
    S3_REGION: optionalString.transform((value) => value ?? "eu-central-1"),
    S3_BUCKET: optionalString.pipe(z.string().min(3).optional()),
    S3_ENDPOINT: optionalString.pipe(z.url().optional()),
    S3_PUBLIC_ENDPOINT: optionalString.pipe(z.url().optional()),
    S3_FORCE_PATH_STYLE: optionalString
      .pipe(z.stringbool().optional())
      .transform((value) => value ?? false),
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
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
