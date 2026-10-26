import { describe, expect, it } from "vitest";
import { sentryEnvSchema } from "../config";

describe("Sentry sampling configuration", () => {
  it.each([
    [undefined, 1],
    ["development", 1],
    ["test", 1],
    ["production", 0.2],
  ])("uses defaults for NODE_ENV=%s with omitted or empty rates", (nodeEnvironment, rate) => {
    for (const value of [undefined, ""]) {
      const config = sentryEnvSchema.parse({
        NODE_ENV: nodeEnvironment,
        // An event label must not change the runtime's sampling defaults.
        SENTRY_ENVIRONMENT: nodeEnvironment === "production" ? "staging" : "production",
        SENTRY_TRACES_SAMPLE_RATE: value,
        SENTRY_REPLAYS_SESSION_SAMPLE_RATE: value,
        SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: value,
      });
      expect(config.SENTRY_TRACES_SAMPLE_RATE).toBe(rate);
      expect(config.SENTRY_REPLAYS_SESSION_SAMPLE_RATE).toBe(rate);
      expect(config.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE).toBe(1);
    }
  });

  it.each(["development", "production"])("honors explicit rates in %s", (nodeEnvironment) => {
    const config = sentryEnvSchema.parse({
      NODE_ENV: nodeEnvironment,
      SENTRY_TRACES_SAMPLE_RATE: "0",
      SENTRY_REPLAYS_SESSION_SAMPLE_RATE: "0.4",
      SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: "0",
    });
    expect(config.SENTRY_TRACES_SAMPLE_RATE).toBe(0);
    expect(config.SENTRY_REPLAYS_SESSION_SAMPLE_RATE).toBe(0.4);
    expect(config.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE).toBe(0);
  });

  it.each([
    "SENTRY_TRACES_SAMPLE_RATE",
    "SENTRY_REPLAYS_SESSION_SAMPLE_RATE",
    "SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE",
  ])("rejects invalid %s values", (field) => {
    for (const value of ["-0.1", "1.1", "invalid"]) {
      expect(sentryEnvSchema.safeParse({ [field]: value }).success).toBe(false);
    }
  });
});
