import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);
const dsn = optionalString.pipe(
  z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        Boolean(url.username) &&
        !url.password &&
        !url.search &&
        !url.hash &&
        /^\/\d+$/.test(url.pathname)
      );
    }, "Expected a Sentry DSN with a public key and numeric project ID")
    .optional(),
);
const rate = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().min(0).max(1).optional(),
);

export const sentryEnvSchema = z
  .object({
    NODE_ENV: optionalString,
    SENTRY_DSN: dsn,
    SENTRY_PUBLIC_DSN: dsn,
    SENTRY_ENVIRONMENT: optionalString,
    SENTRY_RELEASE: optionalString,
    SENTRY_TRACES_SAMPLE_RATE: rate,
    SENTRY_REPLAYS_SESSION_SAMPLE_RATE: rate,
    SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: rate,
  })
  .transform(({ NODE_ENV, ...config }) => {
    const defaultRate = NODE_ENV === "production" ? 0.2 : 1;
    return {
      ...config,
      SENTRY_TRACES_SAMPLE_RATE: config.SENTRY_TRACES_SAMPLE_RATE ?? defaultRate,
      SENTRY_REPLAYS_SESSION_SAMPLE_RATE: config.SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? defaultRate,
      SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: config.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? 1,
    };
  });

export type BrowserConfig = {
  dsn?: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  appOrigin: string;
};
