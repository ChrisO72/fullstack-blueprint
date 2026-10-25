import { context, ROOT_CONTEXT, trace, TraceFlags } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import {
  InMemoryLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { log } from "~/telemetry/log.server";
import { safeJobId, sanitizeAttributes, sanitizeError } from "~/telemetry/sanitize.server";

const exporter = new InMemoryLogRecordExporter();
const provider = new LoggerProvider({ processors: [new SimpleLogRecordProcessor({ exporter })] });
logs.setGlobalLoggerProvider(provider);
afterAll(async () => {
  await provider.shutdown();
  logs.disable();
});
afterEach(() => {
  exporter.reset();
  vi.restoreAllMocks();
});

describe("OpenTelemetry logging", () => {
  it("uses the active span for trace and span correlation", async () => {
    const spanContext = {
      traceId: "12345678901234567890123456789012",
      spanId: "1234567890123456",
      traceFlags: TraceFlags.SAMPLED,
    };
    vi.spyOn(context, "active").mockReturnValue(trace.setSpanContext(ROOT_CONTEXT, spanContext));
    log.info("Job completed", { "job.name": "sendConfirmationEmail", "job.attempt": 1 });
    await provider.forceFlush();
    expect(exporter.getFinishedLogRecords()[0]).toMatchObject({
      body: "Job completed",
      severityText: "INFO",
      spanContext,
      attributes: { "job.name": "sendConfirmationEmail", "job.attempt": 1 },
    });
  });

  it("excludes unapproved fields and raw error messages and stacks", async () => {
    log.error(
      "Email delivery failed",
      new Error("private@example.com token=secret SELECT 'password'"),
      {
        "job.name": "sendConfirmationEmail",
        password: "secret",
        payload: "private",
        "db.query.text": "SELECT 'password'",
        "url.full": "https://host/token",
      },
    );
    await provider.forceFlush();
    const [record] = exporter.getFinishedLogRecords();
    expect(record.attributes).toEqual({
      "job.name": "sendConfirmationEmail",
      "error.type": "Error",
      "exception.message": "Operation failed",
    });
    expect(JSON.stringify(record)).not.toContain("private@example.com");
    expect(JSON.stringify(record)).not.toContain("SELECT");
  });

  it("drops both SQL conventions and hashes token-bearing job IDs", () => {
    expect(
      sanitizeAttributes({
        "db.statement": "SELECT secret",
        "db.query.text": "SELECT secret",
        "db.system": "postgresql",
        "http.request.header.authorization": "secret",
      }),
    ).toEqual({ "db.system": "postgresql" });
    expect(sanitizeError({ payload: "secret" })).toEqual({
      name: "Error",
      message: "Operation failed",
    });
    const id = "send-confirmation-email-secret-token";
    expect(safeJobId(id)).toBe(safeJobId(id));
    expect(safeJobId(id)).not.toContain("secret-token");
  });
});
