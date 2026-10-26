# Instrumentation and data policy

Read this when changing logging, tracing, metrics, redaction, or telemetry lifecycle behavior.
Configuration lives in [README.md](README.md); investigating existing events is covered in [debugging.md](debugging.md).

## Signals and data policy

Server and worker instrumentation is preloaded before dependencies and lives outside HMR.
PostgreSQL, Redis, HTTP, and fetch use Sentry's SDK integrations. React Router owns route-level
tracing, including loaders, actions, middleware, and streaming error reporting.

Queues carry Sentry trace context in BullMQ metadata. Legacy W3C-only metadata, invalid JSON,
invalid trace headers, or `omitContext` starts a new consumer trace without dropping the job.
Each attempt uses its own scope. Retries preserve the original error and application behavior.

Use `log.info`/`log.warn` from `~/telemetry/log.server` for server/worker structured logs.
Use `log.error(message, error, fields)` at the boundary that handles a failure; it captures an
exception as well as a log. A helper that rethrows should add context and let its caller capture.
Browser code uses `@sentry/react-router` directly. Avoid raw payloads in messages or attributes.

We retain scrubbed messages, exception chains, stack frames, and source locations. SDK collection
of cookies, headers, bodies, database parameters, queue payloads, user info, and local variables is
disabled. Outgoing hooks also scrub credential patterns, email addresses, and sensitive URLs;
only approved scalar attributes survive. SQL text is omitted from spans. This is not a guarantee
that arbitrary secrets hidden in free-form text can be recognized: never deliberately log them.
Replay masks all text/inputs, blocks media, and excludes request/response bodies.
If a page visits a URL needing redaction (including query strings, fragments, and token paths),
that replay segment and subsequent segments until a full page reload are dropped because the SDK's
compressed DOM metadata cannot be safely rewritten by its hooks. Error and trace reporting continues.

Trace and ordinary replay sample rates default to 1 in development and 0.2 when
`NODE_ENV=production`; error-triggered replay sampling defaults to 1 in both. Explicit
`SENTRY_*_SAMPLE_RATE` values override these defaults, including 0. `SENTRY_ENVIRONMENT` labels
events without changing sampling. Error events retain full sampling subject to existing filters
and provider limits. Application SDK initialization is disabled during tests. Request/job metrics are:

- `http.server.requests`: counter by method, matched route, status.
- `http.server.request.duration`: distribution in seconds with the same attributes.
- `job.attempts`: counter by job name and outcome.
- `job.duration`: distribution in seconds with the same attributes.

## Web requests

Sentry initializes before server imports. React Router traces request handlers, loaders, actions,
and middleware. Request counts and durations use matched route patterns; durations end when the
handler returns, rather than when response streaming finishes. Error reporting filters aborts and
expected responses below 500, and retains late streaming failures.

The browser SDK starts before hydration and connects navigation/fetch traces to server traces.
Only the public DSN, release, environment, origin, and sampling settings reach the page. API tokens
remain server-side.

## Worker jobs and mail

`enqueueJob` passes trace context through BullMQ's `telemetry.metadata`, without changing job payloads.
Errors are captured at the dispatcher boundary and rethrown unchanged for retries. Mail transport
failures add a warning inside the active span without capturing the exception twice. Job IDs are
hashed for telemetry; payloads, recipients, email bodies, and tokens are never logged. Attempt
counts and durations use bounded labels.

## Shutdown

Register shared resource cleanup through [runtime/lifecycle.server.ts](../runtime/lifecycle.server.ts).
[shutdown.server.ts](shutdown.server.ts) closes those resources before flushing Sentry.
The web development adapter in [web/vite.ts](../web/vite.ts) drains Vite first.

The [process controller](../runtime/process.server.ts) drains production HTTP requests or worker jobs on SIGINT/SIGTERM,
closes shared resources, and flushes Sentry within a 25-second deadline. Fatal process errors use
the same shutdown path and exit nonzero. Preserve shared state across preloaded and bundled code.
