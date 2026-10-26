# Worker instructions

This area owns background jobs and schedules. Use [README.md](README.md) for running and configuration.

- Enqueue through the typed `enqueueJob` API; register handlers and payload types in the dispatcher.
- Access the database through repositories, never the database client directly.

Read [jobs.md](jobs.md) when changing jobs, producers, schedules, or retry behavior.
For email delivery, also read [mail/templates.md](../mail/templates.md); for file jobs, read
[storage/uploads.md](../storage/uploads.md). Read [telemetry/instrumentation.md](../telemetry/instrumentation.md)
before changing queue tracing, error capture, or shutdown.
