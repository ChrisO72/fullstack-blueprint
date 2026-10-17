import {
  context,
  propagation,
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  trace,
  metrics,
} from "@opentelemetry/api";
import { log } from "./log.server";
import { sanitizeError, safeJobId } from "./sanitize.server";

export function parseTraceMetadata(metadata: string | undefined): Record<string, string> {
  if (!metadata || metadata.length > 4096) return {};
  try {
    const value: unknown = JSON.parse(metadata);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const carrier: Record<string, string> = {};
    for (const key of ["traceparent", "tracestate"] as const) {
      if (key in value) {
        const field: unknown = value[key as keyof typeof value];
        if (typeof field !== "string") return {};
        carrier[key] = field;
      }
    }
    return carrier;
  } catch {
    return {};
  }
}

const tracer = trace.getTracer("blueprint.queue");
function instruments() {
  const meter = metrics.getMeter("blueprint.queue");
  return {
    attempts: meter.createCounter("job.attempts", { unit: "{attempt}" }),
    duration: meter.createHistogram("job.duration", { unit: "s" }),
  };
}
const shared = globalThis as typeof globalThis & {
  __blueprintJobMetrics?: ReturnType<typeof instruments>;
};
const { attempts, duration } = (shared.__blueprintJobMetrics ??= instruments());

export async function produceJob<T>(name: string, run: (metadata: string) => Promise<T>) {
  return tracer.startActiveSpan(
    `enqueue ${name}`,
    {
      kind: SpanKind.PRODUCER,
      attributes: {
        "messaging.system": "redis",
        "messaging.destination.name": "default",
        "job.name": name,
      },
    },
    async (span) => {
      try {
        const carrier: Record<string, string> = {};
        propagation.inject(context.active(), carrier);
        return await run(JSON.stringify(carrier));
      } catch (error) {
        span.recordException(sanitizeError(error));
        span.setStatus({ code: SpanStatusCode.ERROR });
        log.error("Job enqueue failed", error, { "job.name": name });
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

export async function consumeJob(
  name: string,
  id: string,
  attempt: number,
  metadata: string | undefined,
  run: () => Promise<void>,
) {
  const jobId = safeJobId(id);
  const parent = propagation.extract(ROOT_CONTEXT, parseTraceMetadata(metadata));
  return tracer.startActiveSpan(
    `process ${name}`,
    {
      kind: SpanKind.CONSUMER,
      attributes: {
        "messaging.system": "redis",
        "messaging.destination.name": "default",
        "job.name": name,
        "job.id": jobId,
        "job.attempt": attempt,
      },
    },
    parent,
    async (span) => {
      const start = performance.now();
      let outcome = "success";
      const fields = { "job.name": name, "job.id": jobId, "job.attempt": attempt };
      try {
        await run();
        log.info("Job completed", fields);
      } catch (error) {
        outcome = "error";
        span.recordException(sanitizeError(error));
        span.setStatus({ code: SpanStatusCode.ERROR });
        log.error("Job failed", error, fields);
        throw error;
      } finally {
        const labels = { "job.name": name, outcome };
        attempts.add(1, labels);
        duration.record((performance.now() - start) / 1000, labels);
        span.end();
      }
    },
  );
}
