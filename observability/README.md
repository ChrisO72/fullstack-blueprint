# Observability

The shared server logger in [logger.server.ts](logger.server.ts) writes to standard output.
Development uses `pino-pretty` for readable, colorized terminal output. Production emits one JSON
object per line; collect the separate `start:web` and `start:worker` streams with the process
supervisor, container runtime, or hosting platform. The application does not create log files or
send logs to an external service.

## Event contract

Every record includes:

- `timestamp` — ISO timestamp
- `level` — `debug`, `info`, `warn`, `error`, or `fatal`
- `service` — emitting service such as `web`, `worker`, or `queue`
- `event` — stable dot-separated event name

Web requests add `requestId`. Worker processing adds `jobId`, `jobName`, and `attempt`. Completion
events include safe status, duration, queue-wait, or retry metadata where relevant.

Set `LOG_LEVEL_THRESHOLD` to `debug`, `info`, `warn`, `error`, `fatal`, or `silent`; the default is
`info`. Records below the configured threshold are suppressed.

## Logging policy

The logger recursively redacts known tokens, passwords, authorization and cookie values, API keys,
email addresses and content, request bodies, job payloads, URL credentials, and sensitive query
parameters. Error records contain sanitized type, message, stack, and cause metadata.

Log only identifiers and operational metadata needed to diagnose an event. Never pass whole
requests, provider responses, job payloads, email content, or authentication values to the logger.
