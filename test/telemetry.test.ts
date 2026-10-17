import { SpanKind, SpanStatusCode, TraceFlags } from "@opentelemetry/api";
import { defaultResource } from "@opentelemetry/resources";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { describe, expect, it } from "vitest";
import { parseTraceMetadata } from "~/observability/queue.server";
import { sanitizeSpan } from "~/observability/exporters.server";

describe("queue trace metadata", () => {
  it("accepts only W3C string fields", () => {
    expect(
      parseTraceMetadata(
        JSON.stringify({
          traceparent: "00-123-456-01",
          tracestate: "vendor=value",
          baggage: "private",
          payload: "secret",
        }),
      ),
    ).toEqual({ traceparent: "00-123-456-01", tracestate: "vendor=value" });
  });
  it.each([
    undefined,
    "{",
    "null",
    "[]",
    '"string"',
    '{"traceparent":123}',
    '{"tracestate":{}}',
    "x".repeat(4097),
  ])("ignores missing or malformed metadata: %s", (metadata) => {
    expect(parseTraceMetadata(metadata)).toEqual({});
  });
});

describe("span export sanitization", () => {
  it("preserves SDK getters and correlation while removing query/error data", () => {
    const span: ReadableSpan = {
      name: "SELECT private",
      kind: SpanKind.CLIENT,
      spanContext: () => ({
        traceId: "12345678901234567890123456789012",
        spanId: "1234567890123456",
        traceFlags: TraceFlags.SAMPLED,
      }),
      startTime: [0, 0],
      endTime: [1, 0],
      get duration(): [number, number] {
        return [1, 0];
      },
      get ended() {
        return true;
      },
      attributes: {
        "db.system": "postgresql",
        "db.operation": "SELECT",
        "db.statement": "SELECT secret",
        "db.query.text": "SELECT secret",
        "url.full": "https://user:pass@host/private?token=secret",
      },
      status: { code: SpanStatusCode.ERROR, message: "secret" },
      events: [
        {
          name: "exception",
          time: [0, 1],
          attributes: { "exception.message": "secret", "exception.stacktrace": "secret" },
        },
      ],
      links: [],
      resource: defaultResource(),
      instrumentationScope: { name: "test" },
      droppedAttributesCount: 0,
      droppedEventsCount: 0,
      droppedLinksCount: 0,
    };
    const result = sanitizeSpan(span);
    expect(result.spanContext()).toEqual(span.spanContext());
    expect(result.duration).toEqual([1, 0]);
    expect(result.ended).toBe(true);
    expect(result.name).toBe("SELECT");
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(span.attributes["db.statement"]).toBe("SELECT secret");
  });
});
