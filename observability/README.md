# Observability

`make dev` starts the local stack. Grafana is at <http://localhost:3000>, with `admin` / `admin`
by default (`GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` in `.env` configure the initial login).
Its named volume preserves login settings. Web and worker send OTLP/HTTP protobuf to the internal
Collector; no telemetry backend ports are published.

```text
web / worker -- OTLP HTTP :4318 --> otelcol
                                    |-- logs --> Loki /otlp/v1/logs
                                    |-- cumulative metrics --> Prometheus /api/v1/otlp/v1/metrics
                                    `-- traces --> Tempo /v1/traces
Grafana Explore ------------------> Loki / Prometheus / Tempo
```

## Local storage and configuration

Images are pinned in [compose.yml](../compose.yml): Collector 0.162.0, Loki 3.7.8, Prometheus 3.15.0,
Tempo 3.1.0, and Grafana 13.2.4. Configuration lives in [config/](config/). Prometheus, Loki, and
Tempo retain approximately three days of data; cleanup is asynchronous. Named volumes persist
metrics, Loki chunks/index/compactor markers, Tempo blocks/WAL, and Grafana configuration.
`make down` keeps them; the existing `npm run docker:wipe` deletes all Compose data.

The Collector uses `memory_limiter` before `batch`, with bounded in-memory exporter queues/retries.
There is no durable Collector queue: telemetry can be lost on failure/restart. This is a minimal
local environment, without dashboards, alerts, metrics generation, Kafka, or infrastructure exporters.
Prometheus keeps its self-scrape and receives cumulative OTLP metrics; no delta conversion is needed.
Loki indexes only service name, namespace, and environment. Trace/span IDs, hashed job IDs, and
process instance IDs remain structured metadata. Tempo runs monolithically with local storage.

Configuration changes take effect after stopping and rerunning `make dev`. Reference projects in
the parent Workshop directory are not used or modified by this stack.

## Application initialization

[register.server.ts](register.server.ts) is preloaded once before application imports. The ESM
instrumentation hook patches supported dependencies; Vite externalizes the APIs and instrumented
dependencies. `--conditions=development` prevents React Router’s dev CLI from relaunching without
the preload flags. SDK setup stays outside HMR; Compose restarts both app processes when files in
this directory change.

```sh
node --experimental-loader=@opentelemetry/instrumentation/hook.mjs \
  --import tsx --import ./observability/register.server.ts worker/index.ts
```

The stable SDK packages use 2.12.0 and the experimental logging/Node/exporter packages use 0.223.0.
The logs SDK remains experimental and is isolated behind [log.server.ts](log.server.ts).
The bootstrap explicitly constructs sanitizing trace and log processors; exporter endpoints and
metric readers use standard OpenTelemetry environment configuration. Compose sets service names,
cumulative temporality, five-second metric exports, and W3C trace-context propagation. Resource
attributes include the `blueprint` namespace, environment, and a new UUID per process.

Without `OTEL_EXPORTER_OTLP_ENDPOINT`, logs use OpenTelemetry’s console exporter, and remote metrics
and traces are disabled. `NODE_ENV=test` or `OTEL_SDK_DISABLED=true` skips SDK initialization.
Instrumentation covers PostgreSQL, ioredis, outgoing Node HTTP, and fetch/Undici. Incoming HTTP
auto-spans are disabled because React Router owns the server span. PostgreSQL/Redis require a
parent span. SDK export failures are diagnostic failures and do not change job/request outcomes.

## Logging and data policy

Use ordinary messages and bounded attributes inside the active span:

```typescript
import { log } from "~/observability/log.server";

log.info("Upload completed", { fileId: file.id });
log.error("Upload failed", error, { fileId: file.id });
```

Trace/span IDs are attached by OpenTelemetry, without a custom context store or request-ID header.
The helper only exports allowlisted attributes. Do not pass payloads, credentials, headers, mail
content, or raw URLs. Error messages and stacks are deliberately omitted because drivers and
providers can include SQL, payloads, and tokens. Exception records retain a safe error type and
a generic message. Span export drops `db.statement`, `db.query.text`, URL components, unapproved
attributes, event details, and status descriptions. Redis spans retain only the command name.
Existing job IDs can contain authentication tokens, so telemetry uses a stable SHA-256-derived ID.

React Router instrumentation inspects `status`, `error`, and `statusCode`, renames spans with the
matched route pattern, and records counts/durations in seconds. It also preserves SSR streaming
error logs; handler duration ends at response creation, not the end of streaming.

Queue enqueueing creates a producer span. W3C context is injected into `telemetry.metadata`, then
extracted into a consumer span for each processing attempt. Only string `traceparent` and
`tracestate` fields are accepted; malformed/old metadata starts a new trace. `omitContext` is
respected. Attempts emit completion/failure logs before ending their span; errors are rethrown
unchanged so BullMQ retry behavior stays intact.

Web dev shutdown drains Vite’s HTTP server, then shared resources, then the SDK. Worker shutdown
drains BullMQ first. Both have a 25-second deadline within the 30-second Compose grace period.

## Grafana Explore

Select the provisioned data source and use a recent time range. Data appears as the app is used;
no sample traffic or runtime ingestion checks are part of the implementation gate.

Loki (LogQL):

```logql
{service_name="web"}
{service_name="worker"} | severity_text = "ERROR"
{service_name="web"} | trace_id = "<trace ID>"
```

Expand a log’s details and follow `TraceID` to Tempo. From a Tempo span, the logs link filters
Loki’s `trace_id` structured metadata within the span’s time window; no JSON/message parsing is
needed. Resource `service.name` is mapped to Loki’s `service_name` label.

Prometheus (PromQL):

```promql
sum by (http_route) (rate(http_server_requests_total{service_name="web"}[5m]))
histogram_quantile(0.95, sum by (le, http_route) (rate(http_server_request_duration_seconds_bucket{service_name="web"}[5m])))
sum by (job_name, outcome) (rate(job_attempts_total{service_name="worker"}[5m]))
```

Tempo (TraceQL):

```traceql
{ resource.service.name = "web" }
{ resource.service.name = "worker" && status = error }
```

## Upstream patterns

- [OpenTelemetry Node SDK and initialization](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [React Router instrumentation metadata](https://reactrouter.com/how-to/instrumentation)
- [OTLP HTTP exporter base URLs](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.162.0/exporter/otlphttpexporter/README.md)
- [Loki OTLP structured metadata](https://grafana.com/docs/loki/latest/send-data/otel/)
- [Prometheus OpenTelemetry ingestion](https://prometheus.io/docs/guides/opentelemetry/)
- [Tempo 3 monolithic example](https://github.com/grafana/tempo/blob/v3.1.0/example/docker-compose/single-binary/tempo.yaml)
- [Tempo 3 retention configuration](https://github.com/grafana/intro-to-mltp/blob/main/tempo/tempo.yaml)
- [Grafana Loki derived fields](https://grafana.com/docs/grafana/latest/datasources/loki/configure/)
- [Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/)
