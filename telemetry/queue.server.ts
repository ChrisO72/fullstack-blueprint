import { createHash } from "node:crypto";
import * as Sentry from "@sentry/node";
import { log } from "./log.server";

export const safeJobId = (id: string) => createHash("sha256").update(id).digest("hex").slice(0, 24);

export function parseTraceMetadata(metadata?: string): { sentryTrace?: string; baggage?: string } {
  if (!metadata || metadata.length > 4096) return {};
  try {
    const value: unknown = JSON.parse(metadata);
    if (!value || typeof value !== "object" || !("sentry-trace" in value)) return {};
    const sentryTrace = value["sentry-trace"];
    if (
      typeof sentryTrace !== "string" ||
      !/^[a-f0-9]{32}-[a-f0-9]{16}(?:-[01])?$/.test(sentryTrace) ||
      /^0{32}-|^[a-f0-9]{32}-0{16}(?:-|$)/.test(sentryTrace)
    )
      return {};
    const baggage = "baggage" in value ? value.baggage : undefined;
    if (baggage !== undefined && typeof baggage !== "string") return {};
    if (baggage && baggage.split(",").some((part) => !/^[\w-]+=[^\s;,]*$/.test(part.trim())))
      return {};
    // Bad percent encoding must not reach the SDK or affect processing the job.
    if (baggage) decodeURIComponent(baggage);
    return {
      sentryTrace,
      baggage: baggage
        ?.split(",")
        .filter((part) =>
          /^sentry-(?:trace_id|public_key|sampled|sample_rate|environment|release)=/.test(
            part.trim(),
          ),
        )
        .join(","),
    };
  } catch {
    return {};
  }
}

export async function produceJob<T>(
  name: string,
  run: (metadata: string) => Promise<T>,
): Promise<T> {
  const publish = () =>
    Sentry.startSpan(
      {
        name: `enqueue ${name}`,
        op: "queue.publish",
        attributes: {
          "messaging.system": "redis",
          "messaging.destination.name": "default",
          "job.name": name,
        },
      },
      async () => {
        try {
          return await run(JSON.stringify(Sentry.getTraceData()));
        } catch (error) {
          // The request/schedule boundary reports the exception; avoid double capture here.
          log.warn("Job enqueue failed", { "job.name": name });
          throw error;
        }
      },
    );
  // Queue monitoring expects the publish span to be a child, including scheduled producers.
  return Sentry.getActiveSpan()
    ? publish()
    : Sentry.startSpan({ name: `enqueue ${name}`, op: "function" }, publish);
}

export async function consumeJob(
  name: string,
  id: string,
  attempt: number,
  metadata: string | undefined,
  run: () => Promise<void>,
) {
  return Sentry.withIsolationScope(() =>
    Sentry.continueTrace(
      { sentryTrace: undefined, baggage: undefined, ...parseTraceMetadata(metadata) },
      () =>
        Sentry.startSpan({ name: `job ${name}`, op: "function", forceTransaction: true }, () =>
          Sentry.startSpan(
            {
              name: `process ${name}`,
              op: "queue.process",
              attributes: {
                "messaging.system": "redis",
                "messaging.destination.name": "default",
                "messaging.message.id": safeJobId(id),
                "messaging.message.retry.count": attempt - 1,
                "job.name": name,
                "job.attempt": attempt,
              },
            },
            async () => {
              const started = performance.now();
              let outcome = "success";
              const fields = { "job.name": name, "job.id": safeJobId(id), "job.attempt": attempt };
              Sentry.setTags(fields);
              try {
                await run();
                log.info("Job completed", fields);
              } catch (error) {
                outcome = "error";
                log.error("Job failed", error, fields);
                throw error;
              } finally {
                const attributes = { "job.name": name, outcome };
                Sentry.metrics.count("job.attempts", 1, { attributes });
                Sentry.metrics.distribution("job.duration", (performance.now() - started) / 1000, {
                  unit: "second",
                  attributes,
                });
              }
            },
          ),
        ),
    ),
  );
}
