import * as Sentry from "@sentry/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sentryEnvSchema } from "~/telemetry/config";
import { privacyOptions, sanitizeText, isSafeReplayUrls } from "~/telemetry/redact";
import { consumeJob, parseTraceMetadata, produceJob, safeJobId } from "~/telemetry/queue.server";
import { reportError } from "~/telemetry/log.server";
import { shouldReportRequestError } from "~/telemetry/http.server";
import { createLifecycle } from "~/runtime/lifecycle.server";
import { createProcessController } from "~/runtime/process.server";

type CapturedEvent = {
  exception?: {
    values?: {
      value?: string;
      stacktrace?: { frames?: { filename?: string; lineno?: number }[] };
    }[];
  };
  tags?: Record<string, unknown>;
  contexts?: { trace?: { trace_id?: string } };
};
const events: CapturedEvent[] = [];

beforeAll(() => {
  // Real scopes and serialization, with no instrumentation, network, or external services.
  Sentry.init({
    ...privacyOptions,
    dsn: "http://public@localhost:1/1",
    tracesSampleRate: 1,
    defaultIntegrations: false,
    enableRuntimeChannelInjection: false,
    transport: () => ({
      send(envelope) {
        for (const [headers, payload] of envelope[1]) {
          if (headers.type === "event" && payload && typeof payload === "object") {
            events.push(payload as CapturedEvent);
          }
        }
        return Promise.resolve({ statusCode: 200 });
      },
      flush: () => Promise.resolve(true),
    }),
  });
});
afterEach(async () => {
  await Sentry.flush();
  events.length = 0;
  vi.restoreAllMocks();
});
afterAll(async () => {
  await Sentry.close();
});

describe("Sentry configuration and redaction", () => {
  it("drops replay segments whose DOM metadata could contain sensitive URLs", () => {
    expect(isSafeReplayUrls(["http://localhost:5173/items"])).toBe(true);
    expect(isSafeReplayUrls(["http://localhost:5173/reset-password?token=private"])).toBe(false);
    expect(isSafeReplayUrls(["http://localhost:5173/confirm-email/private-token"])).toBe(false);
  });
  it("accepts disabled configuration and rejects malformed DSNs and sampling", () => {
    expect(sentryEnvSchema.parse({ SENTRY_DSN: "" }).SENTRY_DSN).toBeUndefined();
    expect(sentryEnvSchema.safeParse({ SENTRY_DSN: "http://localhost:9090" }).success).toBe(false);
    expect(
      sentryEnvSchema.safeParse({ SENTRY_PUBLIC_DSN: "http://key:secret@localhost:9090/1" })
        .success,
    ).toBe(false);
    expect(sentryEnvSchema.safeParse({ SENTRY_TRACES_SAMPLE_RATE: 2 }).success).toBe(false);
  });
  it("keeps diagnostic text and source frames while removing collected payloads", () => {
    const event = privacyOptions.beforeSend({
      type: undefined,
      exception: {
        values: [
          {
            type: "Error",
            value: "Delivery failed token=secret private@example.com",
            stacktrace: {
              frames: [
                {
                  filename: "worker/jobs/send-confirmation-email.ts",
                  lineno: 12,
                  vars: { token: "secret" },
                },
              ],
            },
          },
        ],
      },
      request: {
        url: "https://user:pass@example.com/reset-password/private-token?token=secret",
        headers: { authorization: "secret" },
        data: "payload",
        cookies: { token: "secret" },
      },
      extra: { payload: "private" },
      user: { email: "private@example.com" },
    });
    expect(event?.exception?.values?.[0].value).toContain("Delivery failed");
    expect(event?.exception?.values?.[0].stacktrace?.frames?.[0]).toMatchObject({
      filename: "worker/jobs/send-confirmation-email.ts",
      lineno: 12,
    });
    expect(JSON.stringify(event)).not.toMatch(
      /secret|private-token|private@example|payload|user:pass/,
    );
  });
  it("scrubs automatically collected logs, spans, and breadcrumb data", () => {
    const log = privacyOptions.beforeSendLog({
      level: "error",
      message: "Failure token=secret",
      attributes: {
        "job.name": "sendMail",
        payload: "secret",
        "sentry.trace.parent_span_id": "a".repeat(16),
        "sentry.release": "blueprint@build",
      },
    });
    const breadcrumb = privacyOptions.beforeBreadcrumb({
      category: "http",
      data: {
        body: "secret",
        method: "POST",
        url: "/reset-password/secret?token=secret",
        status_code: 500,
      },
    });
    const span = privacyOptions.beforeSendSpan({
      trace_id: "a".repeat(32),
      span_id: "b".repeat(16),
      name: "SELECT 'secret'",
      start_timestamp: 1,
      status: "ok",
      is_segment: false,
      attributes: {
        "sentry.op": "db.query",
        "db.operation.name": "SELECT",
        "db.query.text": "SELECT 'secret'",
      },
    });
    expect(JSON.stringify([log, breadcrumb, span])).not.toContain("secret");
    expect(log.attributes?.["sentry.trace.parent_span_id"]).toBe("a".repeat(16));
    expect(log.attributes?.["sentry.release"]).toBe("blueprint@build");
    expect(breadcrumb?.data).toMatchObject({
      method: "POST",
      url: "/reset-password/[redacted]",
      status_code: 500,
    });
    expect(span?.name).toBe("SELECT");
    expect(sanitizeText("Failed query: SELECT secret\nparams: token")).toContain(
      "see exception cause",
    );
  });
  it("does not capture the same Error twice", async () => {
    const error = new Error("One failure");
    reportError("Failure", error);
    reportError("Failure", error);
    await Sentry.flush();
    expect(events).toHaveLength(1);
  });
});

