import type { ExportResult } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { sanitizeAttributes, sanitizeText } from "./sanitize.server";

export function sanitizeSpan(span: ReadableSpan): ReadableSpan {
  const attributes = sanitizeAttributes(span.attributes);
  const database = span.attributes["db.system"] ?? span.attributes["db.system.name"];
  return {
    kind: span.kind,
    parentSpanContext: span.parentSpanContext,
    startTime: span.startTime,
    endTime: span.endTime,
    duration: span.duration,
    ended: span.ended,
    resource: span.resource,
    instrumentationScope: span.instrumentationScope,
    droppedAttributesCount: span.droppedAttributesCount,
    droppedEventsCount: span.droppedEventsCount,
    droppedLinksCount: span.droppedLinksCount,
    spanContext: () => span.spanContext(),
    name: database
      ? String(attributes["db.operation.name"] ?? attributes["db.operation"] ?? "database")
      : sanitizeText(span.name),
    attributes,
    status: { code: span.status.code },
    events: span.events.map((event) => ({
      ...event,
      name: event.name === "exception" ? "exception" : "event",
      attributes: event.name === "exception" ? { "exception.message": "Operation failed" } : {},
    })),
    links: span.links.map((link) => ({ ...link, attributes: {} })),
  };
}

export class SanitizingSpanExporter implements SpanExporter {
  constructor(private readonly exporter: SpanExporter) {}
  export(spans: ReadableSpan[], callback: (result: ExportResult) => void) {
    this.exporter.export(spans.map(sanitizeSpan), callback);
  }
  shutdown() {
    return this.exporter.shutdown();
  }
  async forceFlush() {
    await this.exporter.forceFlush?.();
  }
}
