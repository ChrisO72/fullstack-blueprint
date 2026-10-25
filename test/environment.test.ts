import { afterEach, describe, expect, it, vi } from "vitest";
import { databaseEnvSchema } from "~/db/config";
import { workerEnvSchema } from "~/worker/config";
import { webEnvSchema } from "~/config";
import { mailEnvSchema } from "~/mail/config";
import { storageEnvSchema } from "~/storage/config";
import { sentryEnvSchema, serverDsn } from "~/telemetry/config";
import { readEnvironment } from "~/runtime/env.server";

const database = { DATABASE_URL: "postgresql://user:password@database:5432/blueprint" };
const worker = { ...database, REDIS_URL: "redis://redis:6379", APP_URL: "https://app.example" };
const web = {
  ...worker,
  JWT_SECRET: "j".repeat(32),
  REFRESH_SECRET: "r".repeat(32),
  RATE_LIMIT_KEY_SECRET: "l".repeat(32),
};

afterEach(() => vi.unstubAllEnvs());

describe("component environment contracts", () => {
  it("allows database tools to operate with only a database URL", () => {
    expect(databaseEnvSchema.parse(database)).toEqual(database);
    expect(databaseEnvSchema.safeParse({}).success).toBe(false);
  });

  it("allows worker integrations without web authentication configuration", () => {
    expect(workerEnvSchema.parse(worker)).toEqual({ REDIS_URL: worker.REDIS_URL });
    expect(databaseEnvSchema.parse(worker)).toEqual(database);
    expect(mailEnvSchema.parse(worker)).toEqual({ APP_URL: worker.APP_URL });
    expect(storageEnvSchema.safeParse(worker).success).toBe(true);
    expect(sentryEnvSchema.safeParse(worker).success).toBe(true);
    expect(workerEnvSchema.safeParse({}).success).toBe(false);
  });

  it.each(["JWT_SECRET", "REFRESH_SECRET", "RATE_LIMIT_KEY_SECRET"] as const)(
    "requires a sufficiently long %s for web",
    (key) => {
      expect(webEnvSchema.safeParse(web).success).toBe(true);
      expect(webEnvSchema.safeParse({ ...web, [key]: undefined }).success).toBe(false);
      expect(webEnvSchema.safeParse({ ...web, [key]: "short" }).success).toBe(false);
    },
  );

  it("treats empty optional integration variables as disabled", () => {
    expect(
      mailEnvSchema.parse({
        APP_URL: worker.APP_URL,
        LETTERMINT_API_KEY: "",
        LETTERMINT_MAIL_FROM: "",
      }),
    ).toMatchObject({ LETTERMINT_API_KEY: undefined, LETTERMINT_MAIL_FROM: undefined });
    expect(
      storageEnvSchema.parse({ S3_BUCKET: "", S3_ENDPOINT: "", S3_FORCE_PATH_STYLE: "" }),
    ).toMatchObject({ S3_BUCKET: undefined, S3_ENDPOINT: undefined, S3_FORCE_PATH_STYLE: false });
    expect(sentryEnvSchema.parse({ SENTRY_DSN: "", SENTRY_PUBLIC_DSN: "" })).toMatchObject({
      SENTRY_DSN: undefined,
      SENTRY_PUBLIC_DSN: undefined,
    });
  });

  it("supports IAM-based storage but rejects incomplete static credentials", () => {
    expect(storageEnvSchema.safeParse({ S3_BUCKET: "files" }).success).toBe(true);
    expect(storageEnvSchema.safeParse({ S3_ACCESS_KEY_ID: "key" }).success).toBe(false);
    expect(storageEnvSchema.safeParse({ S3_SECRET_ACCESS_KEY: "secret" }).success).toBe(false);
    expect(
      storageEnvSchema.parse({
        S3_ACCESS_KEY_ID: "key",
        S3_SECRET_ACCESS_KEY: "secret",
        S3_FORCE_PATH_STYLE: "true",
      }),
    ).toMatchObject({ S3_FORCE_PATH_STYLE: true });
  });

  it("uses explicit environment values and reports invalid fields without their values", () => {
    vi.stubEnv("DATABASE_URL", database.DATABASE_URL);
    expect(readEnvironment(databaseEnvSchema)).toEqual(database);
    vi.stubEnv("DATABASE_URL", "private-credential");
    expect(() => readEnvironment(databaseEnvSchema)).toThrow(
      "Invalid environment configuration: DATABASE_URL",
    );
    expect(() => readEnvironment(databaseEnvSchema)).not.toThrow("private-credential");
  });
});

describe("Sentry routing", () => {
  it("rewrites only server ingress while preserving public DSNs and project identity", () => {
    const publicDsn = "http://public-key@localhost:9090/42";
    const config = sentryEnvSchema.parse({
      SENTRY_DSN: publicDsn,
      SENTRY_PUBLIC_DSN: publicDsn,
      SENTRY_INGEST_ORIGIN: "http://sentry-ingest",
    });
    expect(serverDsn(config)).toBe("http://public-key@sentry-ingest/42");
    expect(config.SENTRY_DSN).toBe(publicDsn);
    expect(config.SENTRY_PUBLIC_DSN).toBe(publicDsn);
  });

  it("keeps host transport unchanged and allows disabled telemetry with an ingress configured", () => {
    const dsn = "https://key@sentry.example/42";
    expect(serverDsn(sentryEnvSchema.parse({ SENTRY_DSN: dsn }))).toBe(dsn);
    expect(
      serverDsn(sentryEnvSchema.parse({ SENTRY_INGEST_ORIGIN: "http://sentry-ingest" })),
    ).toBeUndefined();
  });
});