describe("queue context and retries", () => {
  it.each([
    undefined,
    "{",
    "null",
    "[]",
    '"string"',
    '{"traceparent":"old"}',
    '{"sentry-trace":123}',
    JSON.stringify({ "sentry-trace": `${"a".repeat(32)}-${"b".repeat(16)}-1`, baggage: "broken" }),
    JSON.stringify({
      "sentry-trace": `${"a".repeat(32)}-${"b".repeat(16)}-1`,
      baggage: "sentry-release=%XX",
    }),
    JSON.stringify({ "sentry-trace": `${"0".repeat(32)}-${"b".repeat(16)}-1` }),
    "x".repeat(4097),
  ])("ignores invalid or legacy metadata %s", (metadata) => {
    expect(parseTraceMetadata(metadata)).toEqual({});
  });
  it("passes Sentry context without changing the producer return value", async () => {
    let metadata = "";
    const result = await produceJob("mail", async (value) => {
      metadata = value;
      return 42;
    });
    expect(result).toBe(42);
    expect(parseTraceMetadata(metadata).sentryTrace).toMatch(/^[a-f0-9]{32}-[a-f0-9]{16}-[01]$/);
  });
  it("isolates concurrent attempts, continues their traces, and rethrows unchanged", async () => {
    const failures = [new Error("First failure"), new Error("Second failure")];
    const ids = ["1".repeat(32), "2".repeat(32)];
    let release: () => void = () => undefined;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = consumeJob(
      "mail",
      "secret-job-token",
      1,
      JSON.stringify({ "sentry-trace": `${ids[0]}-${"a".repeat(16)}-1` }),
      async () => {
        await barrier;
        throw failures[0];
      },
    );
    const second = consumeJob(
      "file",
      "other-secret",
      2,
      JSON.stringify({ "sentry-trace": `${ids[1]}-${"b".repeat(16)}-1` }),
      async () => {
        release();
        throw failures[1];
      },
    );
    const results = await Promise.allSettled([first, second]);
    expect(results).toEqual([
      { status: "rejected", reason: failures[0] },
      { status: "rejected", reason: failures[1] },
    ]);
    await Sentry.flush();
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.contexts?.trace?.trace_id).sort()).toEqual(ids);
    expect(events.map((event) => event.tags?.["job.name"]).sort()).toEqual(["file", "mail"]);
    expect(JSON.stringify(events)).not.toContain("secret-job-token");
    expect(safeJobId("secret-job-token")).toBe(safeJobId("secret-job-token"));
  });
  it("completes successful jobs without an error report", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    await consumeJob("mail", "job", 1, undefined, run);
    expect(run).toHaveBeenCalledOnce();
    await Sentry.flush();
    expect(events).toHaveLength(0);
  });
});

describe("HTTP filtering and shutdown", () => {
  it("drains once and preserves a fatal exit during graceful shutdown", async () => {
    const order: string[] = [];
    const exit = vi.fn();
    const controller = createProcessController({
      shutdown: async () => {
        order.push("shutdown");
      },
      report: vi.fn(),
      exit,
    });
    controller.registerDrain(async () => {
      await Promise.resolve();
      order.push("drain");
    });
    await Promise.all([controller.stop(), controller.stop(1)]);
    expect(order).toEqual(["drain", "shutdown"]);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });
  it("filters aborts and expected responses but retains server failures", () => {
    expect(shouldReportRequestError(new Error("abort"), true)).toBe(false);
    expect(shouldReportRequestError(new Response(null, { status: 302 }))).toBe(false);
    expect(
      shouldReportRequestError({
        status: 404,
        statusText: "Not Found",
        internal: false,
        data: null,
      }),
    ).toBe(false);
    expect(shouldReportRequestError(new Response(null, { status: 500 }))).toBe(true);
    expect(shouldReportRequestError(new Error("failure"))).toBe(true);
  });
  it("finishes resource cleanup before flushing, even when a cleanup fails", async () => {
    const lifecycle = createLifecycle();
    const order: string[] = [];
    lifecycle.registerCleanup(async () => {
      order.push("database");
      throw new Error("close failed");
    });
    lifecycle.registerCleanup(async () => {
      await Promise.resolve();
      order.push("redis");
    });
    const flush = vi.fn(async () => {
      order.push("flush");
    });
    await Promise.all([lifecycle.shutdown(flush), lifecycle.shutdown(flush)]);
    expect(order.at(-1)).toBe("flush");
    expect(order).toContain("redis");
    expect(flush).toHaveBeenCalledOnce();
  });
});
