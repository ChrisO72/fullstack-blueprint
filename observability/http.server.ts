import {
  metrics,
  propagation,
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import type { ServerInstrumentation } from "react-router";
import { log } from "./log.server";
import { sanitizeError } from "./sanitize.server";

function instruments() {
  const meter = metrics.getMeter("blueprint.web");
  return {
    requests: meter.createCounter("http.server.requests", { unit: "{request}" }),
    duration: meter.createHistogram("http.server.request.duration", { unit: "s" }),
  };
}
const shared = globalThis as typeof globalThis & {
  __blueprintHttpMetrics?: ReturnType<typeof instruments>;
};
const { requests, duration } = (shared.__blueprintHttpMetrics ??= instruments());
const tracer = trace.getTracer("blueprint.web");
const methods = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "CONNECT",
  "OPTIONS",
  "TRACE",
  "PATCH",
]);

export const instrumentations: ServerInstrumentation[] = [
  {
    handler({ instrument }) {
      instrument({
        async request(handleRequest, { request }) {
          const method = methods.has(request.method) ? request.method : "_OTHER";
          const parent = propagation.extract(ROOT_CONTEXT, {
            traceparent: request.headers.get("traceparent") ?? "",
            tracestate: request.headers.get("tracestate") ?? "",
          });
          await tracer.startActiveSpan(method, { kind: SpanKind.SERVER }, parent, async (span) => {
            const start = performance.now();
            let route = "unmatched";
            let status = 500;
            let outcome = "success";
            try {
              const result = await handleRequest();
              route = result.meta?.pattern ?? "unmatched";
              status = result.statusCode;
              if (result.status === "error") {
                outcome = "error";
                span.recordException(sanitizeError(result.error));
              }
            } catch (error) {
              outcome = "error";
              span.recordException(sanitizeError(error));
              throw error;
            } finally {
              if (status >= 500) outcome = "error";
              const attributes = {
                "http.request.method": method,
                "http.route": route,
                "http.response.status_code": status,
              };
              span.updateName(`${method} ${route}`);
              span.setAttributes(attributes);
              if (outcome === "error") span.setStatus({ code: SpanStatusCode.ERROR });
              requests.add(1, attributes);
              duration.record((performance.now() - start) / 1000, attributes);
              log.info("Request completed", { ...attributes, outcome });
              span.end();
            }
          });
        },
      });
    },
  },
];
