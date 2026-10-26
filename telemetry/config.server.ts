import { readEnvironment } from "~/runtime/env.server";
import { sentryEnvSchema, type BrowserConfig } from "./config";
import { resolveRelease } from "./release.server";

export const config = readEnvironment(sentryEnvSchema);
export const release = resolveRelease();
export const environment = config.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development";

export function browserConfig(appUrl: string): BrowserConfig {
  return {
    dsn: process.env.NODE_ENV === "test" ? undefined : config.SENTRY_PUBLIC_DSN,
    environment,
    release,
    tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
    replaysSessionSampleRate: config.SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    replaysOnErrorSampleRate: config.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
    appOrigin: new URL(appUrl).origin,
  };
}
