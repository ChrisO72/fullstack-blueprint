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
const rate = (fallback: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? fallback : value),
    z.coerce.number().min(0).max(1),
  );

export const sentryEnvSchema = z.object({
  SENTRY_DSN: dsn,
  SENTRY_INGEST_ORIGIN: optionalString.pipe(z.url().optional()),
  SENTRY_PUBLIC_DSN: dsn,
  SENTRY_ENVIRONMENT: optionalString,
  SENTRY_RELEASE: optionalString,
  SENTRY_TRACES_SAMPLE_RATE: rate(1),
  SENTRY_REPLAYS_SESSION_SAMPLE_RATE: rate(1),
  SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: rate(1),
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

// Only the server transport uses the internal address. Public/browser DSNs remain unchanged.
export function serverDsn(config: z.infer<typeof sentryEnvSchema>): string | undefined {
  if (!config.SENTRY_DSN || !config.SENTRY_INGEST_ORIGIN) return config.SENTRY_DSN;
  const dsn = new URL(config.SENTRY_DSN);
  const origin = new URL(config.SENTRY_INGEST_ORIGIN);
  dsn.protocol = origin.protocol;
  dsn.hostname = origin.hostname;
  dsn.port = origin.port;
  return dsn.toString();
}
