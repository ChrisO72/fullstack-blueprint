import "dotenv/config";
import { randomUUID } from "node:crypto";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  ConsoleLogRecordExporter,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { SanitizingSpanExporter } from "./exporters.server";
import { runtime } from "./runtime.server";

if (
  process.env.NODE_ENV !== "test" &&
  process.env.OTEL_SDK_DISABLED !== "true" &&
  !runtime.shutdownSdk
) {
  const remote = Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
  process.env.OTEL_PROPAGATORS ??= "tracecontext";
  process.env.OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE ??= "cumulative";
  if (!remote) process.env.OTEL_METRICS_EXPORTER = "none";
  const sdk = new NodeSDK({
    autoDetectResources: false,
    resource: defaultResource().merge(
      resourceFromAttributes({
        "service.name":
          process.env.OTEL_SERVICE_NAME ?? (process.argv[1]?.includes("worker") ? "worker" : "web"),
        "service.namespace": "blueprint",
        "service.instance.id": randomUUID(),
        "deployment.environment.name": process.env.NODE_ENV ?? "development",
      }),
    ),
    spanProcessors: remote
      ? [new BatchSpanProcessor(new SanitizingSpanExporter(new OTLPTraceExporter()))]
      : [],
    logRecordProcessors: [
      remote
        ? new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })
        : new SimpleLogRecordProcessor({ exporter: new ConsoleLogRecordExporter() }),
    ],
    instrumentations: remote
      ? [
          new PgInstrumentation({ enhancedDatabaseReporting: false, requireParentSpan: true }),
          new IORedisInstrumentation({
            requireParentSpan: true,
            dbStatementSerializer: (command) => command,
          }),
          new HttpInstrumentation({ disableIncomingRequestInstrumentation: true }),
          new UndiciInstrumentation(),
        ]
      : [],
  });
  sdk.start();
  runtime.shutdownSdk = () => sdk.shutdown();
}
